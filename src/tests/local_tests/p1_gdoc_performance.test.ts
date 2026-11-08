import {
  ParseGDocToRawLines,
  UpdateProperty,
  UpdateSection,
  RemoveLineFromSection,
  ClearSection,
  ReadDoc,
  MutateDoc,
  ResetDocSession
} from '../../server/services/gdoc_utilities';
import { CharacterSession } from '../../server/character/character_session';
import { GetCharacterByDocId, RemoveAllStatusesFromCharacter } from '../../server/character/character_manipulation';

describe('P1.1: ParseGDocToRawLines Soft-Return Guard', () => {
  const originalDocumentApp = (global as any).DocumentApp;
  const originalDocs = (global as any).Docs;

  afterEach(() => {
    (global as any).DocumentApp = originalDocumentApp;
    (global as any).Docs = originalDocs;
    if (typeof ResetDocSession === 'function') {
      ResetDocSession();
    }
    if (CharacterSession && typeof CharacterSession.reset === 'function') {
      CharacterSession.reset();
    }
  });

  test('skips Docs.Documents.batchUpdate when document has no soft returns (\\u000b)', () => {
    const batchUpdateMock = jest.fn();
    const saveAndCloseMock = jest.fn();

    const mockParagraphs = [
      {
        getText: () => 'Mortfinn aep Dessantein',
        getType: () => 'PARAGRAPH'
      },
      {
        getText: () => '(Elf Rogue 5)',
        getType: () => 'PARAGRAPH'
      }
    ];

    const openByIdMock = jest.fn(() => ({
      getBody: () => ({
        getText: () => 'Mortfinn aep Dessantein\n(Elf Rogue 5)',
        getParagraphs: () => mockParagraphs
      }),
      saveAndClose: saveAndCloseMock
    }));

    (global as any).DocumentApp = {
      openById: openByIdMock,
      ElementType: { LIST_ITEM: 'LIST_ITEM', PARAGRAPH: 'PARAGRAPH' }
    };
    (global as any).Docs = {
      Documents: {
        batchUpdate: batchUpdateMock
      }
    };

    const lines = ParseGDocToRawLines('clean-doc-id');

    expect(lines).toEqual(['Mortfinn aep Dessantein', '(Elf Rogue 5)']);
    expect(openByIdMock).toHaveBeenCalledTimes(1);
    expect(batchUpdateMock).not.toHaveBeenCalled();
    expect(saveAndCloseMock).not.toHaveBeenCalled();
  });

  test('executes Docs.Documents.batchUpdate and re-opens document only when soft return (\\u000b) is present', () => {
    const batchUpdateMock = jest.fn();
    const saveAndCloseMock = jest.fn();

    let openCount = 0;
    const openByIdMock = jest.fn(() => {
      openCount++;
      if (openCount === 1) {
        return {
          getBody: () => ({
            getText: () => 'LineA\u000bLineB',
            getParagraphs: () => [
              { getText: () => 'LineA\u000bLineB', getType: () => 'PARAGRAPH' }
            ]
          }),
          saveAndClose: saveAndCloseMock
        };
      }
      return {
        getBody: () => ({
          getText: () => 'LineA\nLineB',
          getParagraphs: () => [
            { getText: () => 'LineA', getType: () => 'PARAGRAPH' },
            { getText: () => 'LineB', getType: () => 'PARAGRAPH' }
          ]
        }),
        saveAndClose: saveAndCloseMock
      };
    });

    (global as any).DocumentApp = {
      openById: openByIdMock,
      ElementType: { LIST_ITEM: 'LIST_ITEM', PARAGRAPH: 'PARAGRAPH' }
    };
    (global as any).Docs = {
      Documents: {
        batchUpdate: batchUpdateMock
      }
    };

    const lines = ParseGDocToRawLines('soft-return-doc-id');

    expect(lines).toEqual(['LineA', 'LineB']);
    expect(saveAndCloseMock).toHaveBeenCalledTimes(1);
    expect(batchUpdateMock).toHaveBeenCalledTimes(1);
    expect(openByIdMock).toHaveBeenCalledTimes(2);
  });
});

