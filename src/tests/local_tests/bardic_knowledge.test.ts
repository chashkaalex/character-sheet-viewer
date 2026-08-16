import * as fs from 'fs';
import * as path from 'path';

// Mock browser globals for testing client-side scripts under Node
(global as any).window = {
  addEventListener: () => {},
  document: {
    addEventListener: () => {},
    getElementById: () => null
  }
};
(global as any).document = (global as any).window.document;

// Import character to load classes
import '../../server/character/character';

import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { Character, CharacterError } from '../../server/character/character';

describe('Bardic Knowledge Feature Tests', () => {
  const TEMP_DIR = path.join(__dirname, 'test_character_sheets', 'temp');
  const TEMP_FILE_PATH = path.join(TEMP_DIR, 'temp_bardic_knowledge_test.txt');

  beforeEach(() => {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    if (fs.existsSync(TEMP_FILE_PATH)) {
      fs.unlinkSync(TEMP_FILE_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_FILE_PATH)) {
      fs.unlinkSync(TEMP_FILE_PATH);
    }
  });

  it('should not add Bardic Knowledge skill to a non-Bard character', () => {
    const NON_BARD_SHEET = [
      'Mock Fighter',
      'Human Fighter 5',
      'Hp 45 Speed 30',
      'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)',
      'Attack: Unarmed +5 (1d3)',
      'Statuses:',
      'Feats:',
      'Special Abilities:',
      'Racial Traits:',
      'Bonus Abilities:',
      'Skills:',
      'Personal Information:'
    ].join('\n');

    fs.writeFileSync(TEMP_FILE_PATH, NON_BARD_SHEET, 'utf8');

    const char = GetCharacterByDocId(TEMP_FILE_PATH);
    expect(char instanceof CharacterError).toBe(false);
    if (char instanceof CharacterError) return;

    const bk = char.skills.find(s => s.name === 'Bardic Knowledge');
    expect(bk).toBeUndefined();
  });

  it('should add Bardic Knowledge with rank matching Bard level and apply correct Int and synergy bonuses', () => {
    const BARD_SHEET = [
      'Mock Bard',
      'Human Bard 6',
      'Hp 45 Speed 30',
      'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 14 (+2)', 'Wis 10 (+0)', 'Cha 10 (+0)',
      'Attack: Unarmed +5 (1d3)',
      'Prepared Spells:',
      'Bard',
      'Statuses:',
      'Feats:',
      'Special Abilities:',
      'Racial Traits:',
      'Bonus Abilities:',
      'Skills:',
      'Knowledge (history) (Int) 5,',
      'Personal Information:'
    ].join('\n');

    fs.writeFileSync(TEMP_FILE_PATH, BARD_SHEET, 'utf8');

    const char = GetCharacterByDocId(TEMP_FILE_PATH);
    expect(char instanceof CharacterError).toBe(false);
    if (char instanceof CharacterError) return;

    const bk = char.skills.find(s => s.name === 'Bardic Knowledge');
    expect(bk).toBeDefined();
    if (!bk) return;

    // Rank = Bard Level = 6
    expect(bk.score).toBe(6);
    // Int modifier = +2
    // Knowledge (history) rank = 5, which grants +2 synergy
    // Total bonus = 6 + 2 (Int) + 2 (synergy) = 10
    expect(bk.bonus).toBe(10);
    expect(bk.string).toContain('+2 Knowledge (history) synergy');
  });

  it('should not apply synergy bonus if Knowledge (history) is less than 5', () => {
    const BARD_SHEET_NO_SYNERGY = [
      'Mock Bard',
      'Human Bard 6',
      'Hp 45 Speed 30',
      'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 14 (+2)', 'Wis 10 (+0)', 'Cha 10 (+0)',
      'Attack: Unarmed +5 (1d3)',
      'Prepared Spells:',
      'Bard',
      'Statuses:',
      'Feats:',
      'Special Abilities:',
      'Racial Traits:',
      'Bonus Abilities:',
      'Skills:',
      'Knowledge (history) (Int) 4,',
      'Personal Information:'
    ].join('\n');

    fs.writeFileSync(TEMP_FILE_PATH, BARD_SHEET_NO_SYNERGY, 'utf8');

    const char = GetCharacterByDocId(TEMP_FILE_PATH);
    expect(char instanceof CharacterError).toBe(false);
    if (char instanceof CharacterError) return;

    const bk = char.skills.find(s => s.name === 'Bardic Knowledge');
    expect(bk).toBeDefined();
    if (!bk) return;

    // Rank = Bard Level = 6
    expect(bk.score).toBe(6);
    // Int modifier = +2
    // Knowledge (history) rank = 4 (< 5), so no synergy
    // Total bonus = 6 + 2 = 8
    expect(bk.bonus).toBe(8);
  });
});
