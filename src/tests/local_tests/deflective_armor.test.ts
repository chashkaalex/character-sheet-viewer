import * as path from 'path';
import { ICharacter } from '../../server/character/icharacter';
import { ModifiableProperty, CreatureSize } from '../../server/character/00_property';
import { ArmorClass } from '../../server/character/properties/armorClass';
import { Ability } from '../../server/character/properties/abilities/ability';
import { Sizes } from '../../server/character/_constants';
import { EffectFactory, StaticPropertyEffect } from '../../server/character/state/effects';
import { FeatEffects, GetArmorBonus, HasHeavyArmorEquipped } from '../../server/character/properties/feats/feats_effects';
import { Armor } from '../../server/character/gear/items/items';
import { Character } from '../../server/character/character';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';

const DEIN_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'dein_test.txt');

describe('Deflective Armor Feat', () => {
    test('GetArmorBonus returns active armor bonus from AC effects including Heavy Armor Optimization', () => {
        const mockCharacter = {
            ac: new ModifiableProperty(10)
        } as unknown as ICharacter;

        // No armor effects
        expect(GetArmorBonus(mockCharacter)).toBe(0);

        // Add Full Plate armor effect (+8)
        mockCharacter.ac.applyEffect(new StaticPropertyEffect({
            status: 'Full Plate',
            property: 'ac',
            modifierType: 'Armor',
            value: 8
        }));
        expect(GetArmorBonus(mockCharacter)).toBe(8);

        // Add Heavy Armor Optimization (+1)
        mockCharacter.ac.applyEffect(new StaticPropertyEffect({
            status: 'Heavy Armor Optimization',
            property: 'ac',
            modifierType: 'Generic',
            value: 1
        }));
        expect(GetArmorBonus(mockCharacter)).toBe(9);
    });

    test('ArmorClass applies armor bonus to Touch AC when applyArmorToTouch is true', () => {
        const dex = new Ability(14, 'Dex'); // +2 mod
        const size = new CreatureSize(Sizes['Medium']);
        const ac = new ArmorClass([dex], size);

        // Equip Full Plate +2 (+10 armor bonus)
        ac.applyEffect(new StaticPropertyEffect({
            status: 'Full Plate +2',
            property: 'ac',
            modifierType: 'Armor',
            value: 10
        }));

        // Add Heavy Armor Optimization (+1)
        ac.applyEffect(new StaticPropertyEffect({
            status: 'Heavy Armor Optimization',
            property: 'ac',
            modifierType: 'Generic',
            value: 1
        }));

        // Before Deflective Armor:
        // Regular AC: 10 base + 2 Dex + 10 Armor + 1 HAO = 23
        // Touch AC: 10 base + 2 Dex = 12 (Armor excluded)
        expect(ac.currentArmorClass).toBe(23);
        expect(ac.touchArmorClass).toBe(12);
        expect(ac.touchString).not.toContain('Full Plate +2');
        expect(ac.touchString).not.toContain('Heavy Armor Optimization');

        // Enable applyArmorToTouch
        ac.applyArmorToTouch = true;

        // After Deflective Armor:
        // Touch AC: 10 base + 2 Dex + 10 Armor + 1 HAO = 23
        expect(ac.touchArmorClass).toBe(23);
        expect(ac.touchString).toContain('+10 (Full Plate +2)');
        expect(ac.touchString).toContain('+1 (Heavy Armor Optimization)');
    });

    test('Deflective Armor feat callback sets applyArmorToTouch only when Heavy armor is equipped', () => {
        const dex = new Ability(12, 'Dex'); // +1 mod
        const size = new CreatureSize(Sizes['Medium']);
        const ac = new ArmorClass([dex], size);

        const heavyArmor = new Armor('Full Plate', 1, '');
        expect(heavyArmor.armorType).toBe('Heavy');

        const fullPlateEffect = new StaticPropertyEffect({
            status: 'Full Plate',
            property: 'ac',
            modifierType: 'Armor',
            value: 8
        });
        ac.applyEffect(fullPlateEffect);

        const mockCharacterWithHeavy = {
            ac,
            battleGear: [heavyArmor],
            feats: [],
            parseWarnings: []
        } as unknown as ICharacter;

        expect(HasHeavyArmorEquipped(mockCharacterWithHeavy)).toBe(true);
        expect(ac.applyArmorToTouch).toBe(false);

        // Apply Deflective Armor feat
        const featEffects = FeatEffects['Deflective Armor'];
        expect(featEffects).toBeDefined();

        featEffects.forEach(effect => {
            EffectFactory(effect).ApplyEffect(mockCharacterWithHeavy);
        });

        expect(ac.applyArmorToTouch).toBe(true);
        expect(ac.touchArmorClass).toBe(19); // 10 base + 1 Dex + 8 Armor
        expect(ac.touchString).toContain('+8 (Full Plate)');
    });

    test('Deflective Armor feat callback does NOT set applyArmorToTouch when wearing Light or Medium armor', () => {
        const dex = new Ability(14, 'Dex'); // +2 mod
        const size = new CreatureSize(Sizes['Medium']);
        const ac = new ArmorClass([dex], size);

        const mediumArmor = new Armor('Breastplate', 1, '');
        expect(mediumArmor.armorType).toBe('Medium');

        const breastplateEffect = new StaticPropertyEffect({
            status: 'Breastplate',
            property: 'ac',
            modifierType: 'Armor',
            value: 5
        });
        ac.applyEffect(breastplateEffect);

        const mockCharacterWithMedium = {
            ac,
            battleGear: [mediumArmor],
            feats: [],
            parseWarnings: []
        } as unknown as ICharacter;

        expect(HasHeavyArmorEquipped(mockCharacterWithMedium)).toBe(false);

        const featEffects = FeatEffects['Deflective Armor'];
        featEffects.forEach(effect => {
            EffectFactory(effect).ApplyEffect(mockCharacterWithMedium);
        });

        expect(ac.applyArmorToTouch).toBe(false);
        expect(ac.touchArmorClass).toBe(12); // 10 base + 2 Dex (Armor not applied)
    });

    test('Full Character parsing applies Deflective Armor to Touch AC for Dein', () => {
        const char = GetCharacterByDocId(DEIN_TEST_FILE) as Character;
        expect(char.parseSuccess).toBe(true);

        // Check that Deflective Armor is parsed and recognized
        expect(char.HasFeat('Deflective Armor')).toBe(true);
        expect(char.ac.applyArmorToTouch).toBe(true);

        // Dein has:
        // Base AC: 10
        // Dex: +1
        // Black Dragoncraft Full Plate +2: +10 (Armor)
        // Heavy Armor Optimization: +1 (Generic)
        // Shield Specialization (Tower): +1 (Generic, applied to Touch via Shield Ward)
        // Shield Ward: applyShieldToTouch = true
        // Deflective Armor: applyArmorToTouch = true

        // Regular AC: 10 + 1 + 10 + 1 + 1 = 23
        expect(char.ac.currentArmorClass).toBe(23);

        // Touch AC: 10 + 1 (Dex) + 1 (Shield Ward) + 11 (Deflective Armor: 10 Armor + 1 HAO) = 23
        expect(char.ac.touchArmorClass).toBe(23);

        // Flat-footed AC: 23 - 1 (Dex) = 22
        expect(char.ac.flatFootedArmorClass).toBe(22);

        // Touch string should show all applied bonuses
        expect(char.ac.touchString).toContain('+10 (Black Dragoncraft Full Plate +2)');
        expect(char.ac.touchString).toContain('+1 (Heavy Armor Optimization)');
        expect(char.ac.touchString).toContain('+1 (Shield Specialization (Tower))');

        // Verify there are no warnings saying "Feat Deflective Armor... not found"
        const featWarnings = char.parseWarnings.filter(w => w.toLowerCase().includes('deflective armor'));
        expect(featWarnings.length).toBe(0);
    });
});
