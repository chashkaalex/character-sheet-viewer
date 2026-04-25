import { AbilityNames } from './_constants';
import { CharacterClass } from './common_types';

/**
 * Character representation for the client.
 */
export interface CharacterRep {
  docId: string;
  parseWarnings: string[];
  parseErrors: string[];
  parseSuccess: boolean;
  name: string;
  race: string;
  classes: CharacterClass[];
  initBonus: any;
  damageBonus: any;
  attacksOfOpportunity: any;
  hp: { current: number; max: number };
  ac: any;
  speed: any;
  saves: Record<string, any>;
  resistances: string;
  preparedSpells: Record<string, any>;
  skills: Record<string, any>;
  abilities: Record<string, any>;
  statuses: any[];
  spellCasting?: any;
  weapons: any[];
  specialAttacks: Record<string, any>;
  battleGear: any[];
  possessions: any[];
  partyName: string | null;
  partyMembers: string[];
}

/**
 * Creates a character representation object for the client.
 * @param character The character object.
 * @returns A CharacterRep object.
 */
export function getCharacterRep(character: any): CharacterRep {
  const characterObject: CharacterRep = {
    docId: character.docId,
    parseWarnings: character.parseWarnings,
    parseErrors: character.parseErrors,
    parseSuccess: character.parseSuccess,
    name: character.name,
    race: character.race,
    classes: character.classes,
    initBonus: character.InitiativeBonus ? character.InitiativeBonus.state : null,
    damageBonus: character.damageBonus ? character.damageBonus.state : null,
    attacksOfOpportunity: character.attacksOfOpportunity ? character.attacksOfOpportunity.state : null,
    hp: { current: character.hp.current, max: character.hp.max },
    ac: character.ac ? character.ac.state : null,
    speed: character.speed ? character.speed.state : null,
    saves: {},
    resistances: character.resistances,
    preparedSpells: {},
    skills: {},
    abilities: {},
    specialAttacks: {},
    weapons: [],
    statuses: [],
    battleGear: [],
    possessions: [],
    partyName: character.partyName,
    partyMembers: character.partyMembers
  };

  // Add saves
  if (character.saves) {
    for (const saveName in character.saves) {
      if (character.saves[saveName]) {
        characterObject.saves[saveName] = character.saves[saveName].state;
      }
    }
  }

  // Add abilities
  if (character.abilities) {
    AbilityNames.forEach(abilityName => {
      if (character.abilities[abilityName]) {
        characterObject.abilities[abilityName] = character.abilities[abilityName].state;
      }
    });
  }

  // Add skills
  if (character.skills) {
    characterObject.skills = Object.fromEntries(
      character.skills.map((skill: any) => [skill.name, skill.state])
    );
  }

  // Add statuses
  if (character.statuses) {
    characterObject.statuses = character.statuses;
  }

  // Add spell casting
  if (character.spellCasting) {
    characterObject.spellCasting = character.spellCasting.state;
  }

  // Add weapons
  if (character.weapons && character.weapons.length > 0) {
    characterObject.weapons = character.weapons.map((weapon: any) => ({
      name: weapon.name,
      attackBonus: weapon.attackBonus ? weapon.attackBonus.state : null,
      damageBonus: weapon.damageBonus ? weapon.damageBonus.state : null,
      statsString: weapon.statsString,
      atkPartString: weapon.atkPartString,
      dmgPartString: weapon.dmgPartString,
      atkValue: weapon.atkValue,
      dmgValue: weapon.dmgValue,
      critValue: weapon.critValue
    }));

    // Sort weapons alphabetically by name
    characterObject.weapons.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Add special attacks
  if (character.specialAttacks) {
    for (const [attackName, attackBonus] of Object.entries(character.specialAttacks)) {
      if (attackBonus) {
        characterObject.specialAttacks[attackName] = (attackBonus as any).state;
      }
    }
  }

  // Add items
  if (character.battleGear) {
    characterObject.battleGear = character.battleGear.map((item: any) => item.state);
  }

  if (character.possessions) {
    characterObject.possessions = character.possessions.map((item: any) => item.state);
  }

  return characterObject;
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = {
    getCharacterRep
  };
}
