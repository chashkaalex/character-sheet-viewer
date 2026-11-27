import * as fs from 'fs';
import * as path from 'path';
import { showPartyModal, refreshCharacterData } from '../../client/ts/dashboard_script';
import { setCharacterRep } from '../../client/ts/state';
import { enterCombat, endCombat, renderRoundActionsUI } from '../../client/ts/round_actions';

describe('Party Button, United Init Display, and Party Modal Rolz Room Link', () => {
  const htmlPath = path.join(__dirname, '../../client/html/main.html');

  test('1. #partyButton uses primary hpbutton class (like Cure) in main.html', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const partyBtnMatch = html.match(/<button[^>]*id="partyButton"[^>]*>/);
    expect(partyBtnMatch).not.toBeNull();
    const btnTag = partyBtnMatch ? partyBtnMatch[0] : '';
    expect(btnTag).toContain('class="hpbutton"');
    expect(btnTag).not.toContain('passed-button');
  });

  test('2. main.html unites Init Bonus and Current Init into a single Init: (+bonus)X item', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).not.toContain('<label>Init Bonus:</label>');
    expect(html).not.toContain('<label>Current Init:</label>');
    expect(html).toContain('<label>Init:</label>');
    expect(html).toContain('id="initBonusSign"');
    expect(html).toContain('id="initBonus"');
    expect(html).toContain('id="currentInit"');
  });

  test('3. United Init displays (+8)- when out of combat, (+8)19 when in combat, and (-1)- when initBonus is negative', () => {
    const docId = 'test_init_doc';
    endCombat(docId);

    const elements: Record<string, any> = {
      initBonusSign: { textContent: '+', innerHTML: '+' },
      initBonus: { innerHTML: '-', dataset: {}, style: {}, removeAttribute: () => {}, addEventListener: () => {} },
      currentInit: {
        textContent: '-',
        title: '',
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn()
        }
      },
      acValue: { innerHTML: '-', dataset: {}, style: {}, removeAttribute: () => {}, addEventListener: () => {} }
    };

    const prevDoc = (global as any).document;
    const prevGoogle = (global as any).google;
    (global as any).document = {
      getElementById: (id: string) => elements[id] || null
    };
    (global as any).google = {
      script: {
        run: {
          withSuccessHandler: () => ({
            withFailureHandler: () => ({
              GetCharacterRepByDocId: () => {}
            })
          })
        }
      }
    };

    try {
      setCharacterRep({
        docId,
        initBonus: { bonus: 8, string: '8 = 4[Dex] + 4[Improved Initiative]', rolzRollMessage: '1d20+8' },
        ac: { bonus: 20, string: '20' }
      } as any);

      refreshCharacterData();
      renderRoundActionsUI(docId);

      let combinedText = `(${elements.initBonusSign.textContent}${elements.initBonus.innerHTML})${elements.currentInit.textContent}`;
      expect(combinedText).toBe('(+8)-');

      // Enter combat with initiative 19
      enterCombat(docId, 19);
      combinedText = `(${elements.initBonusSign.textContent}${elements.initBonus.innerHTML})${elements.currentInit.textContent}`;
      expect(combinedText).toBe('(+8)19');

      // Enter combat without numeric initiative -> still '-'
      enterCombat(docId, null);
      combinedText = `(${elements.initBonusSign.textContent}${elements.initBonus.innerHTML})${elements.currentInit.textContent}`;
      expect(combinedText).toBe('(+8)-');

      // Negative initiative bonus -> (-1)-
      endCombat(docId);
      setCharacterRep({
        docId,
        initBonus: { bonus: -1, string: '-1 = -1[Dex]', rolzRollMessage: '1d20-1' },
        ac: { bonus: 9, string: '9' }
      } as any);
      refreshCharacterData();
      renderRoundActionsUI(docId);
      combinedText = `(${elements.initBonusSign.textContent}${elements.initBonus.innerHTML})${elements.currentInit.textContent}`;
      expect(combinedText).toBe('(-1)-');
    } finally {
      endCombat(docId);
      (global as any).document = prevDoc;
      (global as any).google = prevGoogle;
    }
  });

  test('4. showPartyModal renders a direct link to the Rolz Dice Room from rolzRoomId', () => {
    const createdItems: any[] = [];
    const elements: Record<string, any> = {
      partyModalTitle: { innerHTML: '', innerText: '' },
      partyModalRolzLink: { innerHTML: '', style: { display: 'none' } },
      partyModalList: {
        innerHTML: '',
        appendChild: (el: any) => createdItems.push(el)
      },
      partyModal: { style: { display: 'none' } }
    };

    const prevDoc = (global as any).document;
    (global as any).document = {
      getElementById: (id: string) => elements[id] || null,
      createElement: (tag: string) => ({ tag, style: {}, innerHTML: '', innerText: '' })
    };

    try {
      setCharacterRep({
        name: 'Morty',
        partyName: 'TeamD20',
        partiesDocId: '1_0-gwyHfxLFSjDMXTiBu-B9WeRmoVwGEw2ggK4GoucU',
        partyMembers: ['Morty', 'Naethan', 'Thror'],
        rolzRoomId: 'TeamD20'
      } as any);

      showPartyModal();

      expect(elements.partyModal.style.display).toBe('block');
      expect(elements.partyModalRolzLink.innerHTML).toContain('https://rolz.org/dr?room=TeamD20');
      expect(elements.partyModalRolzLink.innerHTML).toContain('target="_blank"');
    } finally {
      (global as any).document = prevDoc;
    }
  });
});
