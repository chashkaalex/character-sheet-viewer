import { convertToRounds } from '../../client/ts/dashboard_script';
import { formatRoundsToReadable } from '../../client/ts/character_script';
import { ParseSkills } from '../../server/character/properties/skills';
import { Ability } from '../../server/character/properties/abilities/ability';
import { AbilitiesMap } from '../../server/character/properties/abilities/ability_types';
import { StaticPropertyEffect } from '../../server/character/state/effects';
import { Character } from '../../server/character/character';
import { getCharacterRep } from '../../server/character/character_rep';

function createTestAbilities(): AbilitiesMap {
    return {
        Str: new Ability(10, 'Str'),
        Dex: new Ability(10, 'Dex'),
        Con: new Ability(10, 'Con'),
        Int: new Ability(10, 'Int'),
        Wis: new Ability(10, 'Wis'),
        Cha: new Ability(10, 'Cha')
    };
}

function buildMinimalSheet(overrides: {
    battleGear?: string[];
    statuses?: string[];
    skills?: string[];
    feats?: string[];
}): string[] {
    return [
        'TestHero',
        'Human Fighter 1',
        'Attack: +1',
        'Hp: 10/10 Speed: 30',
        'Str: 14',
        'Dex: 12',
        'Con: 12',
        'Int: 10',
        'Wis: 10',
        'Cha: 10',
        'Statuses',
        ...(overrides.statuses || []),
        'Feats',
        ...(overrides.feats || []),
        'Special Abilities',
        'Racial Traits',
        'Bonus Abilities',
        'Skills',
        ...(overrides.skills || ['Diplomacy (Cha) 4', 'Bluff (Cha) 3']),
        'Battle Gear',
        ...(overrides.battleGear || ['Longsword']),
        'Possessions',
        'Personal Information'
    ];
}

describe('P0 D&D 3.5 Rules & Design Correctness Tests', () => {
    describe('1. Time Conversion (D&D 3.5: 1 round = 6s, 10 rounds = 1 min, 600 rounds = 1 hour)', () => {
        test('convertToRounds should convert minutes and hours using 10 rounds/min and 600 rounds/hour', () => {
            expect(convertToRounds(1, 'rounds')).toBe(1);
            expect(convertToRounds(1, 'minutes')).toBe(10);
            expect(convertToRounds(5, 'minutes')).toBe(50);
            expect(convertToRounds(1, 'hours')).toBe(600);
            expect(convertToRounds(2, 'hours')).toBe(1200);
        });

        test('formatRoundsToReadable should format 10 rounds as 1 minute and 600 rounds as 1 hour', () => {
            expect(formatRoundsToReadable(1)).toBe('1 round');
            expect(formatRoundsToReadable(9)).toBe('9 rounds');
            expect(formatRoundsToReadable(10)).toBe('1 minute');
            expect(formatRoundsToReadable(15)).toBe('1 min, 5 rounds');
            expect(formatRoundsToReadable(600)).toBe('1 hour');
            expect(formatRoundsToReadable(615)).toBe('1 hour, 1 min, 5 rounds');
        });
    });

    describe('2. Skill Synergy (D&D 3.5 SRD: requires 5 base ranks, not temporary/feat bonuses)', () => {
        test('synergy bonus should NOT activate when a synergy skill has < 5 base ranks but >= 5 currentScore via effects', () => {
            const abilities = createTestAbilities();
            const skills = ParseSkills(['Diplomacy (Cha) 4', 'Bluff (Cha) 3'], abilities);
            const diplomacy = skills.find(s => s.name === 'Diplomacy')!;
            const bluff = skills.find(s => s.name === 'Bluff')!;

            // Apply a +2 bonus to Bluff (e.g. from Persuasive feat), raising Bluff currentScore to 5 while base rank (score) is 3
            bluff.applyEffect(new StaticPropertyEffect({
                status: 'Persuasive',
                property: 'Bluff',
                modifierType: 'Generic',
                value: 2
            }));

            expect(bluff.score).toBe(3);
            expect(bluff.currentScore).toBe(5);
            // Diplomacy has 4 base ranks + 0 Cha mod = 4 (no synergy from 3 ranks of Bluff)
            expect(diplomacy.bonus).toBe(4);
        });

        test('Skill.string should NOT display "+2 <skill> synergy" when the synergy skill has < 5 base ranks', () => {
            const abilities = createTestAbilities();
            const skills = ParseSkills(['Diplomacy (Cha) 4', 'Bluff (Cha) 2'], abilities);
            const diplomacy = skills.find(s => s.name === 'Diplomacy')!;

            expect(diplomacy.bonus).toBe(4);
            expect(diplomacy.string).not.toContain('Bluff synergy');
        });
    });

    describe('3. ItemEffects Modifier Types (D&D 3.5 Stacking Rules)', () => {
        test('Cloak of Resistance should use Resistance modifierType and NOT stack with Resistance spell', () => {
            const lines = buildMinimalSheet({
                battleGear: ['Cloak of Resistance +2'],
                statuses: ['Resistance: 1 rounds/10 rounds']
            });
            const character = new Character(lines);
            character.ParseCharacter();

            // Fighter 1 base Will = 0, Wis 10 (+0). Cloak of Resistance +2 (+2 Resistance) + Resistance spell (+1 Resistance) -> +2 total, NOT +3
            expect(character.saves.Will.bonus).toBe(2);
        });

        test('Buckler should use Shield modifierType and stack with Armor', () => {
            const lines = buildMinimalSheet({
                battleGear: ['Full Plate +1', 'Buckler']
            });
            const character = new Character(lines);
            character.ParseCharacter();

            // Base 10 + Dex (+1) + Full Plate +1 (+9 Armor) + Buckler (+1 Shield) = 21 AC
            expect(character.ac.currentArmorClass).toBe(21);
        });
    });

    describe('4. Weapon Dynamic Stat Strings After Post-Parse/Late Effects', () => {
        test('weapon atkValue, dmgValue, statsString, and rolzDmgRollMessage should stay in sync when character BAB or Str changes', () => {
            const lines = buildMinimalSheet({
                battleGear: ['Longsword']
            });
            const character = new Character(lines);
            character.ParseCharacter();

            // Initial: Fighter 1 (BAB +1), Str 14 (+2) => Attack +3, Damage 1d8 + 2
            const sword = character.weapons.find(w => w.name === 'Longsword')!;
            expect(sword.atkValue).toBe('3');
            expect(sword.dmgValue).toBe('1d8 + 2');

            // Apply a late effect (e.g. Bull's Strength +4 Str => +2 Str mod)
            character.abilities.Str.applyEffect(new StaticPropertyEffect({
                status: 'Bull\'s Strength',
                property: 'Str',
                modifierType: 'Enhancement',
                value: 4
            }));

            expect(sword.attackBonus.bonus).toBe(5);
            expect(sword.damageBonus.bonus).toBe(4);
            expect(sword.atkValue).toBe('5');
            expect(sword.dmgValue).toBe('1d8 + 4');
            expect(sword.statsString).toContain('Attack: 5');
            expect(sword.statsString).toContain('Damage: 1d8 + 4');
            expect(sword.rolzDmgRollMessage).toContain('1d8+4');

            const rep = getCharacterRep(character);
            const repSword = rep.weapons.find((w: any) => w.name === 'Longsword');
            expect(repSword.atkValue).toBe('5');
            expect(repSword.dmgValue).toBe('1d8 + 4');
        });
    });
});

