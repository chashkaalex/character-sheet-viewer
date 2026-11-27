import { SaveNames } from './properties/saves';
import { SkillsAbilities } from './properties/skills';
import { AbilityName, AbilityNames } from './properties/abilities/ability_types';
import { StaticPropertyEffect, type EffectData } from './state/effects';
import type { ICharacter } from './icharacter';
import { registerConditions } from './state/conditions';

function resolveAbilityName(rawText: string): AbilityName | null {
  const normalized = rawText.trim().toLowerCase();
  const map: Record<string, AbilityName> = {
    str: 'Str',
    strength: 'Str',
    dex: 'Dex',
    dexterity: 'Dex',
    con: 'Con',
    constitution: 'Con',
    int: 'Int',
    intelligence: 'Int',
    wis: 'Wis',
    wisdom: 'Wis',
    cha: 'Cha',
    char: 'Cha',
    charisma: 'Cha'
  };
  return map[normalized] || null;
}

function buildAbilityDamageEffects(abilityName: AbilityName, rawDamageAmount: number, statusName: string): EffectData[] {
  const dmg = Math.abs(rawDamageAmount);
  return [
    {
      status: statusName,
      description: `${abilityName} Damage ${dmg}: Reduces effective ${abilityName} score by ${dmg} (every 2 points of ability damage applies a -1 penalty to ${abilityName}-based rolls and statistics).`,
      property: abilityName,
      modifierType: 'Generic',
      value: -dmg
    }
  ];
}

export type DynamicEffectGenerator = (parsedValue: number, statusName: string) => EffectData[];
export type ParameterizedEffectGenerator = (parameterText: string, statusName: string) => EffectData[];

export const StatusesEffects: Record<string, EffectData[]> = {};

export function registerStatusEffects(effects: Record<string, EffectData[]>): void {
  Object.assign(StatusesEffects, effects);
}

export function initializeGeneralEffects(): void {
  // Check if already initialized to avoid redundant work
  if (StatusesEffects['Keeping Grudge']) return;

  const keepingGrudgeEffects: EffectData[] = [
    {
      status: 'Keeping Grudge',
      property: 'attackBonus',
      modifierType: 'Circumstance',
      value: -2
    }
  ];

  SaveNames.forEach(saveName => {
    keepingGrudgeEffects.push({
      status: 'Keeping Grudge',
      property: saveName,
      modifierType: 'Circumstance',
      value: -2
    });
  });

  Object.keys(SkillsAbilities).forEach(skillName => {
    keepingGrudgeEffects.push({
      status: 'Keeping Grudge',
      property: skillName,
      modifierType: 'Circumstance',
      value: -2
    });
  });

  AbilityNames.forEach(abilityName => {
    keepingGrudgeEffects.push({
      status: 'Keeping Grudge',
      property: abilityName,
      modifierType: 'Circumstance',
      value: -2
    });
  });

  StatusesEffects['Keeping Grudge'] = keepingGrudgeEffects;

  // Register standard conditions (Shaken, Frightened, Panicked)
  registerConditions(StatusesEffects);

  // Invisible status effects
  StatusesEffects['Invisible'] = [
    {
      status: 'Invisible',
      property: 'attackBonus',
      modifierType: 'Generic',
      value: 2
    }
  ];
}

