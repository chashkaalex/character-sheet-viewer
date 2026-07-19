import * as path from 'path';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { Character } from '../../server/character/character';
import { Weapon } from '../../server/character/gear/weapons/weapons';
import { ICharacter } from '../../server/character/icharacter';
import { ModifiableProperty, CreatureSize } from '../../server/character/00_property';
import { Sizes } from '../../server/character/_constants';

const THRORS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

describe('Weapon Enhancement Parsing', () => {
    test('should parse Thror\'s Kusarigama without giving it a +2 enhancement bonus', () => {
        const char = GetCharacterByDocId(THRORS_TEST_FILE) as Character;
        expect(char.parseSuccess).toBe(true);

        const kusarigama = char.weapons.find(w => w.name.includes('Kusarigama'));
        expect(kusarigama).toBeDefined();
        // Kusarigama (+2 to Trip and Disarm, +5 ft. reach) should have 0 enhancement bonus
        expect(kusarigama!.enhancement).toBe(0);
    });

    test('should correctly parse enhancement bonuses for different weapon configurations', () => {
        // Create a mock ICharacter
        const mockCharacter = {
            bab: new ModifiableProperty(5),
            size: new CreatureSize(Sizes['Medium']),
            abilities: {
                Str: { modifier: 3, ModifierString: '3 Str modifier' },
                Dex: { modifier: 4, ModifierString: '4 Dex modifier' }
            },
            damageBonus: new ModifiableProperty(0),
            HasFeat: (feat: string) => false
        } as unknown as ICharacter;

        // Test cases: name, description, expected enhancement
        const testCases = [
            { name: 'Kusarigama', desc: '+2 to Trip and Disarm, +5 ft. reach', expected: 0 },
            { name: 'Frost Waraxe +1 (Dwarvencraft)', desc: '+1, 1d10 /X3', expected: 1 },
            { name: 'Flaming +1 Composite Longbow +5 Str', desc: '+1 1d8+1d6{fire} /X3', expected: 1 },
            { name: 'Composite Longbow +5 Str', desc: '', expected: 0 },
            { name: 'Deadly Precision Wingblade Elvencraft Rapier +1', desc: '+1Atk 1d8+1/18-20x3', expected: 1 },
            { name: 'Gauntlet', desc: '1d3', expected: 0 },
            { name: 'Spiked Chain', desc: '+2 to Trip', expected: 0 },
            { name: '+3 Longsword', desc: '', expected: 3 },
            { name: 'Longsword +2', desc: '', expected: 2 },
            { name: 'Dagger', desc: '+1', expected: 1 }
        ];

        for (const tc of testCases) {
            const weapon = new Weapon(tc.name, tc.desc, 1, mockCharacter);
            expect(weapon.enhancement).toBe(tc.expected);
        }
    });
});
