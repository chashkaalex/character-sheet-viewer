import * as fs from 'fs';
import * as path from 'path';
import { Character } from '../../server/character/character';
import { OnCastSpell, GetCharacterByDocId } from '../../server/character/character_manipulation';
import { scaleWeaponDamage, getIncreasedDamage, getDecreasedDamage } from '../../server/character/gear/weapons/weapons';
import { Item } from '../../server/character/gear/items/items';
import { ItemWeapon } from '../../server/character/gear/weapons/weapons';
import { CreatureSize, ModifiableProperty } from '../../server/character/00_property';
import { Sizes } from '../../server/character/_constants';
import { ICharacter } from '../../server/character/icharacter';

describe('Weapon Damage Size Scaling Tests', () => {
    describe('scaleWeaponDamage dice progression unit tests', () => {
        test('scales 1d4 (Dagger) correctly up and down', () => {
            expect(scaleWeaponDamage('1d4', 1)).toBe('1d6');
            expect(scaleWeaponDamage('1d4', 2)).toBe('1d8');
            expect(scaleWeaponDamage('1d4', -1)).toBe('1d3');
            expect(scaleWeaponDamage('1d4', -2)).toBe('1d2');
            expect(scaleWeaponDamage('1d4', 0)).toBe('1d4');
        });

        test('scales 1d6 (Shortsword, Kusarigama) correctly up and down', () => {
            expect(scaleWeaponDamage('1d6', 1)).toBe('1d8');
            expect(scaleWeaponDamage('1d6', 2)).toBe('2d6');
            expect(scaleWeaponDamage('1d6', -1)).toBe('1d4');
            expect(scaleWeaponDamage('1d6', -2)).toBe('1d3');
        });

        test('scales 1d8 (Longsword, Battleaxe, Longbow) correctly up and down', () => {
            expect(scaleWeaponDamage('1d8', 1)).toBe('2d6');
            expect(scaleWeaponDamage('1d8', 2)).toBe('3d6');
            expect(scaleWeaponDamage('1d8', -1)).toBe('1d6');
            expect(scaleWeaponDamage('1d8', -2)).toBe('1d4');
        });

        test('scales 1d10 (Dwarven Waraxe, Bastard Sword, Halberd) correctly up and down', () => {
            expect(scaleWeaponDamage('1d10', 1)).toBe('2d8');
            expect(scaleWeaponDamage('1d10', 2)).toBe('3d8');
            expect(scaleWeaponDamage('1d10', -1)).toBe('1d8');
            expect(scaleWeaponDamage('1d10', -2)).toBe('1d6');
        });

        test('scales 1d12 (Greataxe) correctly up and down', () => {
            expect(scaleWeaponDamage('1d12', 1)).toBe('3d6');
            expect(scaleWeaponDamage('1d12', 2)).toBe('4d6');
            expect(scaleWeaponDamage('1d12', -1)).toBe('1d10');
            expect(scaleWeaponDamage('1d12', -2)).toBe('1d8');
        });

        test('scales 2d4 (Falchion, Scythe, Spiked Chain) correctly up and down', () => {
            expect(scaleWeaponDamage('2d4', 1)).toBe('2d6');
            expect(scaleWeaponDamage('2d4', 2)).toBe('3d6');
            expect(scaleWeaponDamage('2d4', -1)).toBe('1d6');
            expect(scaleWeaponDamage('2d4', -2)).toBe('1d4');
        });

        test('scales 2d6 (Greatsword) correctly up and down', () => {
            expect(scaleWeaponDamage('2d6', 1)).toBe('3d6');
            expect(scaleWeaponDamage('2d6', 2)).toBe('4d6');
            expect(scaleWeaponDamage('2d6', -1)).toBe('1d8');
            expect(scaleWeaponDamage('2d6', -2)).toBe('1d6');
        });

        test('scales double weapons (1d8/1d8) on each head', () => {
            expect(scaleWeaponDamage('1d8/1d8', 1)).toBe('2d6/2d6');
            expect(scaleWeaponDamage('1d8/1d8', -1)).toBe('1d6/1d6');
        });
    });

    describe('ItemWeapon dynamic recalculation on size changes', () => {
        test('scales damage when character size changes and reverts cleanly without compounding', () => {
            const size = new CreatureSize(Sizes['Medium']);
            const mockCharacter = {
                size,
                bab: { currentScore: 5 },
                abilities: {
                    Str: { modifier: 3, ModifierString: '+3 Str modifier' },
                    Dex: { modifier: 2, ModifierString: '+2 Dex modifier' }
                },
                damageBonus: new ModifiableProperty(0),
                HasFeat: () => false
            } as unknown as ICharacter;

            const longswordItem = new Item('Longsword', 1, '');
            const weapon = new ItemWeapon(longswordItem, mockCharacter);

            // Base size: Medium (sizeStep 0)
            expect(weapon.baseDamage).toBe('1d8');
            expect(weapon.damage).toBe('1d8');
            expect(weapon.dmgValue).toBe('1d8 + 3');

            // Size changes to Large (sizeStep +1)
            size.currentSize = Sizes['Large'];
            weapon.calculateWeaponStats(mockCharacter);
            weapon.calculateBonuses(mockCharacter);

            expect(weapon.damage).toBe('2d6');
            expect(weapon.dmgValue).toBe('2d6 + 3');

            // Re-evaluating while still Large must NOT compound to 3d6
            weapon.calculateWeaponStats(mockCharacter);
            weapon.calculateBonuses(mockCharacter);
            expect(weapon.damage).toBe('2d6');

            // Size changes to Huge (sizeStep +2)
            size.currentSize = Sizes['Huge'];
            weapon.calculateWeaponStats(mockCharacter);
            weapon.calculateBonuses(mockCharacter);
            expect(weapon.damage).toBe('3d6');
            expect(weapon.dmgValue).toBe('3d6 + 3');

            // Size reverts back to Medium (sizeStep 0)
            size.currentSize = Sizes['Medium'];
            weapon.calculateWeaponStats(mockCharacter);
            weapon.calculateBonuses(mockCharacter);
            expect(weapon.damage).toBe('1d8');
            expect(weapon.dmgValue).toBe('1d8 + 3');
        });
    });

    describe('Integration with Enlarge Person on character sheets', () => {
        const TEMP_THROR_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_thror_weapon_size_test.txt');
        const SOURCE_THROR_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

        beforeEach(() => {
            if (fs.existsSync(TEMP_THROR_FILE_PATH)) {
                fs.unlinkSync(TEMP_THROR_FILE_PATH);
            }
            if (!fs.existsSync(path.dirname(TEMP_THROR_FILE_PATH))) {
                fs.mkdirSync(path.dirname(TEMP_THROR_FILE_PATH), { recursive: true });
            }
            fs.copyFileSync(SOURCE_THROR_FILE_PATH, TEMP_THROR_FILE_PATH);
        });

        afterAll(() => {
            if (fs.existsSync(TEMP_THROR_FILE_PATH)) {
                fs.unlinkSync(TEMP_THROR_FILE_PATH);
            }
        });

        it('should scale Kusarigama from 1d6 to 1d8 and Unarmed from 2d10 to 4d8 when Thror casts Enlarge Person', () => {
            // Normal size before Enlarge Person
            const beforeChar = new Character(fs.readFileSync(TEMP_THROR_FILE_PATH, 'utf8').split('\n'));
            beforeChar.ParseCharacter();

            const unarmedBefore = beforeChar.weapons.find(w => w.baseName === 'Unarmed');
            expect(unarmedBefore).toBeDefined();
            expect(unarmedBefore!.damage).toBe('2d10');

            const kusarigamaBefore = beforeChar.weapons.find(w => w.name.includes('Kusarigama'));
            expect(kusarigamaBefore).toBeDefined();
            expect(kusarigamaBefore!.damage).toBe('1d6');

            // Cast Enlarge Person on Thror
            const slotData = {
                casterClassName: 'Cleric',
                spellLevel: '1 - domain',
                spellName: 'Enlarge Person',
                slotIndex: 0,
                isUsed: false,
                isEmpty: false
            };

            const result = OnCastSpell(TEMP_THROR_FILE_PATH, slotData);
            expect(typeof result).not.toBe('string');
            const charRep = result as any;

            // Verify size is Large
            expect(charRep.statuses.some((s: any) => s.name === 'Enlarge Person')).toBe(true);

            // Verify Unarmed damage scaled to 4d8
            const unarmedAfter = charRep.weapons.find((w: any) => w.name === 'Unarmed');
            expect(unarmedAfter).toBeDefined();
            expect(unarmedAfter.dmgValue).toContain('4d8');

            // Verify Kusarigama scaled from 1d6 to 1d8
            const kusarigamaAfter = charRep.weapons.find((w: any) => w.name.includes('Kusarigama'));
            expect(kusarigamaAfter).toBeDefined();
            expect(kusarigamaAfter.dmgValue).toContain('1d8');
            expect(kusarigamaAfter.statsString).toContain('1d8');
        });
    });
});