describe('P1.2: ReadDoc / MutateDoc Singleton & CharacterSession Reset', () => {
  const originalDocumentApp = (global as any).DocumentApp;
  const originalDocs = (global as any).Docs;

  afterEach(() => {
    (global as any).DocumentApp = originalDocumentApp;
    (global as any).Docs = originalDocs;
    if (typeof ResetDocSession === 'function') {
      ResetDocSession();
    }
    if (CharacterSession && typeof CharacterSession.reset === 'function') {
      CharacterSession.reset();
    }
  });

  function createInMemoryGDoc(initialLines: string[]) {
    const paragraphs = initialLines.map(line => {
      let text = line;
      const p: any = {
        getText: () => text,
        setText: (newText: string) => {
          text = newText;
        },
        getType: () => 'PARAGRAPH',
        removeFromParent: () => {
          const idx = paragraphs.indexOf(p);
          if (idx !== -1) paragraphs.splice(idx, 1);
        },
        editAsText: () => ({
          getText: () => text,
          setText: (newText: string) => {
            text = newText;
          },
          getAttributes: () => ({}),
          getForegroundColor: () => '#000000',
          replaceText: (pattern: string, replacement: string) => {
            text = text.replace(pattern, replacement);
          },
          setAttributes: () => { },
          setForegroundColor: () => { },
          setStrikethrough: () => { }
        })
      };
      return p;
    });

    const doc = {
      getBody: () => ({
        getText: () => paragraphs.map(p => p.getText()).join('\n'),
        getParagraphs: () => paragraphs,
        insertParagraph: (index: number, newLine: string) => {
          let text = newLine;
          const p: any = {
            getText: () => text,
            setText: (t: string) => {
              text = t;
            },
            getType: () => 'PARAGRAPH',
            removeFromParent: () => {
              const idx = paragraphs.indexOf(p);
              if (idx !== -1) paragraphs.splice(idx, 1);
            }
          };
          paragraphs.splice(index, 0, p);
          return p;
        }
      }),
      saveAndClose: jest.fn()
    };

    return { doc, paragraphs };
  }

  test('reuses a single DocumentApp.openById instance across multiple ReadDoc and MutateDoc operations', () => {
    const { doc } = createInMemoryGDoc([
      'Mortfinn aep Dessantein',
      '(Elf Rogue 5)',
      'Hp: 24/24',
      'Statuses:',
      'Bless: 1 rounds/10 rounds',
      'Haste: 2 rounds/5 rounds',
      'Skills:'
    ]);

    const openByIdMock = jest.fn(() => doc);
    (global as any).DocumentApp = {
      openById: openByIdMock,
      ElementType: { LIST_ITEM: 'LIST_ITEM', PARAGRAPH: 'PARAGRAPH' }
    };

    // 1. Initial read
    const initialLines = ParseGDocToRawLines('morty-doc-id');
    expect(initialLines).toContain('Hp: 24/24');

    // 2. Multiple mutations on the same docId
    expect(UpdateProperty('morty-doc-id', 'Hp', 18).success).toBe(true);
    expect(RemoveLineFromSection('morty-doc-id', 'Statuses', 'Bless').success).toBe(true);
    expect(UpdateSection('morty-doc-id', 'Statuses', 'Shield of Faith: 1 rounds/10 rounds').success).toBe(true);

    // 3. Final read after mutations
    const finalLines = ParseGDocToRawLines('morty-doc-id');
    expect(finalLines).toContain('Hp: 18/24');
    expect(finalLines).not.toContain('Bless: 1 rounds/10 rounds');
    expect(finalLines).toContain('Shield of Faith: 1 rounds/10 rounds');

    // DocumentApp.openById should only have been called ONCE for the entire flow
    expect(openByIdMock).toHaveBeenCalledTimes(1);
  });

  test('MutateDoc automatically calls CharacterSession.reset(docId), while ReadDoc preserves CharacterSession', () => {
    const { doc } = createInMemoryGDoc([
      'Mortfinn aep Dessantein',
      'Statuses:',
      'Skills:'
    ]);
    const openByIdMock = jest.fn(() => doc);
    (global as any).DocumentApp = {
      openById: openByIdMock,
      ElementType: { LIST_ITEM: 'LIST_ITEM', PARAGRAPH: 'PARAGRAPH' }
    };

    const resetSpy = jest.spyOn(CharacterSession, 'reset');

    ReadDoc('morty-doc-id', d => d.getBody().getText());
    expect(resetSpy).not.toHaveBeenCalled();

    MutateDoc('morty-doc-id', d => {
      d.getBody().insertParagraph(2, 'Cat\'s Grace: 1 rounds/10 rounds');
    });
    expect(resetSpy).toHaveBeenCalledWith('morty-doc-id');
    expect(openByIdMock).toHaveBeenCalledTimes(1);

    resetSpy.mockRestore();
  });

  test('GetCharacterByDocId returns cached Character until a mutation invalidates CharacterSession', () => {
    const path = require('path');
    const fs = require('fs');
    const sourceFile = path.join(__dirname, 'test_character_sheets', 'morty_test.txt');
    const tempFile = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_p1_2_morty.txt');
    if (!fs.existsSync(path.dirname(tempFile))) {
      fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    }
    fs.copyFileSync(sourceFile, tempFile);

    try {
      const char1 = GetCharacterByDocId(tempFile);
      const char2 = GetCharacterByDocId(tempFile);
      // Without mutation, the exact same Character instance should be returned
      expect(char2).toBe(char1);

      // Mutating through CharacterSession.reset (or adapter mutation) invalidates the cache
      CharacterSession.reset(tempFile);
      const char3 = GetCharacterByDocId(tempFile);
      expect(char3).not.toBe(char1);
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });

  test('ClearSection removes all status lines in the Statuses section in a single pass', () => {
    const { doc } = createInMemoryGDoc([
      'Mortfinn aep Dessantein',
      '(Elf Rogue 5)',
      'Statuses:',
      'Bless: 1 rounds/10 rounds',
      'Haste: 2 rounds/5 rounds',
      'Custom Note Status: 3 rounds/3 rounds',
      'Skills:',
      'Hide: 10'
    ]);

    const openByIdMock = jest.fn(() => doc);
    (global as any).DocumentApp = {
      openById: openByIdMock,
      ElementType: { LIST_ITEM: 'LIST_ITEM', PARAGRAPH: 'PARAGRAPH' }
    };

    const result = ClearSection('morty-doc-id', 'Statuses');
    expect(result.success).toBe(true);

    const remainingLines = ParseGDocToRawLines('morty-doc-id');
    expect(remainingLines).toEqual([
      'Mortfinn aep Dessantein',
      '(Elf Rogue 5)',
      'Statuses:',
      'Skills:',
      'Hide: 10'
    ]);
    expect(openByIdMock).toHaveBeenCalledTimes(1);
  });

  test('RemoveAllStatusesFromCharacter clears all lines in Statuses section directly via adapter.RemoveAllStatuses', () => {
    const path = require('path');
    const fs = require('fs');
    const { adapter } = require('../../server/character/adapter_selector');
    const sourceFile = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');
    const tempFile = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_p1_2_bess_clear.txt');
    if (!fs.existsSync(path.dirname(tempFile))) {
      fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    }
    fs.copyFileSync(sourceFile, tempFile);

    const removeAllSpy = jest.spyOn(adapter, 'RemoveAllStatuses');
    const removeSingleSpy = jest.spyOn(adapter, 'RemoveStatus');

    try {
      const rep = RemoveAllStatusesFromCharacter(tempFile);
      expect((rep as any).statuses).toHaveLength(0);
      expect(removeAllSpy).toHaveBeenCalledTimes(1);
      expect(removeSingleSpy).not.toHaveBeenCalled();
    } finally {
      removeAllSpy.mockRestore();
      removeSingleSpy.mockRestore();
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });
});

