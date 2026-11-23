import { SaveNames } from './properties/saves';
import { SkillsAbilities } from './properties/skills';
import { AbilityNames } from './properties/abilities/ability_types';
import type { EffectData } from './state/effects';
import type { Status } from './state/state';
import type { ICharacter } from './icharacter';
import { registerConditions } from './state/conditions';

export type DynamicEffectGenerator = (parsedValue: number, statusName: string) => EffectData[];
export type ParameterizedEffectGenerator = (parameterText: string, statusName: string) => EffectData[];

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
      property: 'attackBonus',
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

  // Register standard conditions (Shaken, Frightened, Panicked)
  registerConditions(StatusesEffects);

  // Invisible status effects
  StatusesEffects['Invisible'] = [
    {
      status: 'Invisible',
      property: 'attackBonus',
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
    { status: statusName, property: 'attackBonus', modifierType: 'Morale', value: parsedValue },
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
    { status: statusName, property: 'attackBonus', modifierType: 'Competence', value: parsedValue },
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
  'Furious Counterstrike': (parsedValue, statusName) => {
    const bonus = Math.max(1, Math.floor(Math.abs(parsedValue) / 5));
    return [
      { status: statusName, property: 'attackBonus', modifierType: 'Generic', value: bonus },
      { status: statusName, property: 'damageBonus', modifierType: 'Generic', value: bonus }
    ];
  },
  'Combat Expertise': (parsedValue, statusName) => {
    const acBonus = Math.abs(parsedValue);
    return [
      { status: statusName, property: 'attackBonus', modifierType: 'Generic', value: parsedValue },
      { status: statusName, property: 'ac', modifierType: 'Dodge', value: acBonus }
    ];
  }
};

const ParameterizedStatusesEffects: Record<string, ParameterizedEffectGenerator> = {
  'Keen Edge': (targetWeaponName, statusName) => [
    {
      status: statusName,
      description: `Doubles the threat range of ${targetWeaponName} (does not stack with Keen or Improved Critical).`,
      callback: (character: ICharacter) => {
        if (!targetWeaponName) return;
        character.addGearEffect(statusName, targetWeaponName, {
          status: statusName,
          callback: (_char: ICharacter, gearArgs: Record<string, unknown>) => {
            const targetItem = gearArgs['item'] as any;
            if (targetItem && 'isKeen' in targetItem) {
              targetItem.isKeen = true;
            }
          }
        });
      }
    }
  ]
};

export function GetEffects(container: Record<string, any>, identifier: string): EffectData[] | null {
  // Try exact lookup first
  const effects = container[identifier];

  if (effects) {
    return effects.map((effect: any) => ({ ...effect }));
  }

  if (container === StatusesEffects) {
    // 1. Try dynamic numeric extraction (e.g., getting +3 out of "Inspire Courage +3")
    const dynamicMatch = identifier.match(/^(.+?)\s+([+-]?\d+)$/);
    if (dynamicMatch) {
      const baseName = dynamicMatch[1];
      const numericValue = parseInt(dynamicMatch[2], 10);

      const dynamicEffectGenerator = DynamicStatusesEffects[baseName];
      if (dynamicEffectGenerator) {
        const generatedEffects = dynamicEffectGenerator(numericValue, identifier);
        return generatedEffects.map((effect: any) => ({ ...effect }));
      }
    }

    // 2. Try parameterized parenthesized extraction (e.g., getting "Longsword" out of "Keen Edge (Longsword)")
    const openParenIdx = identifier.indexOf('(');
    if (openParenIdx > 0 && identifier.endsWith(')')) {
      const baseName = identifier.substring(0, openParenIdx).trim();
      const paramText = identifier.substring(openParenIdx + 1, identifier.length - 1).trim();
      const paramGenerator = ParameterizedStatusesEffects[baseName];
      if (paramGenerator && paramText) {
        const generatedEffects = paramGenerator(paramText, identifier);
        return generatedEffects.map((effect: any) => ({ ...effect }));
      }
    }
  }

  return null;
}
