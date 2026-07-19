import { ICharacter } from '../../server/character/icharacter';
import { ModifiableProperty, CreatureSize, BaseProperty, setPropertyRegistry } from '../../server/character/00_property';
import { Sizes } from '../../server/character/_constants';
import { Weapon } from '../../server/character/gear/weapons/weapons';
import { FeatEffects } from '../../server/character/properties/feats/feats_effects';
import { EffectFactory, StaticPropertyEffect } from '../../server/character/state/effects';

describe('Weapon Specialization and Focus Feats', () => {
    test('should apply attack and damage bonuses to matching weapons', () => {
        const registeredItems: any[] = [];
        const gearEffects: any[] = [];

        // Mock a character with parsed weapon feats using the real callbacks from FeatEffects
        const mockCharacter = {
            bab: new ModifiableProperty(5),
            size: new CreatureSize(Sizes['Medium']),
            abilities: {
                Str: { modifier: 3, ModifierString: '3 Str modifier' },
                Dex: { modifier: 4, ModifierString: '4 Dex modifier' }
            },
            damageBonus: new ModifiableProperty(0),
            HasFeat: (feat: string) => false,
            weapons: [],
            // Feats structure returned by feats_parser: list of lists of EffectData
            feats: [
                [
                    {
                        status: 'Weapon Specialization (Waraxe)',
                        callback: (FeatEffects['Weapon Specialization'][0] as any).callback,
                        args: { params: ['Waraxe'] }
                    }
                ],
                [
                    {
                        status: 'Weapon Focus (Waraxe)',
                        callback: (FeatEffects['Weapon Focus'][0] as any).callback,
                        args: { params: ['Waraxe'] }
                    }
                ]
            ],
            registerItem(item: any) {
                if (registeredItems.includes(item)) return;
                registeredItems.push(item);
                gearEffects.forEach(ge => {
                    if (item.matchesPattern(ge.pattern)) {
                        const effInstance = EffectFactory(ge.effect);
                        if ('property' in effInstance) {
                            const propName = (effInstance as any).property;
                            const targetProp = (item as any)[propName];
                            if (targetProp instanceof BaseProperty && effInstance instanceof StaticPropertyEffect) {
                                targetProp.applyEffect(effInstance);
                            }
                        }
                    }
                });
            },
            addGearEffect(statusName: string, pattern: string, effect: any) {
                gearEffects.push({ statusName, pattern, effect });
                registeredItems.forEach(item => {
                    if (item.matchesPattern(pattern)) {
                        const effInstance = EffectFactory(effect);
                        if ('property' in effInstance) {
                            const propName = (effInstance as any).property;
                            const targetProp = (item as any)[propName];
                            if (targetProp instanceof BaseProperty && effInstance instanceof StaticPropertyEffect) {
                                targetProp.applyEffect(effInstance);
                            }
                        }
                    }
                });
            }
        } as unknown as ICharacter;

        // Construct a matching weapon (Waraxe) and a non-matching weapon (Dagger)
        let waraxe!: Weapon;
        let dagger!: Weapon;
        setPropertyRegistry(mockCharacter as any);
        try {
            waraxe = new Weapon('Frost Waraxe +1 (Dwarvencraft)', '', 0, mockCharacter);
            dagger = new Weapon('Dagger', '', 0, mockCharacter);
        } finally {
            setPropertyRegistry(null);
        }
        mockCharacter.weapons = [waraxe, dagger];

        // Execute the mutating callbacks
        mockCharacter.feats.forEach(feat => {
            feat.forEach(effect => {
                const eff = effect as any;
                eff.callback(mockCharacter, eff.args);
            });
        });

        // Recalculate weapon bonuses
        waraxe.calculateBonuses(mockCharacter);
        dagger.calculateBonuses(mockCharacter);

        // Base attack = 5 (BAB) + 3 (Str) + 1 (enhancement) = 9. With Weapon Focus: +1 => 10.
        // Base damage = 3 (Str) + 1 (enhancement) = 4. With Weapon Specialization: +2 => 6.
        expect(waraxe.attackBonus.bonus).toBe(10);
        expect(waraxe.damageBonus.bonus).toBe(6);
        expect(waraxe.attackBonus.state.string).toContain('+1 (Weapon Focus (Waraxe))');
        expect(waraxe.damageBonus.state.string).toContain('+2 (Weapon Specialization (Waraxe))');

        // Base attack = 5 (BAB) + 3 (Str - no finesse) = 8.
        // Base damage = 3 (Str) = 3.
        // Dagger has no enhancement or feats matching "Dagger".
        expect(dagger.attackBonus.bonus).toBe(8);
        expect(dagger.damageBonus.bonus).toBe(3);
    });
});
