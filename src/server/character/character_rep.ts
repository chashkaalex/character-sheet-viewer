import { ICharacter } from './icharacter';
import { AbilityNames } from './properties/abilities/ability_types';
import { CharacterClass } from './properties/race_and_classes';
import { ActionsData, NumberAction } from './actions/actions_effects';
import { calculateTwf, TwfData } from './gear/weapons/twf';
import { calculateNormalFullAttack, calculateTwfFullAttack } from './gear/weapons/full_attack';

/**
 * Character representation for the client.
 */
export interface CharacterRep {
  docId: string;
  mutationMessage?: string;
  parseWarnings: string[];
  parseErrors: string[];
  parseSuccess: boolean;
  name: string;
  rolzRoomId?: string;
  race: string;
  classes: CharacterClass[];
  initBonus: any;
  damageBonus: any;
  attacksOfOpportunity: any;
  acp: any;
  hp: { current: number; max: number };
  ac: any;
  speed: any;
  saves: Record<string, any>;
  resistances: string;
  preparedSpells: Record<string, any>;
  skills: Record<string, any>;
  abilities: Record<string, any>;
  statuses: any[];
  actions: string[];
  spellCasting?: any;
  weapons: any[];
  specialAttacks: Record<string, any>;
  battleGear: any[];
  possessions: any[];
  partyName: string | null;
  partyMembers: string[];
  quickStatuses: string[];
  partiesDocId?: string | null;
  actionsMetadata?: Record<string, {
    name: string;
    acceptsNumber: boolean;
    minNumber?: number;
    maxNumber?: number;
    label?: string;
  }>;
  twf?: {
    hasTWF: boolean;
    hasImprovedTWF: boolean;
    hasGreaterTWF: boolean;
    combinations: Array<{
      mainWeaponIndex: number;
      offWeaponIndex: number;
      mainAttackBonus: number;
      offAttackBonus: number;
      mainPenalty: number;
      offPenalty: number;
      offDamageBonus: number;
      mainAtkValue: string;
      offAtkValue: string;
      offDmgValue: string;
      mainAttackString: string;
      offAttackString: string;
      offDamageString: string;
    }>;
  };
}

/**
 * Creates a character representation object for the client.
 * @param character The character object.
 * @returns A CharacterRep object.
 */
