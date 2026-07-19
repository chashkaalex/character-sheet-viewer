import { AbilityBasedProperty } from './abilities/ability';
import { AbilitiesMap } from './abilities/ability_types';

export const SaveNames = ['Fort', 'Ref', 'Will'] as const;
export type SaveName = typeof SaveNames[number];

/**
 * A map of character saving throws, strongly typed with specific save names.
 */
export type SavesMap = Record<SaveName, AbilityBasedProperty>;

/**
 * Creates a SavesMap instance based on character abilities.
 * @param abilities The character's abilities.
 * @returns A SavesMap object.
 */
export function CreateSaves(abilities: AbilitiesMap): SavesMap {
  return {
    Fort: new AbilityBasedProperty('Fort', abilities.Con!),
    Ref: new AbilityBasedProperty('Ref', abilities.Dex!),
    Will: new AbilityBasedProperty('Will', abilities.Wis!)
  };
}
