import { ModifiableProperty } from '../server/character/property';

describe('ModifiableProperty EffectsString', () => {
    test('should include zero value effects by default (reproduction)', () => {
        const property = new ModifiableProperty(10);
        const effect: any = {
            property: 'test',
            value: 0,
            modifierType: 'Generic',
            status: 'ZeroEffect'
        };
        property.applyEffect(effect);

        // New behavior: should NOT display +0 (ZeroEffect)
        expect(property.EffectsString).not.toContain('+0 (ZeroEffect)');
        expect(property.EffectsString).toBe('');
    });
});
