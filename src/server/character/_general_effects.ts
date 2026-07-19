import { SaveNames } from './properties/saves';
import { SkillsAbilities } from './properties/skills';
import { AbilityNames } from './properties/abilities/ability_types';
import type { EffectData } from './state/effects';
import type { Status } from './state/state';
import type { ICharacter } from './icharacter';

export type DynamicEffectGenerator = (parsedValue: number, statusName: string) => EffectData[];

export const StatusesEffects: Record<string, EffectData[]> = {};

export function registerStatusEffects(effects: Record<string, EffectData[]>): void {
  Object.assign(StatusesEffects, effects);
}

export function initializeGeneralEffects(): void {
  // Check if already initialized to avoid redundant work
  if (StatusesEffects['Keeping Grudge']) return;

  const keepingGrudgeEffects: EffectData[] = [
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

  // Shaken status effects
  const shakenEffects: EffectData[] = [
    {
      status: 'Shaken',
      property: 'bab',
      modifierType: 'Generic',
      value: -2
    }
  ];

  SaveNames.forEach(saveName => {
    shakenEffects.push({
      status: 'Shaken',
      property: saveName,
      modifierType: 'Generic',
      value: -2
    });
  });

  Object.keys(SkillsAbilities).forEach(skillName => {
    shakenEffects.push({
      status: 'Shaken',
      property: skillName as any,
      modifierType: 'Generic',
      value: -2
    });
  });

  AbilityNames.forEach(abilityName => {
    shakenEffects.push({
      status: 'Shaken',
      property: abilityName,
      modifierType: 'Generic',
      value: -2
    });
  });

  StatusesEffects['Shaken'] = shakenEffects;

  // Invisible status effects
  StatusesEffects['Invisible'] = [
    {
      status: 'Invisible',
      property: 'bab',
      modifierType: 'Generic',
      value: 2
    }
  ];
}

const DynamicStatusesEffects: Record<string, DynamicEffectGenerator> = {
  'Inspire Courage': (parsedValue, statusName) => [
    {
      status: statusName,
      property: 'Will',
      modifierType: 'Morale',
      valueResolver: (character: ICharacter) => character.HasStatus('Frightful Presence') ? parsedValue : 0
    },
    { status: statusName, property: 'bab', modifierType: 'Morale', value: parsedValue },
    { status: statusName, property: 'damageBonus', modifierType: 'Morale', value: parsedValue }
  ],
  'Inspire Competence': (parsedValue, statusName) => {
    return Object.keys(SkillsAbilities).map(skillName => ({
      status: statusName,
      property: skillName,
      modifierType: 'Competence',
      value: parsedValue
    }));
  },
  'Inspire Greatness': (parsedValue, statusName) => [
    { status: statusName, property: 'bab', modifierType: 'Competence', value: parsedValue },
    { status: statusName, property: 'Fort', modifierType: 'Competence', value: Math.max(0, parsedValue - 1) }
  ],
  'Inspire Heroics': (parsedValue, statusName) => {
    const effects: EffectData[] = [
      { status: statusName, property: 'ac', modifierType: 'Dodge', value: parsedValue }
    ];
    SaveNames.forEach(saveName => {
      effects.push({ status: statusName, property: saveName, modifierType: 'Morale', value: parsedValue });
    });
    return effects;
  },
  'Combat Expertise': (parsedValue, statusName) => {
    const acBonus = Math.abs(parsedValue);
    return [
      { status: statusName, property: 'bab', modifierType: 'Generic', value: parsedValue },
      { status: statusName, property: 'ac', modifierType: 'Dodge', value: acBonus }
    ];
  }
};

export function GetEffects(container: Record<string, any>, identifier: string): EffectData[] | null {
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
