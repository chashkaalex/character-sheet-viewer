import { AbilityNames, AbilitiesMap, AbilityName } from './ability_types';
import { Ability } from './ability';
import { GetFirstNumberFromALine } from '../../parser_utils';

export function ParseAbilities(abilitiesLines: Record<string, string>): AbilitiesMap {
  const abilities: AbilitiesMap = {};

  for (const [key, value] of Object.entries(abilitiesLines)) {
    const abilityName = AbilityNames.find(n => n === key) as AbilityName | undefined;
    if (!abilityName) continue; // Skip if it's not a recognized ability

    const score = GetFirstNumberFromALine(value);
    if (score !== null) {
      abilities[abilityName] = new Ability(score, abilityName);
    }
  }
  abilities['None'] = new Ability(10, 'None');

  return abilities;
}
