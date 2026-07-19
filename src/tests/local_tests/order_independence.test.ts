import { Character } from '../../server/character/character';
import { EffectFactory } from '../../server/character/state/effects';
import { setPropertyRegistry } from '../../server/character/00_property';

describe('Order-Independent Effect Application', () => {
    test('should apply pending effects when property is registered late', () => {
        const lines = [
            'Test Character',
            'Some description',
            '',
            '(Human Fighter 1)',
            '',
            'Init: +0; Senses: Listen +0, Spot +0;',
            'BAb: +1; Grapple: +1; Hp: 10/10; Speed: 30 ft.',
            'Attack: +1 Longsword ()',
            'AC: 10 (10), Touch, Flat-footed',
            'Resistance: none',
            'Saves: Fort +2; Ref +0; Will +0.',
            'Str: 10 (0)',
            'Dex: 10 (0)',
            'Con: 10 (0)',
            'Int: 10 (0)',
            'Wis: 10 (0)',
            'Cha: 10 (0)',
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
            'Perform (dance) (Cha): 2',
            '',
            'Personal Information:',
            'Age: 25',
            '',
            'Battle Gear:',
            ''
        ];

        const character = new Character(lines);

        // 1. Manually queue some effects before parsing starts
        setPropertyRegistry(character);
        try {
            // Queue an effect on 'Fort' (which isn't initialized yet since ParseCharacter hasn't run)
            const fortEffect = EffectFactory({
                status: 'TestFortBuff',
                property: 'Fort',
                modifierType: 'Generic',
                value: 3
            });
            fortEffect.ApplyEffect(character);

            // Queue a skill prefix effect on 'Perform'
            const performEffect = EffectFactory({
                status: 'TestPerformBuff',
                property: 'Perform',
                modifierType: 'Generic',
                value: 4
            });
            performEffect.ApplyEffect(character);

            // Queue an untrained/unparsed skill effect on 'Swim'
            const swimEffect = EffectFactory({
                status: 'TestSwimBuff',
                property: 'Swim',
                modifierType: 'Generic',
                value: 5
            });
            swimEffect.ApplyEffect(character);

            // Queue a dynamic special attack effect on 'Bullrush'
            const bullrushEffect = EffectFactory({
                status: 'TestBullrushBuff',
                property: 'Bullrush',
                modifierType: 'Generic',
                value: 2
            });
            bullrushEffect.ApplyEffect(character);
        } finally {
            setPropertyRegistry(null);
        }

        // 2. Now run the actual parsing which will construct properties and trigger registration
        character.ParseCharacter();

        // 3. Verify Fort received the +3 bonus
        expect(character.saves.Fort.currentScore).toBe(2 + 3); // Base 2 + 3 buff

        // 4. Verify Perform (dance) skill received the +4 bonus
        const performSkill = character.skills.find(s => s.name === 'Perform (dance)');
        expect(performSkill).toBeDefined();
        expect(performSkill!.currentScore).toBe(2 + 4); // 2 ranks + 4 buff

        // 5. Verify untrained Swim skill was lazily created and received the +5 bonus
        const swimSkill = character.skills.find(s => s.name === 'Swim');
        expect(swimSkill).toBeDefined();
        expect(swimSkill!.currentScore).toBe(0 + 5); // 0 ranks + 5 buff

        // 6. Verify custom dynamic property 'Bullrush' was lazily created and received the +2 bonus
        const bullrushProp = character.GetNamedProperty('Bullrush');
        expect(bullrushProp).toBeDefined();
        expect(bullrushProp.currentScore).toBe(0 + 2); // Base 0 + 2 buff
        expect(character.parseWarnings).not.toContain('Property Bullrush not found');
    });

    test('should apply weapon feats regardless of parsing order', () => {
        const lines = [
            'Test Character',
            'Some description',
            '',
            '(Human Fighter 1)',
            '',
            'Init: +0; Senses: Listen +0, Spot +0;',
            'BAb: +1; Grapple: +1; Hp: 10/10; Speed: 30 ft.',
            'Attack: +1 Dwarven Waraxe ()',
            'AC: 10 (10), Touch, Flat-footed',
            'Resistance: none',
            'Saves: Fort +2; Ref +0; Will +0.',
            'Str: 10 (0)',
            'Dex: 10 (0)',
            'Con: 10 (0)',
            'Int: 10 (0)',
            'Wis: 10 (0)',
            'Cha: 10 (0)',
            'Action Points: 0',
            '',
            'Statuses:',
            '',
            'Feats:',
            'Weapon Focus (Dwarven Waraxe)',
            'Weapon Specialization (Dwarven Waraxe)',
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
            'Age: 25',
            '',
            'Battle Gear:',
            'Dwarven Waraxe (Weight: 6 lbs.)',
            ''
        ];

        const character = new Character(lines);
        character.ParseCharacter();

        expect(character.parseSuccess).toBe(true);

        const waraxe = character.weapons.find(w => w.name.includes('Dwarven Waraxe'));
        expect(waraxe).toBeDefined();
        expect(waraxe!.featAttackBonus.currentScore).toBe(1);
        expect(waraxe!.featDamageBonus.currentScore).toBe(2);
    });
});
