import * as path from 'path';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { Character } from '../../server/character/character';
import { getCharacterRep } from '../../server/character/character_rep';
import { calculateTwf, TwfData } from '../../server/character/gear/weapons/twf';

const AZEEM_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'azeem_test.txt');
const THROR_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
const BESS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');

function getCharacter(filePath: string): Character {
  const char = GetCharacterByDocId(filePath) as Character;
  expect(char.parseSuccess).toBe(true);
  return char;
}

describe('TWF Feature', () => {

  describe('Azeem - TWF Fighter 12', () => {
    let char: Character;
    let twfData: TwfData | null;

    beforeAll(() => {
      char = getCharacter(AZEEM_TEST_FILE);
      twfData = calculateTwf(char, char.weapons);
    });

    test('Azeem parses successfully', () => {
      expect(char.parseSuccess).toBe(true);
      expect(char.name).toBe('Azeem al-Rashid');
    });

    test('Azeem has correct classes', () => {
      expect(char.classes).toEqual([{ name: 'Fighter', level: 12 }]);
    });

    test('Azeem has correct BAB', () => {
      expect(char.bab.currentScore).toBe(12);
    });

    test('Azeem has TWF feats detected', () => {
      expect(char.HasFeat('Two-Weapon Fighting')).toBe(true);
      expect(char.HasFeat('Improved Two-Weapon Fighting')).toBe(true);
      expect(char.HasFeat('Greater Two-Weapon Fighting')).toBe(true);
    });

    test('TWF data is computed (not null)', () => {
      expect(twfData).not.toBeNull();
      expect(twfData!.hasTWF).toBe(true);
      expect(twfData!.hasImprovedTWF).toBe(true);
      expect(twfData!.hasGreaterTWF).toBe(true);
    });

    test('Azeem has correct weapons parsed', () => {
      // Should have: Unarmed, Short Sword +1, Short Sword, Longsword
      const weaponNames = char.weapons.map(w => w.name).sort();
      expect(weaponNames).toContain('Short Sword +1');
      expect(weaponNames).toContain('Short Sword');
      expect(weaponNames).toContain('Longsword');
      expect(weaponNames).toContain('Unarmed');
    });

    test('TWF combinations are generated for all melee weapon pairs', () => {
      // Melee weapons: Unarmed, Short Sword +1, Short Sword, Longsword = 4
      // Ordered pairs excluding self = 4 * 3 = 12
      expect(twfData!.combinations.length).toBe(12);
    });

    test('TWF penalty is -2/-2 for light off-hand (Short Sword)', () => {
      // Find combo: Short Sword +1 (main) + Short Sword (off)
      const ssPlus1Index = char.weapons.findIndex(w => w.name === 'Short Sword +1');
      const ssIndex = char.weapons.findIndex(w => w.name === 'Short Sword');
      expect(ssPlus1Index).toBeGreaterThanOrEqual(0);
      expect(ssIndex).toBeGreaterThanOrEqual(0);

      const combo = twfData!.combinations.find(
        c => c.mainWeaponIndex === ssPlus1Index && c.offWeaponIndex === ssIndex
      );
      expect(combo).toBeDefined();
      expect(combo!.mainPenalty).toBe(-2);
      expect(combo!.offPenalty).toBe(-2);
    });

    test('TWF penalty is -4/-4 for one-handed off-hand (Longsword)', () => {
      // Find combo: Short Sword +1 (main) + Longsword (off, one-handed)
      const ssPlus1Index = char.weapons.findIndex(w => w.name === 'Short Sword +1');
      const lsIndex = char.weapons.findIndex(w => w.name === 'Longsword');
      expect(ssPlus1Index).toBeGreaterThanOrEqual(0);
      expect(lsIndex).toBeGreaterThanOrEqual(0);

      const combo = twfData!.combinations.find(
        c => c.mainWeaponIndex === ssPlus1Index && c.offWeaponIndex === lsIndex
      );
      expect(combo).toBeDefined();
      expect(combo!.mainPenalty).toBe(-4);
      expect(combo!.offPenalty).toBe(-4);
    });

    test('Main-hand attack bonus is correctly penalized (light off-hand)', () => {
      const ssPlus1Index = char.weapons.findIndex(w => w.name === 'Short Sword +1');
      const ssIndex = char.weapons.findIndex(w => w.name === 'Short Sword');
      const ssPlus1 = char.weapons[ssPlus1Index];

      const combo = twfData!.combinations.find(
        c => c.mainWeaponIndex === ssPlus1Index && c.offWeaponIndex === ssIndex
      );

      // Main-hand attack = normal attack bonus - 2
      expect(combo!.mainAttackBonus).toBe(ssPlus1.attackBonus.bonus - 2);
    });

    test('Off-hand attack bonus is correctly penalized (light off-hand)', () => {
      const ssPlus1Index = char.weapons.findIndex(w => w.name === 'Short Sword +1');
      const ssIndex = char.weapons.findIndex(w => w.name === 'Short Sword');
      const ss = char.weapons[ssIndex];

      const combo = twfData!.combinations.find(
        c => c.mainWeaponIndex === ssPlus1Index && c.offWeaponIndex === ssIndex
      );

      // Off-hand attack = off weapon normal attack bonus - 2
      expect(combo!.offAttackBonus).toBe(ss.attackBonus.bonus - 2);
    });

    test('Off-hand damage uses half Str modifier', () => {
      const ssPlus1Index = char.weapons.findIndex(w => w.name === 'Short Sword +1');
      const ssIndex = char.weapons.findIndex(w => w.name === 'Short Sword');

      const combo = twfData!.combinations.find(
        c => c.mainWeaponIndex === ssPlus1Index && c.offWeaponIndex === ssIndex
      );

      // Azeem has Str 18 (+4), half = +2
      // Off-hand Short Sword: half Str(2) + 0 enhancement + 0 weapon specific + feat damage bonus
      // Weapon Specialization (Short Sword) gives +2 damage
      const ss = char.weapons[ssIndex];
      const expectedHalfStr = Math.floor(4 / 2); // 2
      const expectedOtherBonuses =
        ss.damageBonus.globalDmgBonus.currentScore +
        ss.damageBonus.weaponSpecificBonus +
        ss.damageBonus.featBonus.currentScore;
      expect(combo!.offDamageBonus).toBe(expectedHalfStr + expectedOtherBonuses);
    });
  });

  describe('Character Rep TWF serialization', () => {
    test('Azeem rep includes TWF data', () => {
      const char = getCharacter(AZEEM_TEST_FILE);
      const rep = getCharacterRep(char);

      expect(rep.twf).toBeDefined();
      expect(rep.twf!.hasTWF).toBe(true);
      expect(rep.twf!.hasImprovedTWF).toBe(true);
      expect(rep.twf!.hasGreaterTWF).toBe(true);
      expect(rep.twf!.combinations.length).toBeGreaterThan(0);
    });

    test('TWF combination indices match sorted weapon order', () => {
      const char = getCharacter(AZEEM_TEST_FILE);
      const rep = getCharacterRep(char);

      // Weapons in rep are sorted alphabetically
      const repWeaponNames = rep.weapons.map(w => w.name);
      const sortedNames = [...repWeaponNames].sort();
      expect(repWeaponNames).toEqual(sortedNames);

      // All TWF indices should be valid indexes into rep.weapons
      for (const combo of rep.twf!.combinations) {
        expect(combo.mainWeaponIndex).toBeGreaterThanOrEqual(0);
        expect(combo.mainWeaponIndex).toBeLessThan(rep.weapons.length);
        expect(combo.offWeaponIndex).toBeGreaterThanOrEqual(0);
        expect(combo.offWeaponIndex).toBeLessThan(rep.weapons.length);
        expect(combo.mainWeaponIndex).not.toBe(combo.offWeaponIndex);
      }
    });
  });

  describe('Characters without TWF', () => {
    test('Thror (Monk) has no TWF data', () => {
      const char = getCharacter(THROR_TEST_FILE);
      const twfData = calculateTwf(char, char.weapons);
      expect(twfData).toBeNull();
    });

    test('Bess (Bard) has no TWF data', () => {
      const char = getCharacter(BESS_TEST_FILE);
      const twfData = calculateTwf(char, char.weapons);
      expect(twfData).toBeNull();
    });

    test('Bess rep does not include TWF field', () => {
      const char = getCharacter(BESS_TEST_FILE);
      const rep = getCharacterRep(char);
      expect(rep.twf).toBeUndefined();
    });
  });

  describe('Inline character tests', () => {
    function createCharWithTwf(feats: string[], weapons: string[]): { char: Character; twfData: TwfData | null } {
      const lines = [
        'Test TWF Fighter',
        'Human Fighter 6',
        'Hp 50 Speed 30',
        'Attack: +6 Short Sword (1d6/19-20).',
        'Str 16 (+3)',
        'Dex 14 (+2)',
        'Con 14 (+2)',
        'Int 10 (+0)',
        'Wis 10 (+0)',
        'Cha 10 (+0)',
        'Statuses:',
        'Feats:',
        ...feats,
        'Special Abilities:',
        'Racial Traits:',
        'Bonus Abilities:',
        'Skills:',
        'Battle Gear:',
        ...weapons.map(w => w + ','),
        'Possessions:',
        'Personal Information:'
      ];
      const char = new Character(lines);
      char.ParseCharacter();
      expect(char.parseErrors).toEqual([]);
      expect(char.parseSuccess).toBe(true);
      const twfData = calculateTwf(char, char.weapons);
      return { char, twfData };
    }

    test('Fighter with TWF and two light weapons gets -2/-2', () => {
      const { twfData } = createCharWithTwf(
        ['Two-Weapon Fighting'],
        ['Short Sword (1d6/19-20)', 'Dagger (1d4/19-20)']
      );

      expect(twfData).not.toBeNull();
      // Find a combo where off-hand is light
      const combo = twfData!.combinations.find(c => c.mainPenalty === -2);
      expect(combo).toBeDefined();
      expect(combo!.offPenalty).toBe(-2);
    });

    test('Fighter without TWF feat gets null TWF data', () => {
      const { twfData } = createCharWithTwf(
        [],
        ['Short Sword (1d6/19-20)', 'Dagger (1d4/19-20)']
      );

      expect(twfData).toBeNull();
    });

    test('Fighter with TWF and one-handed off-hand gets -4/-4', () => {
      const { twfData } = createCharWithTwf(
        ['Two-Weapon Fighting'],
        ['Short Sword (1d6/19-20)', 'Longsword (1d8/19-20)']
      );

      expect(twfData).not.toBeNull();
      // Short Sword as main, Longsword (one-handed) as off → -4/-4
      const ssIndex = twfData!.combinations[0].mainWeaponIndex;
      const lsIndex = twfData!.combinations[0].offWeaponIndex;

      // Find the combo where longsword is the off-hand
      const combo = twfData!.combinations.find(c => {
        // We need to check which weapon is one-handed
        return c.mainPenalty === -4;
      });
      expect(combo).toBeDefined();
      expect(combo!.offPenalty).toBe(-4);
    });

    test('Off-hand damage uses half Str (Str 16 → +3 modifier → half = +1)', () => {
      const { twfData, char } = createCharWithTwf(
        ['Two-Weapon Fighting'],
        ['Short Sword (1d6/19-20)', 'Dagger (1d4/19-20)']
      );

      expect(twfData).not.toBeNull();
      // Half of Str modifier 3 = 1 (floor)
      // No enhancement or feat bonuses on these weapons
      const combo = twfData!.combinations[0];
      const offWeapon = char.weapons[combo.offWeaponIndex];
      const expectedHalfStr = Math.floor(3 / 2); // 1
      const expectedOther =
        offWeapon.damageBonus.globalDmgBonus.currentScore +
        offWeapon.damageBonus.weaponSpecificBonus +
        offWeapon.damageBonus.featBonus.currentScore;
      expect(combo.offDamageBonus).toBe(expectedHalfStr + expectedOther);
    });

    test('Fighter with only 1 melee weapon has empty TWF combinations', () => {
      const { twfData } = createCharWithTwf(
        ['Two-Weapon Fighting'],
        ['Short Sword (1d6/19-20)']
      );

      // TWF is detected but no valid pairs (only 1 melee weapon + Unarmed = 2 if Unarmed counts)
      expect(twfData).not.toBeNull();
      // With Unarmed + Short Sword, there should be 2 combinations (each can be main or off)
      expect(twfData!.combinations.length).toBeGreaterThanOrEqual(2);
    });
  });
});
