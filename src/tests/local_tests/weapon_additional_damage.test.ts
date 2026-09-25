import * as path from 'path';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { Character, CharacterError } from '../../server/character/character';
import { ParseWeaponExtraDamage, BuildRolzDamageMessage, FormatRolzBreakdown } from '../../server/character/gear/weapons/weapon_extra_damage';
import { Weapon } from '../../server/character/gear/weapons/weapons';
import { calculateNormalFullAttack } from '../../server/character/gear/weapons/full_attack';

describe('Weapon Additional Damage Parsing & Rolz Rolling', () => {
  const DEIN_PATH = path.join(__dirname, 'test_character_sheets', 'dein_test.txt');
  const BESS_PATH = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');

  describe('ParseWeaponExtraDamage Unit Tests', () => {
    test('should parse energy from description using curly braces and deduplicate with name', () => {
      const name = 'Flaming +1 Composite Longbow +5 Str';
      const desc = '+1 1d8+1d6{fire} /X3';
      const result = ParseWeaponExtraDamage(name, desc);

      expect(result.additionalDamages).toHaveLength(1);
      expect(result.additionalDamages[0]).toEqual({
        diceOrFlat: '1d6',
        type: 'fire',
        source: 'description',
        isDice: true
      });
      expect(result.formulaString).toBe('+ 1d6 fire');
      expect(result.warning).toBeNull();
    });

    test('should infer energy damage from weapon name if not present in description', () => {
      const name = 'Frost Waraxe +1 (Dwarvencraft)';
      const desc = '+1, 1d10 /X3';
      const result = ParseWeaponExtraDamage(name, desc);

      expect(result.additionalDamages).toHaveLength(1);
      expect(result.additionalDamages[0]).toEqual({
        diceOrFlat: '1d6',
        type: 'cold',
        source: 'frost',
        isDice: true
      });
      expect(result.formulaString).toBe('+ 1d6 cold');
      expect(result.warning).toBeNull();
    });

    test('should parse flat additional damage with type keyword from description', () => {
      const name = 'Short Sword (Green Dragon Bone)';
      const desc = '+1, 1d6 + 2/19-20x2, 1 lb, Green Dragon Fang, +2 poison damage';
      const result = ParseWeaponExtraDamage(name, desc);

      expect(result.additionalDamages).toHaveLength(1);
      expect(result.additionalDamages[0]).toEqual({
        diceOrFlat: '2',
        type: 'poison',
        source: 'description',
        isDice: false
      });
      expect(result.formulaString).toBe('+ 2 poison');
      expect(result.warning).toBeNull();
    });

    test('should detect conflict (Option B): description overrides name and warning is generated', () => {
      const name = 'Flaming Longsword +1';
      const desc = '+1, 1d8 + 1d6{cold} /19-20';
      const result = ParseWeaponExtraDamage(name, desc);

      expect(result.additionalDamages).toHaveLength(1);
      expect(result.additionalDamages[0].type).toBe('cold');
      expect(result.additionalDamages[0].diceOrFlat).toBe('1d6');
      expect(result.warning).not.toBeNull();
      expect(result.warning).toContain('Conflict');
      expect(result.warning).toContain('implies fire');
      expect(result.warning).toContain('specifies cold');
    });

    test('should handle weapons with multiple additional damage components', () => {
      const name = 'Flaming Shock Warhammer +1';
      const desc = '+1, 1d8 /X3';
      const result = ParseWeaponExtraDamage(name, desc);

      expect(result.additionalDamages).toHaveLength(2);
      expect(result.additionalDamages.map(d => d.type)).toEqual(['fire', 'electricity']);
      expect(result.formulaString).toBe('+ 1d6 fire + 1d6 electricity');
      expect(result.warning).toBeNull();
    });

    test('should return empty additional damages for normal non-enchanted weapons', () => {
      const name = 'Dagger';
      const desc = '1d4/19-20';
      const result = ParseWeaponExtraDamage(name, desc);

      expect(result.additionalDamages).toHaveLength(0);
      expect(result.formulaString).toBe('');
      expect(result.warning).toBeNull();
    });
  });

  describe('BuildRolzDamageMessage Unit Tests', () => {
    test('should build standard single-roll message when weapon has no extra damage', () => {
      const msg = BuildRolzDamageMessage('Dagger', '1d4', 2, []);
      expect(msg).toBe('#1d4+2 #Dagger Damage');
    });

    test('should build multi-component bracketed message for weapon with extra damage', () => {
      const msg = BuildRolzDamageMessage('Flaming +1 Composite Longbow +5 Str', '1d8', 7, [
        { diceOrFlat: '1d6', type: 'fire', source: 'description', isDice: true }
      ]);
      expect(msg).toBe('Flaming +1 Composite Longbow +5 Str Damage: [1d8+7] (Physical) + [1d6] (Fire)');
    });

    test('should handle flat additional damage in bracketed message', () => {
      const msg = BuildRolzDamageMessage('Short Sword (Green Dragon Bone)', '1d6', 3, [
        { diceOrFlat: '2', type: 'poison', source: 'description', isDice: false }
      ]);
      expect(msg).toBe('Short Sword (Green Dragon Bone) Damage: [1d6+3] (Physical) + [2] (Poison)');
    });
  });

  describe('FormatRolzBreakdown Unit Tests', () => {
    test('should format multi-component Rolz response with Physical and Fire damage', () => {
      const mockItems = [
        {
          input: '1d8+7',
          result: '15',
          details: '(8 + 7)',
          pre: 'Flaming Bow Damage: '
        },
        {
          input: '1d6',
          result: '4',
          details: '4',
          pre: ' (Physical) + ',
          post: ' (Fire)'
        }
      ];

      const breakdown = FormatRolzBreakdown(mockItems);
      expect(breakdown.title).toBe('Flaming Bow Damage');
      expect(breakdown.total).toBe(19);
      expect(breakdown.lines).toHaveLength(2);
      expect(breakdown.lines[0]).toBe('• Physical: 15 (8 + 7)');
      expect(breakdown.lines[1]).toBe('• Fire: 4 (4)');
      expect(breakdown.summary).toContain('Total: 19');
    });

    test('should format 3-component Rolz response (Physical, Fire, Electricity)', () => {
      const mockItems = [
        {
          input: '1d8+7',
          result: '14',
          details: '(7 + 7)',
          pre: 'Flaming Shock Bow Damage: '
        },
        {
          input: '1d6',
          result: '4',
          details: '4',
          pre: ' (Physical) + '
        },
        {
          input: '1d6',
          result: '5',
          details: '5',
          pre: ' (Fire) + ',
          post: ' (Electricity)'
        }
      ];

      const breakdown = FormatRolzBreakdown(mockItems);
      expect(breakdown.total).toBe(23);
      expect(breakdown.lines[0]).toBe('• Physical: 14 (7 + 7)');
      expect(breakdown.lines[1]).toBe('• Fire: 4 (4)');
      expect(breakdown.lines[2]).toBe('• Electricity: 5 (5)');
    });
  });

  describe('Integration with Character Sheets', () => {
    test('Dein should correctly parse Flaming Bow with extra fire damage', () => {
      const dein = GetCharacterByDocId(DEIN_PATH);
      expect(dein instanceof CharacterError).toBe(false);
      const char = dein as Character;

      const bow = char.weapons.find(w => w.name.includes('Flaming'));
      expect(bow).toBeDefined();
      expect(bow!.additionalDamages).toHaveLength(1);
      expect(bow!.additionalDamages[0].type).toBe('fire');
      expect(bow!.additionalDamages[0].diceOrFlat).toBe('1d6');

      // Formula should include "+ 1d6 fire"
      expect(bow!.dmgValue).toContain('+ 1d6 fire');
      expect(bow!.dmgPartString).toBe(`Damage: ${bow!.dmgValue}`);

      // Rolz message should have bracketed separation
      expect(bow!.rolzDmgRollMessage).toContain('(Physical)');
      expect(bow!.rolzDmgRollMessage).toContain('[1d6] (Fire)');

      // Full attack should also preserve additional damage
      const fullAtk = calculateNormalFullAttack(bow!, char);
      expect(fullAtk.attacks[0].dmgValue).toBe(bow!.dmgValue);
      expect(fullAtk.attacks[0].rolzDmgRollMessage).toBe(bow!.rolzDmgRollMessage);
    });

    test('Dein should correctly parse Frost Waraxe from name with extra cold damage', () => {
      const dein = GetCharacterByDocId(DEIN_PATH);
      const char = dein as Character;

      const waraxe = char.weapons.find(w => w.name.includes('Frost Waraxe'));
      expect(waraxe).toBeDefined();
      expect(waraxe!.additionalDamages).toHaveLength(1);
      expect(waraxe!.additionalDamages[0].type).toBe('cold');
      expect(waraxe!.additionalDamages[0].diceOrFlat).toBe('1d6');

      // Formula should include "+ 1d6 cold"
      expect(waraxe!.dmgValue).toContain('+ 1d6 cold');

      // Rolz message
      expect(waraxe!.rolzDmgRollMessage).toContain('(Physical)');
      expect(waraxe!.rolzDmgRollMessage).toContain('[1d6] (Cold)');
    });

    test('Bess should correctly parse Short Sword (Green Dragon Bone) with +2 poison damage', () => {
      const bess = GetCharacterByDocId(BESS_PATH);
      expect(bess instanceof CharacterError).toBe(false);
      const char = bess as Character;

      const sword = char.weapons.find(w => w.name.includes('Green Dragon Bone'));
      expect(sword).toBeDefined();
      expect(sword!.additionalDamages).toHaveLength(1);
      expect(sword!.additionalDamages[0].type).toBe('poison');
      expect(sword!.additionalDamages[0].diceOrFlat).toBe('2');

      // Formula should include "+ 2 poison"
      expect(sword!.dmgValue).toContain('+ 2 poison');

      // Rolz message
      expect(sword!.rolzDmgRollMessage).toContain('(Physical)');
      expect(sword!.rolzDmgRollMessage).toContain('[2] (Poison)');
    });
  });
});
