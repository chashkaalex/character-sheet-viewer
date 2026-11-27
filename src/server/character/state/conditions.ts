import { ICharacter } from '../icharacter';
import { AbilityNames } from '../properties/abilities/ability_types';
import { SaveNames } from '../properties/saves';
import { SkillsAbilities } from '../properties/skills';
import { EffectData } from './effects';

export const FearConditions = ['Shaken', 'Frightened', 'Panicked'] as const;

export const CoreConditions = [
  'Shaken',
  'Frightened',
  'Panicked',
  'Fatigued',
  'Exhausted',
  'Sickened',
  'Nauseated',
  'Dazzled',
  'Blinded',
  'Deafened',
  'Entangled',
  'Prone',
  'Grappling',
  'Stunned',
  'Cowering',
  'Paralyzed',
  'Helpless',
  'Squeezing',
  'Disabled',
  'Dying',
  'Dead',
  'Staggered',
  'Unconscious'
] as const;

export const TacticalCombatStatuses = [
  'Cover',
  'Soft Cover',
  'Improved Cover',
  'Concealment',
  'Total Concealment',
  'Flanking',
  'Higher Ground'
] as const;

const FEAR_CONDITION_DESCRIPTIONS: Record<(typeof FearConditions)[number], string> = {
  Shaken: 'Takes a -2 penalty on attack rolls, saving throws, skill checks, and ability checks.',
  Frightened: 'Takes a -2 penalty on attack rolls, saving throws, skill checks, and ability checks; must flee from the source of fear (may fight if unable to flee).',
  Panicked: 'Takes a -2 penalty on attack rolls, saving throws, skill checks, and ability checks; must drop anything held and flee at top speed (cowers if cornered).'
};

