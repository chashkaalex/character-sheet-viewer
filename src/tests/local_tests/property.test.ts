import { ModifiableProperty, CreatureSize } from '../../server/character/00_property';
import { Sizes } from '../../server/character/_constants';

describe('ModifiableProperty', () => {
  let modifiableProperty: ModifiableProperty;

  beforeEach(() => {
    modifiableProperty = new ModifiableProperty(10);
  });

  test('should handle generic effects', () => {
    const genericEffect: any = { status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 };
    modifiableProperty.applyEffect(genericEffect);

    expect(modifiableProperty.string).toBe('12 (base: 10)  +2 (GenericStrengthBuff)');
    expect(modifiableProperty.currentScore).toBe(12);
  });

  test('should stack effects with different modifier types', () => {
    const genericEffect: any = { status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 };
    const enhancementEffect: any = { status: 'EnhancementStrengthBuff', property: 'Str', modifierType: 'Enhancement', value: 2 };

    modifiableProperty.applyEffect(genericEffect);
    modifiableProperty.applyEffect(enhancementEffect);

    expect(modifiableProperty.string).toContain('14 (base: 10)');
    expect(modifiableProperty.string).toContain('+2 (GenericStrengthBuff)');
    expect(modifiableProperty.string).toContain('+2 (EnhancementStrengthBuff)');
    expect(modifiableProperty.currentScore).toBe(14);
  });

  test('should stack stacks with different modifier types (Circumstance)', () => {
    const genericEffect: any = { status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 };
    const enhancementEffect: any = { status: 'EnhancementStrengthBuff', property: 'Str', modifierType: 'Enhancement', value: 2 };
    const circumstanceEffect: any = { status: 'CircumstanceStrengthBuff', property: 'Str', modifierType: 'Circumstance', value: 2 };

    modifiableProperty.applyEffect(genericEffect);
    modifiableProperty.applyEffect(enhancementEffect);
    modifiableProperty.applyEffect(circumstanceEffect);

    expect(modifiableProperty.currentScore).toBe(16);
  });

  test('should NOT stack effects with the same modifier type (Enhancement)', () => {
    const enhancementEffect1: any = { status: 'EnhancementStrengthBuff', property: 'Str', modifierType: 'Enhancement', value: 2 };
    const enhancementEffect2: any = { status: 'EnhancementStrengthBuff1', property: 'Str', modifierType: 'Enhancement', value: 2 };

    // Setup base
    modifiableProperty.applyEffect({ status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 } as any);

    modifiableProperty.applyEffect(enhancementEffect1);
    modifiableProperty.applyEffect(enhancementEffect2);

    // 10 base + 2 generic + 2 enhancement (only one applies) = 14
    expect(modifiableProperty.currentScore).toBe(14);
  });

  test('should always stack Circumstance effects', () => {
    // Setup base
    modifiableProperty.applyEffect({ status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 } as any);

    const circ1: any = { status: 'CircumstanceStrengthBuff', property: 'Str', modifierType: 'Circumstance', value: 2 };
    const circ2: any = { status: 'CircumstanceStrengthBuff1', property: 'Str', modifierType: 'Circumstance', value: 2 };

    modifiableProperty.applyEffect(circ1);
    modifiableProperty.applyEffect(circ2);

    // 10 base + 2 generic + 2 circ + 2 circ = 16
    expect(modifiableProperty.currentScore).toBe(16);
  });

  test('should replace weaker effect with stronger one of same type', () => {
    // Setup base
    modifiableProperty.applyEffect({ status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 } as any);

    const weakEnhancement: any = { status: 'WeakBuff', property: 'Str', modifierType: 'Enhancement', value: 2 };
    const strongEnhancement: any = { status: 'StrongBuff', property: 'Str', modifierType: 'Enhancement', value: 3 };

    modifiableProperty.applyEffect(weakEnhancement);
    modifiableProperty.applyEffect(strongEnhancement);

    // 10 base + 2 generic + 3 broad enhancement = 15
    expect(modifiableProperty.currentScore).toBe(15);
  });

  test('should handle penalty effects correctly', () => {
    // Setup base
    modifiableProperty.applyEffect({ status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 } as any);

    // "Enhancement" type with negative value should act as penalty and stack?
    // Logic from original test: modifierType is Enhancement, but value is negative.
    const penaltyEffect: any = { status: 'PenaltyStrengthDebuff', property: 'Str', modifierType: 'Enhancement', value: -2 };

    modifiableProperty.applyEffect(penaltyEffect);

    // 10 + 2 (generic) - 2 (penalty) = 10
    expect(modifiableProperty.currentScore).toBe(10);
    expect(modifiableProperty.string).toContain('-2 (PenaltyStrengthDebuff)');
  });

  test('should generate correct rolzRollMessage only when isRollable is true', () => {
    // Non-rollable by default
    modifiableProperty = new ModifiableProperty(10, 'AC');
    expect(modifiableProperty.state.rolzRollMessage).toBeUndefined();

    // Rollable explicitly
    modifiableProperty = new ModifiableProperty(10, 'Initiative', true);
    expect(modifiableProperty.state.rolzRollMessage).toBe('#d20+10 #Initiative');

    modifiableProperty.applyPermanentEffect(2);
    expect(modifiableProperty.state.rolzRollMessage).toBe('#d20+12 #Initiative');

    const penalty: any = { status: 'Fatigued', property: 'Dex', modifierType: 'Generic', value: -4 };
    modifiableProperty.applyEffect(penalty);
    expect(modifiableProperty.state.rolzRollMessage).toBe('#d20+8 #Initiative');
  });
});

describe('CreatureSize', () => {
  let creatureSize: CreatureSize;

  beforeEach(() => {
    creatureSize = new CreatureSize(Sizes['Medium']);
  });

  test('should apply static size increase effect', () => {
    const enlargeEffect: any = { status: 'Enlarge Person', property: 'size', modifierType: 'Size', value: 1 };
    creatureSize.applyEffect(enlargeEffect);

    expect(creatureSize.currentSize.name).toBe('Large');
    expect(creatureSize.modifier).toBe(-1);
    expect(creatureSize.bonus).toBe(4);
    expect(creatureSize.string).toBe('-1 (Enlarge Person) size modifier');
    expect(creatureSize.bonusString).toBe('+4 (Enlarge Person) size bonus');
  });

  test('should apply permanent size increase effect', () => {
    creatureSize.applyPermanentEffect(1);

    expect(creatureSize.score.name).toBe('Large');
    expect(creatureSize.currentScore.name).toBe('Large');
    expect(creatureSize.currentSize.name).toBe('Large');
    expect(creatureSize.modifier).toBe(-1);
    expect(creatureSize.bonus).toBe(4);
  });

  test('should apply permanent size decrease effect', () => {
    creatureSize.applyPermanentEffect(-1);

    expect(creatureSize.score.name).toBe('Small');
    expect(creatureSize.currentScore.name).toBe('Small');
    expect(creatureSize.currentSize.name).toBe('Small');
    expect(creatureSize.modifier).toBe(1);
    expect(creatureSize.bonus).toBe(-4);
  });
});
