import { ICharacter } from '../../server/character/icharacter';
import { ModifiableProperty } from '../../server/character/00_property';
import { EffectFactory } from '../../server/character/state/effects';
import { FeatEffects } from '../../server/character/properties/feats/feats_effects';
import { Armor } from '../../server/character/gear/items/items';

describe('Shield Specialization (Tower) Feat', () => {
    test('should apply +1 AC bonus if character has a tower shield in battle gear', () => {
        // Mock a character with a tower shield in battle gear
        const towerShield = new Armor('Tower Shield', 1, '');
        const mockCharacter = {
            ac: new ModifiableProperty(10),
            battleGear: [towerShield],
            feats: [],
            parseWarnings: [],
            GetNamedProperty: (propName: string) => {
                if (propName === 'ac') {
                    return mockCharacter.ac;
                }
                return null;
            }
        } as unknown as ICharacter;

        // Apply Shield Specialization (Tower) feat effect
        const featEffects = FeatEffects['Shield Specialization (Tower)'];
        expect(featEffects).toBeDefined();

        featEffects.forEach(effect => {
            EffectFactory(effect).ApplyEffect(mockCharacter);
        });

        const activeEffect = mockCharacter.ac.activeEffects.find(
            e => e.status === 'Shield Specialization (Tower)'
        );
        expect(activeEffect).toBeDefined();
        expect(activeEffect!.value).toBe(1);
        expect(mockCharacter.ac.currentScore).toBe(11);
    });

    test('should apply +0 AC bonus if character does NOT have a tower shield in battle gear', () => {
        // Mock a character with no tower shield in battle gear (e.g. only a leather armor)
        const regularArmor = new Armor('Leather', 1, '');
        const mockCharacter = {
            ac: new ModifiableProperty(10),
            battleGear: [regularArmor],
            feats: [],
            parseWarnings: [],
            GetNamedProperty: (propName: string) => {
                if (propName === 'ac') {
                    return mockCharacter.ac;
                }
                return null;
            }
        } as unknown as ICharacter;

        // Apply Shield Specialization (Tower) feat effect
        const featEffects = FeatEffects['Shield Specialization (Tower)'];
        expect(featEffects).toBeDefined();

        featEffects.forEach(effect => {
            EffectFactory(effect).ApplyEffect(mockCharacter);
        });

        const activeEffect = mockCharacter.ac.activeEffects.find(
            e => e.status === 'Shield Specialization (Tower)'
        );
        expect(activeEffect).toBeDefined();
        expect(activeEffect!.value).toBe(0);
        expect(mockCharacter.ac.currentScore).toBe(10);
    });
});
