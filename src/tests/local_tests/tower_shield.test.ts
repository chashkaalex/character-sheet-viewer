import * as path from 'path';
import { Armor } from '../../server/character/gear/items/items';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { Character } from '../../server/character/character';
import { SpecialAttackBonus } from '../../server/character/00_property';

describe('Tower Shield Attack Penalty Tests', () => {
    const DEIN_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'dein_test.txt');

    describe('Armor constructor attack penalty parsing', () => {
        test('defaults to -2 attack penalty for Tower Shield base name', () => {
            const towerShield = new Armor('Tower Shield', 1, '');
            expect(towerShield.attackPenalty).toBe(-2);
            const babEffect = towerShield.effects.find(e => 'property' in e && e.property === 'bab');
            expect(babEffect).toBeDefined();
            expect((babEffect as any).value).toBe(-2);
        });

        test('parses explicit attack penalty from description', () => {
            const customShield = new Armor('Tower Shield +1', 1, '+5 AC, -2 atk, -9 penalty');
            expect(customShield.attackPenalty).toBe(-2);
            const babEffect = customShield.effects.find(e => 'property' in e && e.property === 'bab');
            expect(babEffect).toBeDefined();
            expect((babEffect as any).value).toBe(-2);
        });

        test('does not apply attack penalty for non-tower shields', () => {
            const heavyShield = new Armor('Heavy Shield', 1, '');
            expect(heavyShield.attackPenalty).toBe(0);
            const babEffect = heavyShield.effects.find(e => 'property' in e && e.property === 'bab');
            expect(babEffect).toBeUndefined();

            const buckler = new Armor('Buckler', 1, '');
            expect(buckler.attackPenalty).toBe(0);
            expect(buckler.effects.find(e => 'property' in e && e.property === 'bab')).toBeUndefined();
        });
    });

    describe('Dein character integration with Tower Shield equipped', () => {
        test('applies -2 attack penalty to BAB, weapon attack bonuses, and Grapple checks', () => {
            const char = GetCharacterByDocId(DEIN_TEST_FILE) as Character;
            expect(char.parseSuccess).toBe(true);

            // Verify Tower Shield is equipped in Battle Gear
            const shield = char.battleGear.find(i => i.name.toLowerCase().includes('tower shield'));
            expect(shield).toBeDefined();

            // Dein base BAB from classes is 9 (Fighter 8 = 8, Monk 2 = 1).
            // With Tower Shield -2 attack penalty, BAB currentScore is 7.
            expect(char.bab.currentScore).toBe(7);

            // Unarmed attack bonus: BAB (7) + Str (6) = 13 (matches Dein's sheet: "+13 Unarmed")
            const unarmed = char.weapons.find(w => w.baseName === 'Unarmed');
            expect(unarmed).toBeDefined();
            expect(unarmed!.attackBonus.bonus).toBe(13);

            // Frost Waraxe +1 attack bonus: BAB (7) + Str (6) + Enhancement (1) = 14
            const waraxe = char.weapons.find(w => w.name.includes('Frost Waraxe'));
            expect(waraxe).toBeDefined();
            expect(waraxe!.attackBonus.bonus).toBe(14);
            expect(waraxe!.statsString).toBe('Attack: 14 Damage: 1d10 + 9 Crit. X3');

            // Composite Longbow attack bonus: BAB (7) + Dex (1) + Enhancement (1) = 9
            const bow = char.weapons.find(w => w.baseName === 'Composite Longbow');
            expect(bow).toBeDefined();
            expect(bow!.attackBonus.bonus).toBe(9);
            expect(bow!.statsString).toBe('Attack: 9 Damage: 1d8 + 6 Crit. X3');

            // Dagger attack bonus: BAB (7) + Str (6) = 13
            const dagger = char.weapons.find(w => w.baseName === 'Dagger');
            expect(dagger).toBeDefined();
            expect(dagger!.attackBonus.bonus).toBe(13);

            // Grapple check: BAB (7) + Str (6) + Size (0) + Improved Grapple (4) + Shield Ward (1) = 18
            const grapple = char.specialAttacks['Grapple'] as SpecialAttackBonus;
            expect(grapple).toBeDefined();
            expect(grapple.bonus).toBe(18);
        });
    });

    describe('Tower Shield in Possessions does not apply penalty', () => {
        test('does not apply attack penalty when Tower Shield is only in possessions', () => {
            const lines = [
                'ShieldBearer',
                'A warrior with a shield in backpack',
                '',
                '(Human Fighter 1)',
                '',
                'Init: +0; Senses: Listen +0, Spot +0;',
                'BAb: +1; Grapple: +1; Hp: 10/10; Speed: 30 ft.',
                'Attack: +1 Longsword',
                'AC: 10, Touch, Flat-footed',
                'Resistance: none',
                'Saves: Fort +2; Ref +0; Will +0.',
                'Str: 10 (+0)',
                'Dex: 10 (+0)',
                'Con: 10 (+0)',
                'Int: 10 (+0)',
                'Wis: 10 (+0)',
                'Cha: 10 (+0)',
                'Action Points: 0',
                '',
                'Statuses:',
                '',
                'Feats:',
                '',
                'Special Abilities:',
                '',
                'Racial Traits:',
                '',
                'Bonus Abilities:',
                '',
                'Skills:',
                '',
                'Personal Information:',
                'Age: 30',
                '',
                'Battle Gear:',
                '',
                'Possessions:',
                'Tower Shield (Weight: 45 lb)'
            ];

            const char = new Character(lines);
            char.ParseCharacter();
            expect(char.parseSuccess).toBe(true);

            // Fighter 1 base BAB = 1; shield in possessions should NOT reduce BAB
            expect(char.bab.currentScore).toBe(1);
        });
    });
});
