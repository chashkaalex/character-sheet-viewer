import * as fs from 'fs';
import * as path from 'path';
import { AddStatusToCharacter, GetCharacterRepByDocId } from '../../server/character/character_manipulation';
import { CharacterError } from '../../server/character/character';
import { CharacterRep } from '../../server/character/character_rep';
import { FearConditions } from '../../server/character/state/conditions';

describe('Fear Conditions & Remove Fear', () => {
  const TEMP_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_thror_fear_test.txt');
  const SOURCE_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

  beforeEach(() => {
    if (!fs.existsSync(path.dirname(TEMP_FILE_PATH))) {
      fs.mkdirSync(path.dirname(TEMP_FILE_PATH), { recursive: true });
    }
    fs.copyFileSync(SOURCE_FILE_PATH, TEMP_FILE_PATH);
  });

  afterAll(() => {
    if (fs.existsSync(TEMP_FILE_PATH)) {
      fs.unlinkSync(TEMP_FILE_PATH);
    }
  });

  it.each(FearConditions)('applies -2 attack, save, skill, and ability penalties for %s', condition => {
    const baseline = GetCharacterRepByDocId(TEMP_FILE_PATH) as CharacterRep;
    const baseFort = baseline.saves.Fort.currentScore;
    const baseRef = baseline.saves.Ref.currentScore;
    const baseWill = baseline.saves.Will.currentScore;
    const baseSpot = baseline.skills.Spot.bonus;
    const baseStr = baseline.abilities.Str.currentScore;

    const updated = AddStatusToCharacter(TEMP_FILE_PATH, condition, 5);
    expect(updated instanceof CharacterError).toBe(false);
    const rep = updated as CharacterRep;

    expect(rep.statuses.some(s => s.name === condition)).toBe(true);
    expect(rep.saves.Fort.currentScore).toBe(baseFort - 2);
    expect(rep.saves.Ref.currentScore).toBe(baseRef - 2);
    expect(rep.saves.Will.currentScore).toBe(baseWill - 2);
    expect(rep.abilities.Str.currentScore).toBe(baseStr - 2);
    // Str -2 reduces Str mod by 1, plus -2 skill penalty; Spot uses Wis (-2 Wis -> -1 mod, plus -2 skill = -3)
    expect(rep.skills.Spot.bonus).toBe(baseSpot - 3);
  });

  it('removes all active fear conditions when Remove Fear is applied and restores stats', () => {
    const baseline = GetCharacterRepByDocId(TEMP_FILE_PATH) as CharacterRep;
    const baseFort = baseline.saves.Fort.currentScore;
    const baseStr = baseline.abilities.Str.currentScore;

    AddStatusToCharacter(TEMP_FILE_PATH, 'Shaken', 5);
    AddStatusToCharacter(TEMP_FILE_PATH, 'Frightened', 5);
    AddStatusToCharacter(TEMP_FILE_PATH, 'Panicked', 5);

    const afterRemoveFear = AddStatusToCharacter(TEMP_FILE_PATH, 'Remove Fear', 100);
    expect(afterRemoveFear instanceof CharacterError).toBe(false);
    const rep = afterRemoveFear as CharacterRep;

    FearConditions.forEach(condition => {
      expect(rep.statuses.some(s => s.name === condition)).toBe(false);
    });
    expect(rep.statuses.some(s => s.name === 'Remove Fear')).toBe(true);
    expect(rep.saves.Fort.currentScore).toBe(baseFort);
    expect(rep.abilities.Str.currentScore).toBe(baseStr);
  });
});

