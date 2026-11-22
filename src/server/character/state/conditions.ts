import { AbilityNames } from '../properties/abilities/ability_types';
import { SaveNames } from '../properties/saves';
import { SkillsAbilities } from '../properties/skills';
import { EffectData } from './effects';

export const FearConditions = ['Shaken', 'Frightened', 'Panicked'] as const;

const FEAR_CONDITION_DESCRIPTIONS: Record<(typeof FearConditions)[number], string> = {
  Shaken: 'Takes a -2 penalty on attack rolls, saving throws, skill checks, and ability checks.',
  Frightened: 'Takes a -2 penalty on attack rolls, saving throws, skill checks, and ability checks; must flee from the source of fear (may fight if unable to flee).',
  Panicked: 'Takes a -2 penalty on attack rolls, saving throws, skill checks, and ability checks; must drop anything held and flee at top speed (cowers if cornered).'
};

const STATUSES_REMOVED_BY_STATUS: Record<string, readonly string[]> = {
  'remove fear': FearConditions
};

/**
 * Builds the D&D 3.5 penalty effects shared by Shaken, Frightened, and Panicked.
 */
function createFearConditionEffects(conditionName: string, description: string): EffectData[] {
  const effects: EffectData[] = [
    {
      status: conditionName,
      description
    },
    {
      status: conditionName,
      property: 'attackBonus',
      modifierType: 'Generic',
      value: -2
    }
  ];

  SaveNames.forEach(saveName => {
    effects.push({
      status: conditionName,
      property: saveName,
      modifierType: 'Generic',
      value: -2
    });
  });

  Object.keys(SkillsAbilities).forEach(skillName => {
    effects.push({
      status: conditionName,
      property: skillName,
      modifierType: 'Generic',
      value: -2
    });
  });

  AbilityNames.forEach(abilityName => {
    effects.push({
      status: conditionName,
      property: abilityName,
      modifierType: 'Generic',
      value: -2
    });
  });

  return effects;
}

/**
 * Registers D&D 3.5 condition status effects (including fear conditions) into the global status effects map.
 */
export function registerConditions(statusesEffects: Record<string, EffectData[]>): void {
  FearConditions.forEach(conditionName => {
    statusesEffects[conditionName] = createFearConditionEffects(
      conditionName,
      FEAR_CONDITION_DESCRIPTIONS[conditionName]
    );
  });
}

/**
 * Returns any active statuses that should be removed when the given status is applied.
 */
export function getStatusesRemovedBy(statusName: string): readonly string[] {
  if (!statusName) return [];
  return STATUSES_REMOVED_BY_STATUS[statusName.trim().toLowerCase()] || [];
}
