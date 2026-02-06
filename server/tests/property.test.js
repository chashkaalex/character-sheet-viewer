const { ModifiableProperty } = require('../character/property');

// Mock global modifierTypes expected by ModifiableProperty
global.ModifierTypes = {
  Generic: { isStackable: true },
  Enhancement: { isStackable: false },
  Circumstance: { isStackable: true }
};

// Mock global objects if necessary (none needed for ModifiableProperty yet)

describe('ModifiableProperty', () => {
  let modifiableProperty;

  beforeEach(() => {
    modifiableProperty = new ModifiableProperty(10);
  });

  test('should handle generic effects', () => {
    const genericEffect = { status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 };
    modifiableProperty.applyEffect(genericEffect);

    expect(modifiableProperty.string).toBe('12 (base: 10)  +2 (GenericStrengthBuff)');
    expect(modifiableProperty.currentScore).toBe(12);
  });

  test('should stack effects with different modifier types', () => {
    const genericEffect = { status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 };
    const enhancementEffect = { status: 'EnhancementStrengthBuff', property: 'Str', modifierType: 'Enhancement', value: 2 };

    modifiableProperty.applyEffect(genericEffect);
    modifiableProperty.applyEffect(enhancementEffect);

    expect(modifiableProperty.string).toContain('14 (base: 10)');
    expect(modifiableProperty.string).toContain('+2 (GenericStrengthBuff)');
    expect(modifiableProperty.string).toContain('+2 (EnhancementStrengthBuff)');
    expect(modifiableProperty.currentScore).toBe(14);
  });

  test('should stack stacks with different modifier types (Circumstance)', () => {
    const genericEffect = { status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 };
    const enhancementEffect = { status: 'EnhancementStrengthBuff', property: 'Str', modifierType: 'Enhancement', value: 2 };
    const circumstanceEffect = { status: 'CircumstanceStrengthBuff', property: 'Str', modifierType: 'Circumstance', value: 2 };

    modifiableProperty.applyEffect(genericEffect);
    modifiableProperty.applyEffect(enhancementEffect);
    modifiableProperty.applyEffect(circumstanceEffect);

    expect(modifiableProperty.currentScore).toBe(16);
  });

  test('should NOT stack effects with the same modifier type (Enhancement)', () => {
    const enhancementEffect1 = { status: 'EnhancementStrengthBuff', property: 'Str', modifierType: 'Enhancement', value: 2 };
    const enhancementEffect2 = { status: 'EnhancementStrengthBuff1', property: 'Str', modifierType: 'Enhancement', value: 2 };

    // Setup base
    modifiableProperty.applyEffect({ status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 });

    modifiableProperty.applyEffect(enhancementEffect1);
    modifiableProperty.applyEffect(enhancementEffect2);

    // 10 base + 2 generic + 2 enhancement (only one applies) = 14
    expect(modifiableProperty.currentScore).toBe(14);
  });

  test('should always stack Circumstance effects', () => {
    // Setup base
    modifiableProperty.applyEffect({ status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 });

    const circ1 = { status: 'CircumstanceStrengthBuff', property: 'Str', modifierType: 'Circumstance', value: 2 };
    const circ2 = { status: 'CircumstanceStrengthBuff1', property: 'Str', modifierType: 'Circumstance', value: 2 };

    modifiableProperty.applyEffect(circ1);
    modifiableProperty.applyEffect(circ2);

    // 10 base + 2 generic + 2 circ + 2 circ = 16
    expect(modifiableProperty.currentScore).toBe(16);
  });

  test('should replace weaker effect with stronger one of same type', () => {
    // Setup base
    modifiableProperty.applyEffect({ status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 });

    const weakEnhancement = { status: 'WeakBuff', property: 'Str', modifierType: 'Enhancement', value: 2 };
    const strongEnhancement = { status: 'StrongBuff', property: 'Str', modifierType: 'Enhancement', value: 3 };

    modifiableProperty.applyEffect(weakEnhancement);
    modifiableProperty.applyEffect(strongEnhancement);

    // 10 base + 2 generic + 3 broad enhancement = 15
    expect(modifiableProperty.currentScore).toBe(15);
  });

  test('should handle penalty effects correctly', () => {
    // Setup base
    modifiableProperty.applyEffect({ status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 });

    // "Enhancement" type with negative value should act as penalty and stack?
    // Logic from original test: modifierType is Enhancement, but value is negative.
    const penaltyEffect = { status: 'PenaltyStrengthDebuff', property: 'Str', modifierType: 'Enhancement', value: -2 };

    modifiableProperty.applyEffect(penaltyEffect);

    // The original test expected 17 (starting from complex state).
    // Let's trace logic:
    // isPenalty = true (-2 < 0) -> activeEffects.push(effect) -> currentScore += effect.value
    // So penalties ALWAYS stack in this implementation.

    // 10 + 2 (generic) - 2 (penalty) = 10
    expect(modifiableProperty.currentScore).toBe(10);
    expect(modifiableProperty.string).toContain('-2 (PenaltyStrengthDebuff)');
  });
});
