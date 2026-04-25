import { Character } from '../server/character/character';

describe('Comprehensive Unarmed Damage Scaling', () => {

    function getUnarmedDamage(lines: string[]) {
        const char = new Character(lines);
        char.ParseCharacter();
        const unarmed = char.weapons.find(w => w.baseName === 'Unarmed');
        return unarmed ? unarmed.damage : null;
    }

    const testCases = [
        {
            name: 'Generic Non-Monk (Level 5)',
            lines: [
                'Mock Fighter',
                'Human Fighter 5',
                'Hp 45 Speed 30',
                'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)'
            ],
            expected: '1d3'
        },
        {
            name: 'Non-Monk with Improved Natural Attack (Level 5)',
            lines: [
                'Mock Fighter',
                'Human Fighter 5',
                'Hp 45 Speed 30',
                'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)',
                'Feats:',
                'Improved Natural Attack'
            ],
            expected: '1d4'
        },
        {
            name: 'Non-Monk with Superior Unarmed Strike (Level 5)', // 3-7 interval -> baseKey 0 -> 1d4
            lines: [
                'Mock Fighter',
                'Human Fighter 5',
                'Hp 45 Speed 30',
                'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)',
                'Feats:',
                'Superior Unarmed Strike'
            ],
            expected: '1d4'
        },
        {
            name: 'Non-Monk with SUS and INA (Level 5)', // baseKey 0 + 1 (INA) -> 1 -> 1d6
            lines: [
                'Mock Fighter',
                'Human Fighter 5',
                'Hp 45 Speed 30',
                'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)',
                'Feats:',
                'Superior Unarmed Strike',
                'Improved Natural Attack'
            ],
            expected: '1d6'
        },
        {
            name: 'Non-Monk with SUS and INA (Level 20)', // Level 20: 20 -> baseKey 4. INA +1 -> baseKey 5 -> 2d8
            lines: [
                'Mock Fighter',
                'Human Fighter 20',
                'Hp 45 Speed 30',
                'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)',
                'Feats:',
                'Superior Unarmed Strike',
                'Improved Natural Attack'
            ],
            expected: '2d8'
        },
        {
            name: 'Monk 5, No feats', // Level 5 -> baseKey 1 -> 1d8
            lines: [
                'Mock Monk',
                'Human Monk 5',
                'Hp 45 Speed 30',
                'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)'
            ],
            expected: '1d8'
        },
        {
            name: 'Monk 5 with INA', // Level 5 -> baseKey 1. INA +1 -> baseKey 2 -> 1d10
            lines: [
                'Mock Monk',
                'Human Monk 5',
                'Hp 45 Speed 30',
                'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)',
                'Feats:',
                'Improved Natural Attack'
            ],
            expected: '1d10'
        },
        {
            name: 'Monk 5 with SUS', // Level 5 + 4 = 9 -> baseKey 2 -> 1d10
            lines: [
                'Mock Monk',
                'Human Monk 5',
                'Hp 45 Speed 30',
                'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)',
                'Feats:',
                'Superior Unarmed Strike'
            ],
            expected: '1d10'
        },
        {
            name: 'Monk 5 with SUS and INA', // Level 5 + 4 = 9 -> baseKey 2. INA +1 -> baseKey 3 -> 2d6
            lines: [
                'Mock Monk',
                'Human Monk 5',
                'Hp 45 Speed 30',
                'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)',
                'Feats:',
                'Superior Unarmed Strike',
                'Improved Natural Attack'
            ],
            expected: '2d6'
        },
        {
            name: 'Max Level Monk 20 with SUS and INA', // Level 20 + 4 = 24 -> baseKey 5. INA +1 -> baseKey 6 -> 4d8
            lines: [
                'Mock Monk',
                'Human Monk 20',
                'Hp 45 Speed 30',
                'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)',
                'Feats:',
                'Superior Unarmed Strike',
                'Improved Natural Attack'
            ],
            expected: '4d8'
        }
    ];

    testCases.forEach((testCase) => {
        it(`Calculates correct unarmed damage for ${testCase.name}`, () => {
            const result = getUnarmedDamage(testCase.lines);
            expect(result).toBe(testCase.expected);
        });
    });
});
