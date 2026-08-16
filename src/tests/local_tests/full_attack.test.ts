import * as path from 'path';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { Character } from '../../server/character/character';
import { getCharacterRep } from '../../server/character/character_rep';
import { calculateNormalFullAttack, calculateTwfFullAttack, getBaseBab } from '../../server/character/gear/weapons/full_attack';
import { calculateTwf } from '../../server/character/gear/weapons/twf';

const WOLFREEK_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'wolfreek_test.txt');
const THROR_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
const AZEEM_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'azeem_test.txt');

function getCharacter(filePath: string): Character {
  const char = GetCharacterByDocId(filePath) as Character;
  expect(char.parseSuccess).toBe(true);
  return char;
}

describe('Full Attack calculations', () => {

  describe('Base BAB calculation', () => {
    test('Azeem (Fighter 12) has base BAB 12', () => {
      const char = getCharacter(AZEEM_TEST_FILE);
      expect(getBaseBab(char)).toBe(12);
    });

    test('Thror (Monk 6 / Cleric 3 / Sacred Fist 3) has base BAB 9', () => {
      const char = getCharacter(THROR_TEST_FILE);
      // Monk 6: +4, Cleric 3: +2, Sacred Fist 3: +3
      expect(getBaseBab(char)).toBe(9);
    });

    test('Wolfreek (Fighter 3) has base BAB 3', () => {
      const char = getCharacter(WOLFREEK_TEST_FILE);
      expect(getBaseBab(char)).toBe(3);
    });
  });

  describe('Fighter 3 with Rapid Shot (Wolfreek)', () => {
    let char: Character;

    beforeAll(() => {
      char = getCharacter(WOLFREEK_TEST_FILE);
    });

    test('Wolfreek parses correctly', () => {
      expect(char.name).toBe('Wolfreek');
      expect(char.HasFeat('Rapid Shot')).toBe(true);
    });

    test('Wolfreek Composite Longbow has correct normal full attack', () => {
      const bow = char.weapons.find(w => w.name.includes('Composite Longbow') || w.name.includes('composite longbow'));
      expect(bow).toBeDefined();

      const sequence = calculateNormalFullAttack(bow!, char);
      // Rapid Shot should give 1 extra attack at highest bonus, and -2 penalty to all.
      // Base attack for bow: +7 (+3 BAB + 3 Dex + 1 MW).
      // With Rapid Shot penalty: +5.
      // Sequence should be +5/+5
      expect(sequence.attacks.length).toBe(2);
      expect(sequence.attacks[0].atkValue).toBe('+5');
      expect(sequence.attacks[1].atkValue).toBe('+5');
      expect(sequence.summaryString).toBe('+5/+5');
    });

    test('Wolfreek melee weapon (Short sword) has normal iteratives (no Rapid Shot)', () => {
      const sword = char.weapons.find(w => w.name === 'Short sword');
      expect(sword).toBeDefined();

      const sequence = calculateNormalFullAttack(sword!, char);
      // Fighter 3 has BAB 3. Only 1 iterative attack.
      expect(sequence.attacks.length).toBe(1);
      expect(sequence.attacks[0].atkValue).toBe('+5'); // BAB 3 + Str 2 = 5
      expect(sequence.summaryString).toBe('+5');
    });
  });

  describe('Monk Flurry and Haste (Thror)', () => {
    let char: Character;

    beforeAll(() => {
      char = getCharacter(THROR_TEST_FILE);
    });

    test('Thror flurry calculation uses Monk Level 6 (not stacking with Sacred Fist)', () => {
      // Thror has Monk 6.
      // Monk 6 flurry: penalty is -1, extra attacks is 1.
      // Under D&D 3.5 rules, flurry does not adjust BAB.
      // Total BAB remains 9.
      // Unarmed normal attack bonus: +12 (BAB 9 + Str 2 + Amulet 1).
      // Flurry attack bonus at highest: 9 BAB + 2 Str + 1 Amulet - 1 penalty = 11.
      // Flurry iteratives: 2 iteratives (at 9-1=11, and 9-5-1=6)
      // Plus 1 extra flurry attack at highest: +11.
      // Total flurry sequence: +11/+11/+6.
      const unarmed = char.weapons.find(w => w.name === 'Unarmed');
      expect(unarmed).toBeDefined();

      const sequence = calculateNormalFullAttack(unarmed!, char);
      expect(sequence.attacks.length).toBe(3); // 1 normal + 1 flurry + 1 iterative
      expect(sequence.attacks[0].atkValue).toBe('+11');
      expect(sequence.attacks[1].atkValue).toBe('+11');
      expect(sequence.attacks[2].atkValue).toBe('+6');
      expect(sequence.summaryString).toBe('+11/+11/+6');
    });

    test('Thror flurry with Haste adds extra attack', () => {
      // Re-read lines and insert Haste line under Statuses
      const lines = [...char.lines];
      const statusIndex = lines.indexOf('Statuses:');
      let updatedLines = lines;
      if (statusIndex !== -1) {
        updatedLines = [...lines];
        updatedLines.splice(statusIndex + 1, 0, 'Haste: 0/5 rounds');
      }
      const hasterChar = new Character(updatedLines);
      hasterChar.ParseCharacter();

      const unarmed = hasterChar.weapons.find(w => w.name === 'Unarmed');
      expect(unarmed).toBeDefined();

      const sequence = calculateNormalFullAttack(unarmed!, hasterChar);

      // Flurry sequence + Haste extra attack
      // Haste adds +1 to all attacks, so highest is now +12 (and iterative is +7).
      // Sequence: +12/+12 (flurry extra) /+12 (haste extra) /+7 (iterative)
      expect(sequence.attacks.length).toBe(4);
      expect(sequence.attacks[0].atkValue).toBe('+12');
      expect(sequence.attacks[1].atkValue).toBe('+12');
      expect(sequence.attacks[2].atkValue).toBe('+12');
      expect(sequence.attacks[3].atkValue).toBe('+7');
      expect(sequence.summaryString).toBe('+12/+12/+12/+7');
    });
  });

  describe('TWF Full Attack (Azeem)', () => {
    let char: Character;

    beforeAll(() => {
      char = getCharacter(AZEEM_TEST_FILE);
    });

    test('Azeem has GTWF and 3 main-hand/off-hand attacks in TWF full attack', () => {
      const twfData = calculateTwf(char, char.weapons);
      expect(twfData).not.toBeNull();

      const twfFull = calculateTwfFullAttack(char, char.weapons, twfData);

      const ssPlus1Index = char.weapons.findIndex(w => w.name === 'Short Sword +1');
      const ssIndex = char.weapons.findIndex(w => w.name === 'Short Sword');

      // Main Hand sequence (Short Sword +1) when using Short Sword as off-hand
      const mhSeq = twfFull.twfMain[ssPlus1Index]?.[ssIndex];
      expect(mhSeq).toBeDefined();
      // BAB 12 -> 3 iteratives. Penalty is -2 (light off-hand).
      // Base attack is +18. With -2, highest is +16.
      // Sequence: +16/+11/+6.
      expect(mhSeq.attacks.length).toBe(3);
      expect(mhSeq.attacks[0].atkValue).toBe('+16');
      expect(mhSeq.attacks[1].atkValue).toBe('+11');
      expect(mhSeq.attacks[2].atkValue).toBe('+6');
      expect(mhSeq.summaryString).toBe('+16/+11/+6');

      // Off Hand sequence (Short Sword) when using Short Sword +1 as main-hand
      const ohSeq = twfFull.twfOff[ssIndex]?.[ssPlus1Index];
      expect(ohSeq).toBeDefined();
      // GTWF -> 3 off-hand attacks. Penalty is -2.
      // Base attack is +17. With -2, highest is +15.
      // Sequence: +15/+10/+5.
      expect(ohSeq.attacks.length).toBe(3);
      expect(ohSeq.attacks[0].atkValue).toBe('+15');
      expect(ohSeq.attacks[1].atkValue).toBe('+10');
      expect(ohSeq.attacks[2].atkValue).toBe('+5');
      expect(ohSeq.summaryString).toBe('+15/+10/+5');
    });
  });

  describe('CharacterRep fullAttack serialization', () => {
    test('Azeem rep contains fullAttack properties on weapons', () => {
      const char = getCharacter(AZEEM_TEST_FILE);
      const rep = getCharacterRep(char);

      const ssPlus1 = rep.weapons.find(w => w.name === 'Short Sword +1');
      expect(ssPlus1).toBeDefined();
      expect(ssPlus1.fullAttack).toBeDefined();
      expect(ssPlus1.fullAttack.normal).toBeDefined();
      expect(ssPlus1.fullAttack.twfMain).toBeDefined();

      // Check remapped index
      const ss = rep.weapons.find(w => w.name === 'Short Sword');
      const ssIdx = rep.weapons.indexOf(ss);

      expect(ssPlus1.fullAttack.twfMain[ssIdx]).toBeDefined();
      expect(ssPlus1.fullAttack.twfMain[ssIdx].summaryString).toBe('+16/+11/+6');
    });
  });
});
