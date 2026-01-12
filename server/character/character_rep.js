const { Character } = require("./character");


/**
 * @param {Character} character 
 */
/**
 * @typedef {Object} CharacterRep
 * @property {string} docId
 * @property {string[]} parseWarnings
 * @property {string[]} parseErrors
 * @property {boolean} parseSuccess
 * @property {string} name
 * @property {string} race
 * @property {Array<{name: string, level: number}>} classes
 * @property {Object} initBonus
 * @property {Object} damageBonus
 * @property {Object} attacksOfOpportunity
 * @property {{current: number, max: number}} hp
 * @property {Object} ac
 * @property {Object} speed
 * @property {Object.<string, Object>} saves
 * @property {Object} resistances
 * @property {Object} preparedSpells
 * @property {Object.<string, Object>} skills
 * @property {Object.<string, Object>} abilities
 * @property {Array<Object>} statuses
 * @property {Object} [spellCasting]
 * @property {Array<{name: string, attackBonus: Object, damageBonus: Object}>} weapons
 * @property {Object.<string, Object>} specialAttacks
 * @property {Array<Object>} battleGear
 * @property {Array<Object>} possessions
 */

/**
 * @param {Character} character 
 * @returns {CharacterRep}
 */
function getCharacterRep(character) {
  //create character object for the client
  /** @type {CharacterRep} */
  const characterObject = {
    docId: character.docId,
    parseWarnings: character.parseWarnings,
    parseErrors: character.parseErrors,
    parseSuccess: character.parseSuccess,
    name: character.name,
    race: character.race,
    classes: character.classes,
    initBonus: character.InitiativeBonus.state,
    damageBonus: character.damageBonus.state,
    attacksOfOpportunity: character.attacksOfOpportunity.state,
    hp: { current: character.hp.current, max: character.hp.max },
    ac: character.ac.state,
    speed: character.speed.state,
    saves: {},
    resistances: character.resistances,
    preparedSpells: {},
    skills: {},
    abilities: {},
    specialAttacks: {},
    weapons: [],
    statuses: [],
    battleGear: [],
    possessions: []
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

if (typeof module !== 'undefined') {
  module.exports = {
    getCharacterRep
  };
}
