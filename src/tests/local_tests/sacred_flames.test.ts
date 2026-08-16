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

import { GetCharacterByDocId, OnUseAction } from '../../server/character/character_manipulation';
import { Character, CharacterError } from '../../server/character/character';

describe('Sacred Flames Feat and Action Tests', () => {
  const TEMP_DIR = path.join(__dirname, 'test_character_sheets', 'temp');
  const TEMP_FILE_PATH = path.join(TEMP_DIR, 'temp_sacred_flames_test.txt');

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

  it('should parse Sacred Flames action and apply level 4 + Wis (+4) = +8 damage to Sacred Fist unarmed strike', () => {
    const SACRED_FIST_SHEET_CONTENT = [
      'Mock Sacred Fist',
      'Human Cleric 3/Sacred Fist 4',
      'Hp 45 Speed 30',
      'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 18 (+4)', 'Cha 10 (+0)',
      'Attack: Unarmed +5 (1d8)',
      'Prepared Spells:',
      'Cleric',
      'Statuses:',
      'Feats:',
      'Sacred Flames',
      'Special Abilities:',
      'Domains (Protection, Strength),',
      'Racial Traits:',
      'Bonus Abilities:',
      'Skills:',
      'Personal Information:'
    ].join('\n');

    fs.writeFileSync(TEMP_FILE_PATH, SACRED_FIST_SHEET_CONTENT, 'utf8');

    // 1. Verify action is present
    const char = GetCharacterByDocId(TEMP_FILE_PATH);
    expect(char instanceof CharacterError).toBe(false);
    if (char instanceof CharacterError) return;

    expect(char.actions).toContain('Sacred Flames');
    expect(char.HasStatus('Sacred Flames')).toBe(false);

    // 2. Trigger the action
    const useResult = OnUseAction(TEMP_FILE_PATH, 'Sacred Flames');
    expect(useResult instanceof CharacterError).toBe(false);
    if (useResult instanceof CharacterError) return;

    expect(useResult.statuses.some(s => s.name === 'Sacred Flames')).toBe(true);

    // 3. Verify status added in file
    const fileLines = fs.readFileSync(TEMP_FILE_PATH, 'utf8').split('\n');
    const statusLine = fileLines.find(l => l.trim().startsWith('Sacred Flames:'));
    expect(statusLine).toBeDefined();

    // 4. Reload character and check damage bonus
    const loadedChar = GetCharacterByDocId(TEMP_FILE_PATH);
    expect(loadedChar instanceof CharacterError).toBe(false);
    if (loadedChar instanceof CharacterError) return;

    const unarmed = loadedChar.weapons.find(w => w.name === 'Unarmed');
    expect(unarmed).toBeDefined();
    if (!unarmed) return;

    // Sacred Flames damage bonus: 4 (SF level) + 4 (Wis mod) = 8
    expect(unarmed.featDamageBonus.currentScore).toBe(8);
    expect(unarmed.damageBonus.bonus).toBe(8);
    expect(unarmed.dmgValue).toBe('1d8 + 8');
    expect(unarmed.damageBonus.state.string).toContain('+8 (Sacred Flames)');
  });

  it('should apply Wis (+3) = +3 damage to a non-Sacred Fist with the Sacred Flames feat', () => {
    const NON_SF_SHEET_CONTENT = [
      'Mock Fighter',
      'Human Fighter 5',
      'Hp 45 Speed 30',
      'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 16 (+3)', 'Cha 10 (+0)',
      'Attack: Unarmed +5 (1d3)',
      'Statuses:',
      'Feats:',
      'Sacred Flames',
      'Special Abilities:',
      'Racial Traits:',
      'Bonus Abilities:',
      'Skills:',
      'Personal Information:'
    ].join('\n');

    fs.writeFileSync(TEMP_FILE_PATH, NON_SF_SHEET_CONTENT, 'utf8');

    // 1. Verify action is present
    const char = GetCharacterByDocId(TEMP_FILE_PATH);
    expect(char instanceof CharacterError).toBe(false);
    if (char instanceof CharacterError) return;

    expect(char.actions).toContain('Sacred Flames');

    // 2. Trigger the action
    const useResult = OnUseAction(TEMP_FILE_PATH, 'Sacred Flames');
    expect(useResult instanceof CharacterError).toBe(false);
    if (useResult instanceof CharacterError) return;

    // 3. Reload and check damage bonus
    const loadedChar = GetCharacterByDocId(TEMP_FILE_PATH);
    expect(loadedChar instanceof CharacterError).toBe(false);
    if (loadedChar instanceof CharacterError) return;

    const unarmed = loadedChar.weapons.find(w => w.name === 'Unarmed');
    expect(unarmed).toBeDefined();
    if (!unarmed) return;

    // Sacred Flames damage bonus: 0 (SF level) + 3 (Wis mod) = 3
    expect(unarmed.featDamageBonus.currentScore).toBe(3);
    expect(unarmed.damageBonus.bonus).toBe(3);
    expect(unarmed.dmgValue).toBe('1d3 + 3');
    expect(unarmed.damageBonus.state.string).toContain('+3 (Sacred Flames)');
  });
});
