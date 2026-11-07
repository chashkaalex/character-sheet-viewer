import { ParseGDocToRawLines } from '../../server/services/gdoc_utilities';

describe('P1.1: ParseGDocToRawLines Soft-Return Guard', () => {
  const originalDocumentApp = (global as any).DocumentApp;
  const originalDocs = (global as any).Docs;

  afterEach(() => {
    (global as any).DocumentApp = originalDocumentApp;
    (global as any).Docs = originalDocs;
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

