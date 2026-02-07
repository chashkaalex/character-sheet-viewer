




/**
 * Parses valid abilities from the character document
 * @param {Object.<string, string>} abilitiesLines - The lines for each ability
 * @returns {Object.<string, Ability>} The parsed abilities
 */
function ParseAbilities(abilitiesLines) {
  /** @type {Object.<string, Ability>} */
  const abilities = {};

  // For now, let's just return the abilities object.

  //Parsing Abilities
  AbilityNames.forEach(abilityName => {
    // Use the pre-parsed line
    const line = abilitiesLines[abilityName];
    if (line) {
      const abilityScore = ParserUtils.GetFirstNumberFromALine(line);
      if (abilityScore) {
        abilities[abilityName] = new Ability(abilityScore, abilityName);
      } else {
        // parseErrors.push(`...`);
        // We'd need to change the return signature to support errors
      }
    }
  });

  return abilities;
}

if (typeof module !== 'undefined') {
  module.exports = {
    ParseAbilities
  };
}