const DynamicStatusesEffects: Record<string, DynamicEffectGenerator> = {
  'Inspire Courage': (parsedValue, statusName) => [
    {
      status: statusName,
      property: 'Will',
      modifierType: 'Morale',
      valueResolver: (character: ICharacter) => character.HasStatus('Frightful Presence') ? parsedValue : 0
    },
    { status: statusName, property: 'attackBonus', modifierType: 'Morale', value: parsedValue },
    { status: statusName, property: 'damageBonus', modifierType: 'Morale', value: parsedValue }
  ],
  'Inspire Competence': (parsedValue, statusName) => {
    return Object.keys(SkillsAbilities).map(skillName => ({
      status: statusName,
      property: skillName,
      modifierType: 'Competence',
      value: parsedValue
    }));
  },
  'Inspire Greatness': (parsedValue, statusName) => [
    { status: statusName, property: 'attackBonus', modifierType: 'Competence', value: parsedValue },
    { status: statusName, property: 'Fort', modifierType: 'Competence', value: Math.max(0, parsedValue - 1) }
  ],
  'Inspire Heroics': (parsedValue, statusName) => {
    const effects: EffectData[] = [
      { status: statusName, property: 'ac', modifierType: 'Dodge', value: parsedValue }
    ];
    SaveNames.forEach(saveName => {
      effects.push({ status: statusName, property: saveName, modifierType: 'Morale', value: parsedValue });
    });
    return effects;
  },
  'Furious Counterstrike': (parsedValue, statusName) => {
    const bonus = Math.max(1, Math.floor(Math.abs(parsedValue) / 5));
    return [
      { status: statusName, property: 'attackBonus', modifierType: 'Generic', value: bonus },
      { status: statusName, property: 'damageBonus', modifierType: 'Generic', value: bonus }
    ];
  },
  'Combat Expertise': (parsedValue, statusName) => {
    const acBonus = Math.abs(parsedValue);
    return [
      { status: statusName, property: 'attackBonus', modifierType: 'Generic', value: parsedValue },
      { status: statusName, property: 'ac', modifierType: 'Dodge', value: acBonus }
    ];
  },
  'Power Attack': (parsedValue, statusName) => {
    const penalty = Math.abs(parsedValue);
    return [
      { status: statusName, property: 'meleeAttackBonus', modifierType: 'Generic', value: -penalty },
      {
        status: statusName,
        callback: (character: ICharacter) => {
          character.addGearEffect(statusName, '', {
            status: statusName,
            callback: (_char: ICharacter, gearArgs: Record<string, unknown>) => {
              const weapon = gearArgs['item'] as any;
              if (!weapon || !('rangeType' in weapon) || weapon.rangeType !== 'Melee' || !weapon.featDamageBonus) {
                return;
              }
              const isTwoHanded = weapon.encumbrance === 'Two-Handed' || Boolean(weapon.isTwoHandedWield);
              const isOneHandedOrUnarmed = weapon.encumbrance === 'One-Handed' || weapon.baseName === 'Unarmed';
              const dmgBonus = isTwoHanded ? penalty * 2 : (isOneHandedOrUnarmed ? penalty : 0);
              if (dmgBonus > 0) {
                weapon.featDamageBonus.applyEffect(
                  new StaticPropertyEffect({
                    status: statusName,
                    property: 'featDamageBonus',
                    modifierType: 'Generic',
                    value: dmgBonus
                  })
                );
              }
            }
          });
        }
      }
    ];
  },
  'Temp HP': (parsedValue, statusName) => {
    const tempVal = Math.max(0, parsedValue);
    return [
      {
        status: statusName,
        description: `Grants ${tempVal} temporary hit points (absorbs incoming damage before current HP).`,
        callback: (character: ICharacter) => {
          character.temporaryHp += tempVal;
        }
      }
    ];
  },
  'Temporary HP': (parsedValue, statusName) => {
    const tempVal = Math.max(0, parsedValue);
    return [
      {
        status: statusName,
        description: `Grants ${tempVal} temporary hit points (absorbs incoming damage before current HP).`,
        callback: (character: ICharacter) => {
          character.temporaryHp += tempVal;
        }
      }
    ];
  },
  'Nonlethal': (parsedValue, statusName) => {
    const nlVal = Math.max(0, parsedValue);
    return [
      {
        status: statusName,
        description: `${nlVal} points of nonlethal damage (Staggered when nonlethal == current HP; Unconscious when nonlethal > current HP).`,
        callback: (character: ICharacter) => {
          character.nonlethalDamage += nlVal;
        }
      }
    ];
  },
  'Nonlethal Damage': (parsedValue, statusName) => {
    const nlVal = Math.max(0, parsedValue);
    return [
      {
        status: statusName,
        description: `${nlVal} points of nonlethal damage (Staggered when nonlethal == current HP; Unconscious when nonlethal > current HP).`,
        callback: (character: ICharacter) => {
          character.nonlethalDamage += nlVal;
        }
      }
    ];
  },
  'Negative Level': (parsedValue, statusName) => {
    const count = Math.abs(parsedValue);
    const effects: EffectData[] = [
      {
        status: statusName,
        description: `${count} Negative Level${count !== 1 ? 's' : ''}: -${count} penalty on attack rolls, saving throws, skill checks, ability checks, and effective level (caster level); -${count * 5} max hit points.`
      },
      { status: statusName, property: 'attackBonus', modifierType: 'Generic', value: -count }
    ];
    SaveNames.forEach(saveName => {
      effects.push({ status: statusName, property: saveName, modifierType: 'Generic', value: -count });
    });
    Object.keys(SkillsAbilities).forEach(skillName => {
      effects.push({ status: statusName, property: skillName, modifierType: 'Generic', value: -count });
    });
    effects.push({
      status: statusName,
      callback: (character: ICharacter) => {
        character.hp.max -= count * 5;
        if (character.hp.current > character.hp.max) {
          character.hp.current = character.hp.max;
        }
        character.spellCasting?.classSpellCastingData?.forEach(casterData => {
          casterData.level.applyEffect(
            new StaticPropertyEffect({
              status: statusName,
              property: `casterLevel ${casterData.className}`,
              modifierType: 'Generic',
              value: -count
            })
          );
        });
      }
    });
    return effects;
  },
  'Negative Levels': (parsedValue, statusName) => {
    return DynamicStatusesEffects['Negative Level'](parsedValue, statusName);
  }
};

