import { Character } from '../../server/character/character';

describe('Hair Shirt of Suffering', () => {
    test('should correctly parse Hair Shirt of Suffering and apply its effects when starting at max HP', () => {
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
            '',
            'Personal Information:',
            'Age: 25',
            '',
            'Battle Gear:',
            'Hair Shirt of Suffering (Torso, Weight: 1 lb.)',
            ''
        ];

        const character = new Character(lines);
        character.ParseCharacter();

        // 1. Should parse successfully
        expect(character.parseSuccess).toBe(true);
        expect(character.parseErrors).toHaveLength(0);

        // 2. Check if item exists in battle gear
        const hairShirt = character.battleGear.find(item => item.name === 'Hair Shirt of Suffering');
        expect(hairShirt).toBeDefined();
        expect(hairShirt!.bodySlot).toBe('Torso');
        expect(hairShirt!.weight).toBe(1);

        // 3. Check if AC receives +1 Natural Armor modifier (11 total)
        expect(character.ac.currentArmorClass).toBe(11);
        const naturalArmorEffect = character.ac.activeEffects.find(
            e => e.status === 'Hair Shirt of Suffering' && e.modifierType === 'Natural Armor'
        );
        expect(naturalArmorEffect).toBeDefined();
        expect(naturalArmorEffect!.value).toBe(1);

        // 4. Check if max HP is reduced by 2 (from 10 to 8)
        expect(character.hp.max).toBe(8);
        expect(character.hp.current).toBe(8);

        // 5. Check if the CSW description exists in special properties
        const specialProp = character.Special.list.find(e => e.status === 'Hair Shirt of Suffering');
        expect(specialProp).toBeDefined();
        expect(specialProp!.description).toContain('cure serious wounds');
    });

    test('should cap current HP to the new max HP if current HP exceeds the new max HP', () => {
        const lines = [
            'Test Character',
            'Some description',
            '',
            '(Human Fighter 1)',
            '',
            'Init: +0; Senses: Listen +0, Spot +0;',
            'BAb: +1; Grapple: +1; Hp: 9/10; Speed: 30 ft.',
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
            '',
            'Personal Information:',
            'Age: 25',
            '',
            'Battle Gear:',
            'Hair Shirt of Suffering (Torso, Weight: 1 lb.)',
            ''
        ];

        const character = new Character(lines);
        character.ParseCharacter();

        expect(character.parseSuccess).toBe(true);
        expect(character.hp.max).toBe(8);
        expect(character.hp.current).toBe(8); // Capped from 9 to 8
    });

    test('should not cap current HP if it does not exceed the new max HP', () => {
        const lines = [
            'Test Character',
            'Some description',
            '',
            '(Human Fighter 1)',
            '',
            'Init: +0; Senses: Listen +0, Spot +0;',
            'BAb: +1; Grapple: +1; Hp: 6/10; Speed: 30 ft.',
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
            '',
            'Personal Information:',
            'Age: 25',
            '',
            'Battle Gear:',
            'Hair Shirt of Suffering (Torso, Weight: 1 lb.)',
            ''
        ];

        const character = new Character(lines);
        character.ParseCharacter();

        expect(character.parseSuccess).toBe(true);
        expect(character.hp.max).toBe(8);
        expect(character.hp.current).toBe(6); // Stays at 6
    });
});
