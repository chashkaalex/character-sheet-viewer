import { ICharacter } from '../../server/character/icharacter';
import { ModifiableProperty, SpecialAttackBonus, CreatureSize } from '../../server/character/00_property';
import { ArmorClass } from '../../server/character/properties/armorClass';
import { Ability } from '../../server/character/properties/abilities/ability';
import { Sizes } from '../../server/character/_constants';
import { EffectFactory, StaticPropertyEffect } from '../../server/character/state/effects';
import { FeatEffects, GetShieldBonus } from '../../server/character/properties/feats/feats_effects';
import { Character } from '../../server/character/character';

describe('Shield Ward Feat', () => {
    test('GetShieldBonus returns active shield bonus from AC effects', () => {
        const mockCharacter = {
            ac: new ModifiableProperty(10)
        } as unknown as ICharacter;

        // No shield effects
        expect(GetShieldBonus(mockCharacter)).toBe(0);

        // Add a shield effect
        mockCharacter.ac.applyEffect(new StaticPropertyEffect({
            status: 'Heavy Shield',
            property: 'ac',
            modifierType: 'Shield',
            value: 2
        }));
        expect(GetShieldBonus(mockCharacter)).toBe(2);

        // Add Shield Specialization
        mockCharacter.ac.applyEffect(new StaticPropertyEffect({
            status: 'Shield Specialization (Tower)',
            property: 'ac',
            modifierType: 'Generic',
            value: 1
        }));
        expect(GetShieldBonus(mockCharacter)).toBe(3);
    });

    test('Shield Ward applies shield bonus to Touch AC and opposes combat maneuvers', () => {
        const dex = new Ability(14, 'Dex');
        const str = new Ability(18, 'Str');
        const size = new CreatureSize(Sizes['Medium']);
        const ac = new ArmorClass([dex], size);

        const bullRush = new ModifiableProperty(0, 'Bull rush');
        const disarm = new ModifiableProperty(0, 'Disarm');
        const grapple = new SpecialAttackBonus(str, size, 'Grapple');
        const overrun = new ModifiableProperty(0, 'Overrun');
        const trip = new SpecialAttackBonus(str, size, 'Trip');

        const properties: Record<string, any> = {
            ac,
            'Bull rush': bullRush,
            'Disarm': disarm,
            'Grapple': grapple,
            'Overrun': overrun,
            'Trip': trip
        };

        const mockCharacter = {
            ac,
            battleGear: [],
            feats: [],
            parseWarnings: [],
            GetNamedProperty: (propName: string) => properties[propName] || null
        } as unknown as ICharacter;

        // Equip a +2 Tower Shield (base 4 + 2 = 6)
        ac.applyEffect(new StaticPropertyEffect({
            status: 'Tower Shield +2',
            property: 'ac',
            modifierType: 'Shield',
            value: 6
        }));

        // Before Shield Ward:
        // Regular AC: 10 + 2 Dex + 6 Shield = 18
        // Touch AC: 10 + 2 Dex = 12 (Shield excluded)
        expect(ac.currentArmorClass).toBe(18);
        expect(ac.touchArmorClass).toBe(12);
        expect(ac.touchString).not.toContain('Tower Shield +2');

        // Apply Shield Ward feat
        const featEffects = FeatEffects['Shield Ward'];
        expect(featEffects).toBeDefined();

        featEffects.forEach(effect => {
            EffectFactory(effect).ApplyEffect(mockCharacter);
        });

        // After Shield Ward:
        // Touch AC: 10 + 2 Dex + 6 Shield = 18
        expect(ac.applyShieldToTouch).toBe(true);
        expect(ac.touchArmorClass).toBe(18);
        expect(ac.touchString).toContain('+6 (Tower Shield +2)');

        // Opposed checks / combat maneuvers should all receive the +6 shield bonus
        expect(bullRush.currentScore).toBe(6);
        expect(bullRush.EffectsString).toContain('+6 (Shield Ward)');

        expect(disarm.currentScore).toBe(6);
        expect(disarm.EffectsString).toContain('+6 (Shield Ward)');

        // Grapple: 4 Str + 0 Size + 6 Shield = 10
        expect(grapple.bonus).toBe(10);
        expect(grapple.EffectsString).toContain('+6 (Shield Ward)');

        expect(overrun.currentScore).toBe(6);
        expect(overrun.EffectsString).toContain('+6 (Shield Ward)');

        // Trip: 4 Str + 0 Size + 6 Shield = 10
        expect(trip.bonus).toBe(10);
        expect(trip.EffectsString).toContain('+6 (Shield Ward)');
    });

    test('Shield Ward with no shield provides 0 bonus without errors', () => {
        const dex = new Ability(12, 'Dex');
        const str = new Ability(14, 'Str');
        const size = new CreatureSize(Sizes['Medium']);
        const ac = new ArmorClass([dex], size);

        const bullRush = new ModifiableProperty(0, 'Bull rush');
        const disarm = new ModifiableProperty(0, 'Disarm');
        const grapple = new SpecialAttackBonus(str, size, 'Grapple');
        const overrun = new ModifiableProperty(0, 'Overrun');
        const trip = new SpecialAttackBonus(str, size, 'Trip');

        const properties: Record<string, any> = {
            ac,
            'Bull rush': bullRush,
            'Disarm': disarm,
            'Grapple': grapple,
            'Overrun': overrun,
            'Trip': trip
        };

        const mockCharacter = {
            ac,
            battleGear: [],
            feats: [],
            parseWarnings: [],
            GetNamedProperty: (propName: string) => properties[propName] || null
        } as unknown as ICharacter;

        // Apply Shield Ward feat without a shield
        const featEffects = FeatEffects['Shield Ward'];
        featEffects.forEach(effect => {
            EffectFactory(effect).ApplyEffect(mockCharacter);
        });

        // Touch AC: 10 + 1 Dex = 11
        expect(ac.touchArmorClass).toBe(11);
        expect(bullRush.currentScore).toBe(0);
        expect(disarm.currentScore).toBe(0);
        expect(grapple.bonus).toBe(2); // 2 Str
        expect(overrun.currentScore).toBe(0);
        expect(trip.bonus).toBe(2); // 2 Str
    });

    test('Full Character parsing applies Shield Ward to Touch AC and special attacks', () => {
        const lines = [
            'Shield Hero',
            'A mighty shield warrior',
            '',
            '(Human Fighter 1)',
            '',
            'Init: +1; Senses: Listen +0, Spot +0;',
            'BAb: +1; Grapple: +4; Hp: 12/12; Speed: 30 ft.',
            'Attack: +4 Longsword (1d8+3/19-20)',
            'AC: 17 (10 +1 Dex +4 Armor +2 Shield), Touch, Flat-footed',
            'Resistance: none',
            'Saves: Fort +4; Ref +1; Will +0.',
            'Str: 16 (+3)',
            'Dex: 12 (+1)',
            'Con: 14 (+2)',
            'Int: 10 (0)',
            'Wis: 10 (0)',
            'Cha: 10 (0)',
            'Action Points: 0',
            '',
            'Statuses:',
            '',
            'Feats:',
            'Shield Ward',
            '',
            'Special Abilities:',
            '',
            'Racial Traits:',
            '',
            'Bonus Abilities:',
            '',
            'Skills:',
            'Jump (Str): 2',
            '',
            'Personal Information:',
            'Age: 25',
            '',
            'Battle Gear:',
            'Tower Shield made from Blue Dragon Hide +2 (Weight: 50 lb),',
            'Glamour Studded Leather Armor +1 (Weight: 20 lb)',
            '',
            'Possessions:',
            ''
        ];

        const char = new Character(lines);
        char.ParseCharacter();
        expect(char.parseSuccess).toBe(true);

        // Check that Shield Ward is parsed and recognized
        expect(char.HasFeat('Shield Ward')).toBe(true);

        // Tower shield gives +6 shield bonus, Glamour Studded Leather gives +4 armor
        expect(char.ac.currentArmorClass).toBe(21); // 10 + 1 Dex + 4 Armor + 6 Shield
        // Touch AC normally 11 (10 + 1 Dex). With Shield Ward (+6 shield): Touch AC is 17!
        expect(char.ac.touchArmorClass).toBe(17);
        expect(char.ac.touchString).toContain('+6 (Tower Shield made from Blue Dragon Hide +2)');

        // Check special attacks receive the +6 shield bonus
        expect(char.specialAttacks['Bull rush'].currentScore).toBe(6);
        expect(char.specialAttacks['Disarm'].currentScore).toBe(6);
        expect((char.specialAttacks['Grapple'] as SpecialAttackBonus).bonus).toBe(1 + 3 + 0 + 6); // BAB(1) + Str(3) + Size(0) + Shield(6) = 10
        expect(char.specialAttacks['Overrun'].currentScore).toBe(6);
        expect((char.specialAttacks['Trip'] as SpecialAttackBonus).bonus).toBe(3 + 0 + 6); // Str(3) + Size(0) + Shield(6) = 9
    });
});
