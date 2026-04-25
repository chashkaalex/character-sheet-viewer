import { AbilityNames } from '../_constants';
import { ParserUtils } from '../parser_utils';
import { Ability } from '../property';
import { AbilitiesMap } from '../common_types';

/**
 * Parses valid abilities from the character document
 * @param abilitiesLines The pre-parsed lines for each ability
 * @returns The parsed abilities map
 */
export function ParseAbilities(abilitiesLines: Record<string, string>): AbilitiesMap {
  const abilities: AbilitiesMap = {};

  // Parsing Abilities
  AbilityNames.forEach(abilityName => {
    const line = abilitiesLines[abilityName];
    if (line) {
      const abilityScore = ParserUtils.GetFirstNumberFromALine(line);
      if (abilityScore !== null && !isNaN(abilityScore)) {
        abilities[abilityName] = new Ability(abilityScore, abilityName);
      }
    }
  });

  // Add a None ability for skills that don't have an associated ability
  abilities['None'] = new Ability(10, 'None');

  return abilities;
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = {
    ParseAbilities
  };
}