export function getCharacterRep(character: ICharacter): CharacterRep {
  const characterObject: CharacterRep = {
    docId: character.docId,
    parseWarnings: character.parseWarnings,
    parseErrors: character.parseErrors,
    parseSuccess: character.parseSuccess,
    name: character.name,
    rolzRoomId: character.rolzRoomId,
    race: character.race,
    classes: character.classes,
    initBonus: character.InitiativeBonus ? character.InitiativeBonus.state : null,
    damageBonus: character.damageBonus ? character.damageBonus.state : null,
    attacksOfOpportunity: character.attacksOfOpportunity ? character.attacksOfOpportunity.state : null,
    acp: character.acp ? character.acp.state : null,
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
    actions: [],
    battleGear: [],
    possessions: [],
    partyName: character.partyName,
    partyMembers: character.partyMembers,
    quickStatuses: character.quickStatuses,
    partiesDocId: typeof PropertiesService !== 'undefined'
      ? PropertiesService.getScriptProperties().getProperty('PARTIES_DOC_ID')
      : null
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

  // Add actions
  if (character.actions) {
    characterObject.actions = character.actions;
    const actionsMetadata: Record<string, any> = {};
    character.actions.forEach(actionName => {
      const action = ActionsData[actionName];
      if (action) {
        const isNumberAction = action instanceof NumberAction;
        actionsMetadata[actionName] = {
          name: actionName,
          acceptsNumber: isNumberAction,
          minNumber: isNumberAction ? (action as any).minNumber : undefined,
          maxNumber: isNumberAction ? (action as any).maxNumberResolver(character) : undefined,
          label: isNumberAction ? (action as any).label : undefined
        };
      }
    });
    characterObject.actionsMetadata = actionsMetadata;
  }

  // Add spell casting
  if (character.spellCasting) {
    characterObject.spellCasting = character.spellCasting.state;
  }

  // Add weapons
  if (character.weapons && character.weapons.length > 0) {
    // Map weapons with their original index for TWF index remapping
    const weaponsWithOrigIndex = character.weapons.map((weapon: any, origIdx: number) => {
      const normalFull = calculateNormalFullAttack(weapon, character);
      return {
        name: weapon.name,
        attackBonus: weapon.attackBonus ? weapon.attackBonus.state : null,
        damageBonus: weapon.damageBonus ? weapon.damageBonus.state : null,
        statsString: weapon.statsString,
        atkPartString: weapon.atkPartString,
        dmgPartString: weapon.dmgPartString,
        atkValue: weapon.atkValue,
        dmgValue: weapon.dmgValue,
        critValue: weapon.critValue,
        rolzAtkRollMessage: `#d20${weapon.attackBonus ? (weapon.attackBonus.bonus >= 0 ? '+' : '') + weapon.attackBonus.bonus : ''} #${weapon.name} Attack`,
        rolzDmgRollMessage: `#${weapon.dmgValue.replace(/\s+/g, '').replace(/[+-]0$/, '')} #${weapon.name} Damage`,
        fullAttack: {
          normal: normalFull,
          twfMain: {} as Record<number, any>,
          twfOff: {} as Record<number, any>
        },
        _origIndex: origIdx
      };
    });

    // Sort weapons alphabetically by name
    weaponsWithOrigIndex.sort((a, b) => a.name.localeCompare(b.name));

    // Build old-index → new-index mapping
    const indexRemap = new Map<number, number>();
    weaponsWithOrigIndex.forEach((w, newIdx) => {
      indexRemap.set(w._origIndex, newIdx);
    });

    // Calculate TWF data and remap indices to match sorted order
    const twfData = calculateTwf(character, character.weapons);
    const twfFull = calculateTwfFullAttack(character, character.weapons, twfData);

    if (twfData) {
      characterObject.twf = {
        hasTWF: twfData.hasTWF,
        hasImprovedTWF: twfData.hasImprovedTWF,
        hasGreaterTWF: twfData.hasGreaterTWF,
        combinations: twfData.combinations.map(c => ({
          ...c,
          mainWeaponIndex: indexRemap.get(c.mainWeaponIndex) ?? c.mainWeaponIndex,
          offWeaponIndex: indexRemap.get(c.offWeaponIndex) ?? c.offWeaponIndex
        }))
      };
    }

    // Populate TWF full attack maps with remapped indices
    weaponsWithOrigIndex.forEach(w => {
      const origIdx = w._origIndex;

      // Main: keyed by offWeaponIndex
      const mainTwf = twfFull.twfMain[origIdx];
      if (mainTwf) {
        Object.entries(mainTwf).forEach(([offOriginalIdxStr, sequence]) => {
          const offOriginalIdx = parseInt(offOriginalIdxStr);
          const offNewIdx = indexRemap.get(offOriginalIdx);
          if (offNewIdx !== undefined) {
            w.fullAttack.twfMain[offNewIdx] = sequence;
          }
        });
      }

      // Off: keyed by mainWeaponIndex
      const offTwf = twfFull.twfOff[origIdx];
      if (offTwf) {
        Object.entries(offTwf).forEach(([mainOriginalIdxStr, sequence]) => {
          const mainOriginalIdx = parseInt(mainOriginalIdxStr);
          const mainNewIdx = indexRemap.get(mainOriginalIdx);
          if (mainNewIdx !== undefined) {
            w.fullAttack.twfOff[mainNewIdx] = sequence;
          }
        });
      }
    });

    // Strip the _origIndex helper before assigning to rep
    characterObject.weapons = weaponsWithOrigIndex.map(({ _origIndex, ...rest }) => rest);
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
