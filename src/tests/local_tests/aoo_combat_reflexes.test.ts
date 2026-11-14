import * as fs from 'fs';
import * as path from 'path';
import { Character } from '../../server/character/character';
import { getCharacterRep } from '../../server/character/character_rep';
import { setCharacterRep } from '../../client/ts/state';
import { enterCombat, endCombat } from '../../client/ts/round_actions';
import { updateAttacksOfOpportunityDisplay } from '../../client/ts/dashboard/combat';

describe('Attacks of Opportunity & Combat Reflexes', () => {
  test('Thror with Combat Reflexes and +4 Dex gets 5 AoOs in CharacterRep', () => {
    const filePath = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const char = new Character(lines, filePath);
    char.ParseCharacter();
    expect(char.parseErrors).toEqual([]);

    const rep = getCharacterRep(char);
    expect(rep.attacksOfOpportunity).toBeDefined();
    expect(rep.attacksOfOpportunity.currentScore).toBe(5);
  });

  test('character without Combat Reflexes gets 1 AoO regardless of positive Dex', () => {
    const lines = [
      'Agile Rogue',
      '(Human Rogue 1)',
      'BAb: +0; Grapple: +0; Hp: 6/6; Speed: 30 ft.',
      'Attack: +3 Dagger (1d4/19-20).',
      'AC: 13 (+3 Dex), Touch 13, Flat-footed 10.',
      'Saves: Fort +0; Ref +5; Will +0.',
      'Str: 10 (+0)',
      'Dex: 16 (+3)',
      'Con: 10 (+0)',
      'Int: 10 (+0)',
      'Wis: 10 (+0)',
      'Cha: 10 (+0)',
      'Statuses:',
      'Feats:',
      'Special Abilities:',
      'Racial Traits:',
      'Bonus Abilities:',
      'Skills:',
      'Battle Gear:',
      'Dagger,',
      'Possessions:',
      'Personal Information:'
    ];
    const char = new Character(lines);
    char.ParseCharacter();
    expect(char.parseErrors).toEqual([]);

    const rep = getCharacterRep(char);
    expect(rep.attacksOfOpportunity.currentScore).toBe(1);
  });

  test('Combat Reflexes with negative Dex modifier does not reduce AoOs below 1', () => {
    const lines = [
      'Clumsy Fighter',
      '(Human Fighter 1)',
      'BAb: +1; Grapple: +2; Hp: 10/10; Speed: 30 ft.',
      'Attack: +2 Longsword (1d8+1/19-20).',
      'AC: 9 (-1 Dex), Touch 9, Flat-footed 9.',
      'Saves: Fort +2; Ref -1; Will +0.',
      'Str: 12 (+1)',
      'Dex: 8 (-1)',
      'Con: 10 (+0)',
      'Int: 10 (+0)',
      'Wis: 10 (+0)',
      'Cha: 10 (+0)',
      'Statuses:',
      'Feats:',
      'Combat Reflexes,',
      'Special Abilities:',
      'Racial Traits:',
      'Bonus Abilities:',
      'Skills:',
      'Battle Gear:',
      'Longsword,',
      'Possessions:',
      'Personal Information:'
    ];
    const char = new Character(lines);
    char.ParseCharacter();
    expect(char.parseErrors).toEqual([]);

    const rep = getCharacterRep(char);
    expect(rep.attacksOfOpportunity.currentScore).toBe(1);
  });

  test('updateAttacksOfOpportunityDisplay renders 5/5 in combat for Thror', () => {
    const filePath = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const char = new Character(lines, filePath);
    char.ParseCharacter();
    const rep = getCharacterRep(char);
    rep.docId = 'thror_aoo_ui_test';
    setCharacterRep(rep);

    const aooEl: any = {
      id: 'attacksOfOpportunity',
      textContent: '',
      dataset: {},
      style: {},
      removeAttribute: jest.fn(),
      addEventListener: jest.fn()
    };
    (global as any).document = {
      getElementById: (id: string) => (id === 'attacksOfOpportunity' ? aooEl : null)
    };

    try {
      enterCombat('thror_aoo_ui_test', 15);
      updateAttacksOfOpportunityDisplay();
      expect(aooEl.textContent).toBe('5/5');
    } finally {
      endCombat('thror_aoo_ui_test');
      delete (global as any).document;
    }
  });
});