const STATUSES_REMOVED_BY_STATUS: Record<string, readonly string[]> = {
  'remove fear': FearConditions,
  'frightened': ['Shaken'],
  'panicked': ['Shaken', 'Frightened'],
  'exhausted': ['Fatigued'],
  'fatigued': ['Exhausted'],
  'disabled': ['Dying', 'Dead'],
  'dying': ['Disabled', 'Dead'],
  'dead': ['Disabled', 'Dying', 'Staggered', 'Unconscious'],
  'staggered': ['Unconscious'],
  'unconscious': ['Staggered'],
  'lesser restoration': ['Fatigued'],
  'heal': [
    'Blinded',
    'Dazzled',
    'Deafened',
    'Exhausted',
    'Fatigued',
    'Nauseated',
    'Sickened',
    'Stunned'
  ]
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

function createLosesDexToAcCallback(statusName: string): EffectData {
  return {
    status: statusName,
    callback: (character: ICharacter) => {
      if (character.ac) {
        character.ac.losesDexToAc = true;
      }
    }
  };
}

function createHalfSpeedEffect(statusName: string): EffectData {
  return {
    status: statusName,
    property: 'speed',
    modifierType: 'Generic',
    valueResolver: (character: Readonly<ICharacter>) => -Math.floor(character.speed.currentScore / 2)
  };
}

/**
 * Registers D&D 3.5 condition status effects and tactical combat modifiers into the global status effects map.
 */
export function registerConditions(statusesEffects: Record<string, EffectData[]>): void {
  // 1. Fear conditions (Shaken, Frightened, Panicked)
  FearConditions.forEach(conditionName => {
    statusesEffects[conditionName] = createFearConditionEffects(
      conditionName,
      FEAR_CONDITION_DESCRIPTIONS[conditionName]
    );
  });

  // 2. Fatigued & Exhausted
  statusesEffects['Fatigued'] = [
    {
      status: 'Fatigued',
      description: 'Cannot run or charge; takes a -2 penalty to Strength and Dexterity. Doing anything that would normally cause fatigue causes the fatigued character to become exhausted. After 8 hours of complete rest, fatigued characters are no longer fatigued.'
    },
    { status: 'Fatigued', property: 'Str', modifierType: 'Generic', value: -2 },
    { status: 'Fatigued', property: 'Dex', modifierType: 'Generic', value: -2 }
  ];

  statusesEffects['Exhausted'] = [
    {
      status: 'Exhausted',
      description: 'Moves at half speed, cannot run or charge, and takes a -6 penalty to Strength and Dexterity. After 1 hour of complete rest, an exhausted character becomes fatigued.'
    },
    { status: 'Exhausted', property: 'Str', modifierType: 'Generic', value: -6 },
    { status: 'Exhausted', property: 'Dex', modifierType: 'Generic', value: -6 },
    createHalfSpeedEffect('Exhausted')
  ];

  // 3. Sickened & Nauseated
  const sickenedEffects: EffectData[] = [
    {
      status: 'Sickened',
      description: 'Takes a -2 penalty on all attack rolls, weapon damage rolls, saving throws, skill checks, and ability checks.'
    },
    { status: 'Sickened', property: 'attackBonus', modifierType: 'Generic', value: -2 },
    { status: 'Sickened', property: 'damageBonus', modifierType: 'Generic', value: -2 }
  ];
  SaveNames.forEach(saveName => {
    sickenedEffects.push({ status: 'Sickened', property: saveName, modifierType: 'Generic', value: -2 });
  });
  Object.keys(SkillsAbilities).forEach(skillName => {
    sickenedEffects.push({ status: 'Sickened', property: skillName, modifierType: 'Generic', value: -2 });
  });
  statusesEffects['Sickened'] = sickenedEffects;

  statusesEffects['Nauseated'] = [
    {
      status: 'Nauseated',
      description: 'Experiencing stomach distress. Unable to attack, cast spells, concentrate on spells, or do anything else requiring attention. The only action such a character can take is a single move action per turn.'
    }
  ];

  // 4. Dazzled, Blinded & Deafened
  statusesEffects['Dazzled'] = [
    {
      status: 'Dazzled',
      description: 'Unable to see well because of overstimulation of the eyes. Takes a -1 penalty on attack rolls, Search checks, and Spot checks.'
    },
    { status: 'Dazzled', property: 'attackBonus', modifierType: 'Generic', value: -1 },
    { status: 'Dazzled', property: 'Search', modifierType: 'Generic', value: -1 },
    { status: 'Dazzled', property: 'Spot', modifierType: 'Generic', value: -1 }
  ];

  const blindedEffects: EffectData[] = [
    {
      status: 'Blinded',
      description: 'Takes a -2 penalty to Armor Class, loses Dexterity bonus to AC (if any), moves at half speed, and takes a -4 penalty on Search checks and on most Strength- and Dexterity-based skill checks. All opponents are considered to have total concealment (50% miss chance) to the blinded character.'
    },
    { status: 'Blinded', property: 'ac', modifierType: 'Generic', value: -2 },
    createLosesDexToAcCallback('Blinded'),
    { status: 'Blinded', property: 'Search', modifierType: 'Generic', value: -4 }
  ];
  Object.entries(SkillsAbilities).forEach(([skillName, abilityName]) => {
    if (abilityName === 'Str' || abilityName === 'Dex') {
      blindedEffects.push({ status: 'Blinded', property: skillName, modifierType: 'Generic', value: -4 });
    }
  });
  statusesEffects['Blinded'] = blindedEffects;

  statusesEffects['Deafened'] = [
    {
      status: 'Deafened',
      description: 'Cannot hear. Takes a -4 penalty on initiative checks, automatically fails Listen checks, and has a 20% chance of spell failure when casting spells with verbal components.'
    },
    { status: 'Deafened', property: 'InitiativeBonus', modifierType: 'Generic', value: -4 }
  ];

  // 5. Entangled, Prone, Grappling, Squeezing
  statusesEffects['Entangled'] = [
    {
      status: 'Entangled',
      description: 'Ensnared. Moves at half speed, cannot run or charge, takes a -2 penalty on all attack rolls and a -4 penalty to Dexterity. Casting a spell while entangled requires a Concentration check (DC 15 + spell level).'
    },
    { status: 'Entangled', property: 'attackBonus', modifierType: 'Generic', value: -2 },
    { status: 'Entangled', property: 'Dex', modifierType: 'Generic', value: -4 },
    createHalfSpeedEffect('Entangled')
  ];

  statusesEffects['Prone'] = [
    {
      status: 'Prone',
      description: 'Lying on the ground. Takes a -4 penalty on melee attack rolls and cannot use a ranged weapon (except for a crossbow). Gains a +4 bonus to Armor Class against ranged attacks, but takes a -4 penalty to AC against melee attacks. Standing up is a move-equivalent action that provokes an attack of opportunity.'
    },
    { status: 'Prone', property: 'meleeAttackBonus', modifierType: 'Generic', value: -4 }
  ];

  statusesEffects['Grappling'] = [
    {
      status: 'Grappling',
      description: 'Engaged in a wrestle/hold. Loses Dexterity bonus to AC against opponents you aren\'t grappling, cannot move, and takes a -2 penalty on attack rolls (can only attack with unarmed strike, natural weapon, or light weapon).'
    },
    createLosesDexToAcCallback('Grappling'),
    { status: 'Grappling', property: 'attackBonus', modifierType: 'Generic', value: -2 }
  ];

  statusesEffects['Squeezing'] = [
    {
      status: 'Squeezing',
      description: 'Squeezing through or into a space at least half as wide as normal space. Each move into or through a narrow space counts as 2 squares (half speed), and you take a -4 penalty on attack rolls and a -4 penalty to AC.'
    },
    { status: 'Squeezing', property: 'attackBonus', modifierType: 'Generic', value: -4 },
    { status: 'Squeezing', property: 'ac', modifierType: 'Generic', value: -4 },
    createHalfSpeedEffect('Squeezing')
  ];

  // 6. Stunned, Cowering, Paralyzed, Helpless
  statusesEffects['Stunned'] = [
    {
      status: 'Stunned',
      description: 'Drops everything held, can\'t take actions, takes a -2 penalty to AC, and loses Dexterity bonus to AC (if any).'
    },
    { status: 'Stunned', property: 'ac', modifierType: 'Generic', value: -2 },
    createLosesDexToAcCallback('Stunned')
  ];

  statusesEffects['Cowering'] = [
    {
      status: 'Cowering',
      description: 'Frozen in fear and can take no actions. Takes a -2 penalty to Armor Class and loses Dexterity bonus to AC (if any).'
    },
    { status: 'Cowering', property: 'ac', modifierType: 'Generic', value: -2 },
    createLosesDexToAcCallback('Cowering')
  ];

  const createParalyzedEffects = (statusName: string): EffectData[] => [
    {
      status: statusName,
      description: 'Frozen in place and unable to move or act physically. Effective Strength and Dexterity scores drop to 0 (-5 modifier), loses Dexterity bonus to AC, and is helpless (melee attackers get +4 to attack and can deliver a coup de grace).'
    },
    {
      status: statusName,
      property: 'Str',
      modifierType: 'Generic',
      valueResolver: (character: Readonly<ICharacter>) => -(character.abilities?.Str?.currentScore ?? 0)
    },
    {
      status: statusName,
      property: 'Dex',
      modifierType: 'Generic',
      valueResolver: (character: Readonly<ICharacter>) => -(character.abilities?.Dex?.currentScore ?? 0)
    },
    createLosesDexToAcCallback(statusName)
  ];

  statusesEffects['Paralyzed'] = createParalyzedEffects('Paralyzed');
  statusesEffects['Helpless'] = createParalyzedEffects('Helpless');

  // 6b. Health & Nonlethal Threshold Conditions (Disabled, Dying, Dead, Staggered, Unconscious)
  statusesEffects['Disabled'] = [
    {
      status: 'Disabled',
      description: 'At 0 hit points (or negative HP with Diehard). You are conscious and can take only a single move or standard action each turn (not both, nor full-round actions). Performing any standard action (or strenuous move) deals 1 point of damage after the action completes, dropping you to -1 HP and dying unless the action healed you.'
    }
  ];

  statusesEffects['Dying'] = [
    {
      status: 'Dying',
      description: 'Near death (-1 to -9 hit points). Unconscious, helpless (effective Dex 0, loses Dex bonus to AC, melee attackers gain +4 attack), and can take no actions. At the end of each turn, roll d% (10% chance to become stable; otherwise lose 1 HP). Dies at -10 HP.'
    },
    {
      status: 'Dying',
      property: 'Dex',
      modifierType: 'Generic',
      valueResolver: (character: Readonly<ICharacter>) => -(character.abilities?.Dex?.currentScore ?? 0)
    },
    createLosesDexToAcCallback('Dying')
  ];

  statusesEffects['Dead'] = [
    {
      status: 'Dead',
      description: 'Reduced to -10 hit points or lower (or Constitution reduced to 0). The character\'s soul leaves their body and they cannot act or benefit from normal healing without resurrection magic.'
    },
    createLosesDexToAcCallback('Dead')
  ];

  statusesEffects['Staggered'] = [
    {
      status: 'Staggered',
      description: 'Nonlethal damage exactly equals current hit points. You can only take a single move or standard action each turn (not both, nor can you take full-round actions).'
    }
  ];

  statusesEffects['Unconscious'] = [
    {
      status: 'Unconscious',
      description: 'Knocked out and helpless (nonlethal damage exceeds current hit points, or reduced below 0 HP). Effective Dexterity drops to 0 (-5 modifier), loses Dexterity bonus to AC, and melee attackers gain a +4 bonus.'
    },
    {
      status: 'Unconscious',
      property: 'Dex',
      modifierType: 'Generic',
      valueResolver: (character: Readonly<ICharacter>) => -(character.abilities?.Dex?.currentScore ?? 0)
    },
    createLosesDexToAcCallback('Unconscious')
  ];

  // 7. Tactical Combat Modifiers (Cover, Concealment, Flanking, Higher Ground)
  statusesEffects['Cover'] = [
    {
      status: 'Cover',
      description: 'Grants a +4 bonus to AC and a +2 bonus on Reflex saves against attacks originating from behind the cover. You cannot be the target of attacks of opportunity from an opponent you have cover against.'
    },
    { status: 'Cover', property: 'ac', modifierType: 'Generic', value: 4 },
    { status: 'Cover', property: 'Ref', modifierType: 'Generic', value: 2 }
  ];

  statusesEffects['Soft Cover'] = [
    {
      status: 'Soft Cover',
      description: 'Creatures (even enemies) between you and a ranged attacker provide a +4 bonus to AC against ranged attacks, but provide no bonus on Reflex saves.'
    },
    { status: 'Soft Cover', property: 'ac', modifierType: 'Generic', value: 4 }
  ];

  statusesEffects['Improved Cover'] = [
    {
      status: 'Improved Cover',
      description: 'Grants a +8 bonus to AC, a +4 bonus on Reflex saves, a +10 bonus on Hide checks, and Improved Evasion against attacks originating from behind the cover.'
    },
    { status: 'Improved Cover', property: 'ac', modifierType: 'Generic', value: 8 },
    { status: 'Improved Cover', property: 'Ref', modifierType: 'Generic', value: 4 },
    { status: 'Improved Cover', property: 'Hide', modifierType: 'Generic', value: 10 }
  ];

  statusesEffects['Concealment'] = [
    {
      status: 'Concealment',
      description: '20% miss chance on all attacks against you. You cannot be the target of precision damage (such as Sneak Attack) from attackers affected by the concealment, and you can make Hide checks.'
    }
  ];

  statusesEffects['Total Concealment'] = [
    {
      status: 'Total Concealment',
      description: '50% miss chance on all attacks against you. An attacker cannot use sight to locate you, must guess your square, and cannot make attacks of opportunity against you.'
    }
  ];

  statusesEffects['Flanking'] = [
    {
      status: 'Flanking',
      description: 'Grants a +2 flanking bonus on melee attack rolls against the flanked opponent (and enables Sneak Attack if the target is not immune).'
    },
    { status: 'Flanking', property: 'meleeAttackBonus', modifierType: 'Generic', value: 2 }
  ];

  statusesEffects['Higher Ground'] = [
    {
      status: 'Higher Ground',
      description: 'Grants a +1 bonus on melee attack rolls against opponents below you.'
    },
    { status: 'Higher Ground', property: 'meleeAttackBonus', modifierType: 'Generic', value: 1 }
  ];
}

/**
 * Returns any active statuses that should be removed when the given status is applied.
 */
export function getStatusesRemovedBy(statusName: string): readonly string[] {
  if (!statusName) return [];
  return STATUSES_REMOVED_BY_STATUS[statusName.trim().toLowerCase()] || [];
}
