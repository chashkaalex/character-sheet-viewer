import * as path from 'path';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { getCharacterRep } from '../../server/character/character_rep';
import { Character } from '../../server/character/character';

const MORTY_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'morty_test.txt');
const THRORS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

describe('D&D 3.5 Sneak Attack Calculation & Weapon Toggle Representation', () => {
  test('Morty (Rogue 5 / Unseen Seer 5) calculates 5d6 base Sneak Attack (+3d6 Rogue, +2d6 Unseen Seer)', () => {
    const morty = GetCharacterByDocId(MORTY_TEST_FILE) as Character;
    const sneakProp = morty.GetModifiableProperty('sneakAttackDice');

    expect(sneakProp.currentScore).toBe(5);
    expect(sneakProp.EffectsString).toContain('+3 (Rogue)');
    expect(sneakProp.EffectsString).toContain('+2 (Unseen Seer)');

    const rep = getCharacterRep(morty);
    expect(rep.sneakAttack).toBeDefined();
    expect(rep.sneakAttack!.dice).toBe(5);
  });

  test('Non-sneak-attack characters (e.g. Thror) have 0 sneakAttackDice and no sneakAttack rep', () => {
    const thror = GetCharacterByDocId(THRORS_TEST_FILE) as Character;
    expect(thror.GetModifiableProperty('sneakAttackDice').currentScore).toBe(0);

    const rep = getCharacterRep(thror);
    expect(rep.sneakAttack).toBeUndefined();
  });

  test('Deadly Precision Thinblade separates normal damage (1d8 + 2) from Sneak Attack damage (1d8 + 2 + 6d6 sneak attack)', () => {
    const morty = GetCharacterByDocId(MORTY_TEST_FILE) as Character;
    const rep = getCharacterRep(morty);

    const thinblade = rep.weapons.find((w: any) => w.name.includes('Thinblade'));
    expect(thinblade).toBeDefined();

    // Normal (checkbox unchecked): no sneak attack dice rolled
    expect(thinblade.dmgValue).toBe('1d8 + 2');
    expect(thinblade.rolzDmgRollMessage).toBe(
      '#1d8+2 #Deadly Precision Wingblade Elvencraft Thinblade +1 Damage'
    );

    // Sneak Attack (checkbox checked): 5d6 class + 1d6 Deadly Precision = 6d6 sneak attack
    expect(thinblade.sneakDmgValue).toBe('1d8 + 2 + 6d6 sneak attack');
    expect(thinblade.sneakRolzDmgRollMessage).toBe(
      'Deadly Precision Wingblade Elvencraft Thinblade +1 Damage: [1d8+2] (Physical) + [6d6] (Sneak attack)'
    );
    expect(thinblade.sneakDamageString).toBe(
      '2: 1 Str modifier , +1 weapon bonus | Sneak Attack: +6d6 (+3 (Rogue), +2 (Unseen Seer), +1 (Weapon))'
    );
  });

  test('Other weapons on Morty add +5d6 sneak attack alongside existing elemental damage when toggled', () => {
    const morty = GetCharacterByDocId(MORTY_TEST_FILE) as Character;
    const rep = getCharacterRep(morty);

    // Adamantine Dagger (Masterwork)
    const dagger = rep.weapons.find((w: any) => w.name.includes('Adamantine Dagger'));
    expect(dagger).toBeDefined();
    expect(dagger.dmgValue).toBe('1d4 + 1');
    expect(dagger.sneakDmgValue).toBe('1d4 + 1 + 5d6 sneak attack');
    expect(dagger.sneakRolzDmgRollMessage).toBe(
      'Adamantine Dagger (Masterwork) Damage: [1d4+1] (Physical) + [5d6] (Sneak attack)'
    );

    // Masterwork Composite Longbow of Frost (+1 Str)
    const longbow = rep.weapons.find((w: any) => w.name.includes('Composite Longbow'));
    expect(longbow).toBeDefined();
    expect(longbow.dmgValue).toBe('1d8 + 1 + 1d6 cold');
    expect(longbow.sneakDmgValue).toBe('1d8 + 1 + 1d6 cold + 5d6 sneak attack');
    expect(longbow.sneakRolzDmgRollMessage).toBe(
      'Masterwork Composite Longbow of Frost (+1 Str) Damage: [1d8+1] (Physical) + [1d6] (Cold) + [5d6] (Sneak attack)'
    );
  });
});

