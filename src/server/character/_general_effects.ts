import { SaveNames, SkillsAbilities, AbilityNames, ModifierType } from './_constants';
import { StaticallyApplicableEffect, DynamicallyApplicableEffect, BaseEffect } from './state';

export type ApplicableEffectData = StaticallyApplicableEffect | DynamicallyApplicableEffect;

export type DynamicEffectGenerator = (parsedValue: number, statusName: string) => ApplicableEffectData[];

export const StatusesEffects: Record<string, ApplicableEffectData[]> = {};

export function registerStatusEffects(effects: Record<string, ApplicableEffectData[]>): void {
  Object.assign(StatusesEffects, effects);
}

const keepingGrudgeEffects: ApplicableEffectData[] = [
  {
    status: 'Keeping Grudge',
    property: 'bab',
    modifierType: 'Circumstance',
    value: -2
  }
];

SaveNames.forEach(saveName => {
  keepingGrudgeEffects.push({
    status: 'Keeping Grudge',
    property: saveName,
    modifierType: 'Circumstance',
    value: -2
  });
});

Object.keys(SkillsAbilities).forEach(skillName => {
  keepingGrudgeEffects.push({
    status: 'Keeping Grudge',
    property: skillName,
    modifierType: 'Circumstance',
    value: -2
  });
});

AbilityNames.forEach(abilityName => {
  keepingGrudgeEffects.push({
    status: 'Keeping Grudge',
    property: abilityName,
    modifierType: 'Circumstance',
    value: -2
  });
});

StatusesEffects['Keeping Grudge'] = keepingGrudgeEffects;

const DynamicStatusesEffects: Record<string, DynamicEffectGenerator> = {
  'Inspire Courage': (parsedValue, statusName) => [
    {
      status: statusName,
      property: 'Will',
      modifierType: 'Morale',
      value: (character: any) => (character.statuses && character.statuses.some((s: any) => s.name === 'Frightful Presence')) ? parsedValue : 0
    },
    { status: statusName, property: 'bab', modifierType: 'Morale', value: parsedValue },
    { status: statusName, property: 'damageBonus', modifierType: 'Morale', value: parsedValue }
  ]
};

export function GetEffects(container: Record<string, any>, identifier: string): ApplicableEffectData[] | null {
  // Try exact lookup first
  const effects = container[identifier];

  if (effects) {
    return effects.map((effect: any) => ({ ...effect }));
  }

  // If container is StatusesEffects, try dynamic extraction (e.g., getting +3 out of "Inspire Courage +3")
  if (container === StatusesEffects) {
    const dynamicMatch = identifier.match(/^(.+?)\s+([+-]\d+)$/);
    if (dynamicMatch) {
      const baseName = dynamicMatch[1];
      const numericValue = parseInt(dynamicMatch[2], 10);

      const dynamicEffectGenerator = DynamicStatusesEffects[baseName];
      if (dynamicEffectGenerator) {
        const generatedEffects = dynamicEffectGenerator(numericValue, identifier);
        return generatedEffects.map((effect: any) => ({ ...effect }));
      }
    }
  }

  return null;
}