const ParameterizedStatusesEffects: Record<string, ParameterizedEffectGenerator> = {
  'Keen Edge': (targetWeaponName, statusName) => [
    {
      status: statusName,
      description: `Doubles the threat range of ${targetWeaponName} (does not stack with Keen or Improved Critical).`,
      callback: (character: ICharacter) => {
        if (!targetWeaponName) return;
        character.addGearEffect(statusName, targetWeaponName, {
          status: statusName,
          callback: (_char: ICharacter, gearArgs: Record<string, unknown>) => {
            const targetItem = gearArgs['item'] as any;
            if (targetItem && 'isKeen' in targetItem) {
              targetItem.isKeen = true;
            }
          }
        });
      }
    }
  ]
};

export function GetEffects(container: Record<string, any>, identifier: string): EffectData[] | null {
  // Try exact lookup first
  const effects = container[identifier];

  if (effects) {
    return effects.map((effect: any) => ({ ...effect }));
  }

  if (container === StatusesEffects) {
    // 1. Try dynamic numeric extraction (e.g., getting +3 out of "Inspire Courage +3")
    const dynamicMatch = identifier.match(/^(.+?)\s+([+-]?\d+)$/);
    if (dynamicMatch) {
      const baseName = dynamicMatch[1].trim();
      const numericValue = parseInt(dynamicMatch[2], 10);

      const dynamicEffectGenerator = DynamicStatusesEffects[baseName];
      if (dynamicEffectGenerator) {
        const generatedEffects = dynamicEffectGenerator(numericValue, identifier);
        return generatedEffects.map((effect: any) => ({ ...effect }));
      }

      // 1b. Check "<Ability> Damage N" (e.g., "Str Damage 4" or "Con Damage -2")
      const abilityDmgDirectMatch = baseName.match(/^([a-zA-Z]+)\s+Damage$/i);
      if (abilityDmgDirectMatch) {
        const abilityName = resolveAbilityName(abilityDmgDirectMatch[1]);
        if (abilityName) {
          return buildAbilityDamageEffects(abilityName, numericValue, identifier);
        }
      }

      // 1c. Check "Ability Damage (<Ability>) N" (e.g., "Ability Damage (Con) 4")
      const abilityDmgParenMatch = baseName.match(/^Ability\s+Damage\s*\(([^)]+)\)$/i);
      if (abilityDmgParenMatch) {
        const abilityName = resolveAbilityName(abilityDmgParenMatch[1]);
        if (abilityName) {
          return buildAbilityDamageEffects(abilityName, numericValue, identifier);
        }
      }
    }

    // 2. Try parameterized parenthesized extraction (e.g., getting "Longsword" out of "Keen Edge (Longsword)")
    const openParenIdx = identifier.indexOf('(');
    if (openParenIdx > 0 && identifier.endsWith(')')) {
      const baseName = identifier.substring(0, openParenIdx).trim();
      const paramText = identifier.substring(openParenIdx + 1, identifier.length - 1).trim();
      const paramGenerator = ParameterizedStatusesEffects[baseName];
      if (paramGenerator && paramText) {
        const generatedEffects = paramGenerator(paramText, identifier);
        return generatedEffects.map((effect: any) => ({ ...effect }));
      }
    }
  }

  return null;
}
