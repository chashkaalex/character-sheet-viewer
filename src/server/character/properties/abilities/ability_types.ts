import type { Ability } from './ability';

export const AbilityNames = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'] as const;
export type AbilityName = typeof AbilityNames[number] | 'None';

export type AbilitiesMap = Partial<Record<AbilityName, Ability>>;
