import * as path from 'path';
import { GetCharacterByDocId, GetCharacterRepByDocId } from '../../server/character/character_manipulation';
import { Character, CharacterError } from '../../server/character/character';
import { CharacterRep } from '../../server/character/character_rep';
import { SpecialAttackNames } from '../../server/character/constants';

describe('Special Attacks Cleanup & Calculations', () => {
  const THROR_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

  it('excludes non-universal or redundant entries from SpecialAttackNames', () => {
    const names: readonly string[] = SpecialAttackNames;
    expect(names).not.toContain('Turn (rebuke) undead');
    expect(names).not.toContain('Two-weapon fighting');
    expect(names).not.toContain('Mounted Combat');
    expect(names).not.toContain('Charge');

    expect(names).toEqual(
      expect.arrayContaining([
        'Aid another',
        'Bull rush',
        'Disarm',
        'Feint',
        'Grapple',
        'Overrun',
        'Sunder',
        'Throw splash weapon',
        'Trip'
      ])
    );
  });

  it('calculates Trip, Bull rush, Overrun (Str + size) and Grapple (Str + size + BAB)', () => {
    const result = GetCharacterRepByDocId(THROR_FILE_PATH);
    expect(result instanceof CharacterError).toBe(false);
    const rep = result as CharacterRep;

    const strMod = rep.abilities.Str.modifier;
    const char = GetCharacterByDocId(THROR_FILE_PATH) as Character;
    const bab = char.bab.currentScore;

    const sizeBonus = char.size.bonus;

    expect(rep.specialAttacks['Turn (rebuke) undead']).toBeUndefined();
    expect(rep.specialAttacks['Two-weapon fighting']).toBeUndefined();
    expect(rep.specialAttacks['Mounted Combat']).toBeUndefined();
    expect(rep.specialAttacks['Charge']).toBeUndefined();

    expect(rep.specialAttacks.Trip.bonus).toBe(strMod + sizeBonus + char.specialAttacks.Trip.currentScore);
    expect(rep.specialAttacks['Bull rush'].bonus).toBe(strMod + sizeBonus + char.specialAttacks['Bull rush'].currentScore);
    expect(rep.specialAttacks.Overrun.bonus).toBe(strMod + sizeBonus + char.specialAttacks.Overrun.currentScore);
    expect(rep.specialAttacks.Grapple.bonus).toBe(strMod + sizeBonus + bab + char.specialAttacks.Grapple.currentScore);
  });
});
