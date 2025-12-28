/**
 * @typedef {import('./character.js').Character} Character
 */

/**
 * @param {Character} character
 * @returns {Object}
 */
function getCharacterRep(character) {
  //create character object for the client
  const characterObject = {
    docId: character.docId,
    parseWarnings: character.parseWarnings,
    parseErrors: character.parseErrors,
    parseSuccess: character.parseSuccess,
    name: character.name,
    race: character.race,
    classes: character.classes,
    spellcasterLevel: character.spellcasterLevel,
    initBonus: character.InitiativeBonus.state,
    damageBonus: character.damageBonus.state,
    attacksOfOpportunity: character.attacksOfOpportunity.state,
    hp: { current: character.hp.current, max: character.hp.max },
    ac: character.ac.state,
    speed: character.speed.state,
    saves: {},
    resistances: character.resistances,
    preparedSpells: {},  //parsed later
    skills: {}  //parsed later
  };

  // Add saves
  for (const saveName in character.saves) {
    characterObject.saves[saveName] = character.saves[saveName].state;
  }

  characterObject.abilities = {};
  abilityNames.forEach(abilityName => {
    characterObject.abilities[abilityName] = character.abilities[abilityName].state;
  });

  // Add skills
  if (character.skills) {
    characterObject.skills = Object.fromEntries(
      character.skills.map(skill => [skill.name, skill.state])
    );
  }

  //Add statuses
  if (character.statuses) {
    characterObject.statuses = character.statuses;
  }

  // Add spells

  if (character.spellCasting) {
    characterObject.spellCasting = character.spellCasting.state;
  }

  //Add weapons
  if (character.weapons && character.weapons.length > 0) {
    characterObject.weapons = character.weapons.map(weapon => ({
      name: weapon.name,
      attackBonus: weapon.attackBonus.state, // Uses the existing state getter
      damageBonus: weapon.damageBonus.state
    }));
  }

  //Add special attacks
  characterObject.specialAttacks = {};
  for (const [attackName, attackBonus] of Object.entries(character.specialAttacks)) {
    characterObject.specialAttacks[attackName] = attackBonus.state;
  }

  //Add items
  if (character.battleGear) {
    characterObject.battleGear = character.battleGear.map(item => (item.state));
  }

  if (character.possessions) {
    characterObject.possessions = character.possessions.map(item => (item.state));
  }

  return characterObject;
}
