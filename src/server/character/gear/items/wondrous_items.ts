import { EffectData } from '../../state/effects';
import { ICharacter } from '@server/character/icharacter';
import { ActionsData } from '../../actions/actions_effects';
import { GetEffects } from '../../general_effects';

export interface ParametricWondrousItemRule {
  /** Base strings from which the parametric item matcher is constructed */
  baseStrings: string[];
  /** Allows prefix qualifiers before the base string (e.g. "Dragoncraft bracers of armor +2", "Ivory Ring of Deflection +1") */
  allowPrefix?: boolean;
  /** Optional fallback bonus when the item name omits "+N" (e.g. "Periapt of Wisdom (+4 Wis)", "Amulet of Mighty Fists") */
  defaultBonus?: number;
  /** Complement builder that produces EffectData[] for the resolved item name and numeric bonus */
  buildEffects: (itemName: string, bonus: number) => EffectData[];
}

/**
 * Base strings and complement builders for standard D&D 3.5 parametric wondrous items and rings.
 */
export const ParametricWondrousItemRules: ParametricWondrousItemRule[] = [
  {
    baseStrings: ['Belt of Giant Strength'],
    buildEffects: (status, value) => [
      { status, property: 'Str', modifierType: 'Enhancement', value }
    ]
  },
  {
    baseStrings: ['Gloves of Dexterity'],
    buildEffects: (status, value) => [
      { status, property: 'Dex', modifierType: 'Enhancement', value }
    ]
  },
  {
    baseStrings: ['Amulet of Health', 'Bracers of Health'],
    buildEffects: (status, value) => [
      { status, property: 'Con', modifierType: 'Enhancement', value }
    ]
  },
  {
    baseStrings: ['Headband of Intellect'],
    buildEffects: (status, value) => [
      { status, property: 'Int', modifierType: 'Enhancement', value }
    ]
  },
  {
    baseStrings: ['Periapt of Wisdom'],
    defaultBonus: 4,
    buildEffects: (status, value) => [
      { status, property: 'Wis', modifierType: 'Enhancement', value }
    ]
  },
  {
    baseStrings: ['Cloak of Charisma'],
    buildEffects: (status, value) => [
      { status, property: 'Cha', modifierType: 'Enhancement', value }
    ]
  },
  {
    baseStrings: ['Cloak of Resistance', 'Vest of Resistance'],
    buildEffects: (status, value) => [
      { status, property: 'Fort', modifierType: 'Resistance', value },
      { status, property: 'Ref', modifierType: 'Resistance', value },
      { status, property: 'Will', modifierType: 'Resistance', value }
    ]
  },
  {
    baseStrings: ['Ring of Protection', 'Ring of Deflection', 'Bone Ring'],
    allowPrefix: true,
    buildEffects: (status, value) => [
      { status, property: 'ac', modifierType: 'Deflection', value }
    ]
  },
  {
    baseStrings: ['Amulet of Natural Armor'],
    buildEffects: (status, value) => [
      { status, property: 'ac', modifierType: 'Natural Armor', value }
    ]
  },
  {
    baseStrings: ['Bracers of Armor'],
    allowPrefix: true,
    buildEffects: (status, value) => [
      { status, property: 'ac', modifierType: 'Armor', value }
    ]
  },
  {
    baseStrings: ['Amulet of Mighty Fists'],
    defaultBonus: 1,
    buildEffects: (status, value) => [
      {
        status,
        callback: (character: ICharacter) => {
          character.addGearEffect(status, 'Unarmed', {
            status,
            property: 'featAttackBonus',
            modifierType: 'Enhancement',
            value
          });
          character.addGearEffect(status, 'Unarmed', {
            status,
            property: 'featDamageBonus',
            modifierType: 'Enhancement',
            value
          });
        }
      }
    ]
  }
];

/**
 * Standard non-parametric D&D 3.5 wondrous items, rings, and outfits.
 */
export const StandardWondrousItems: Record<string, EffectData[]> = {
  'Ring of Storing': [
    {
      status: 'Ring of Storing',
      callback: (character: ICharacter) => {
        const ringItem = character.battleGear.find(i => i.name === 'Ring of Storing');
        const ringLine = ringItem?.line || character.sectionLines['Battle Gear']?.find(l => l.includes('Ring of Storing'));
        if (!ringLine) return;
        const match = ringLine.match(/\[(?:(\d+)x\s*)?([^\]]+)\]/);
        if (match) {
          const spellName = match[2].trim();
          const actionName = `Cast ${spellName}`;
          if (!ActionsData[actionName]) {
            ActionsData[actionName] = {
              statusName: spellName,
              category: 'item',
              calculateDuration: () => 10
            };
          }
          if (!character.actions.includes(actionName)) {
            character.actions.push(actionName);
          }
        }
      }
    }
  ],

  'Boots of Agile Leaping': [
    { status: 'Boots of Agile Leaping', property: 'Jump', modifierType: 'Generic', value: 5 }
  ],

  'Boots of Landing': [
    { status: 'Boots of Landing', property: 'Special', description: 'Slow Fall 20 ft.' },
    { status: 'Boots of Landing', property: 'Special', description: 'Feather Fall 1/day' },
    { status: 'Boots of Landing', property: 'Special', description: 'Cloud Step 3/day' }
  ],

  'Brooch of Shielding': [
    {
      status: 'Brooch of Shielding',
      property: 'Special',
      description: 'absorbs up to 101 points of damage from magic missile spells or spell-like abilities before melting and becoming useless'
    }
  ],

  'Explorer\'s Outfit Masterwork': [],

  'Elven Cloak': [
    { status: 'Elven Cloak', property: 'Hide', modifierType: 'Competence', value: 5 }
  ],

  'Ring of Chameleon Power': [
    {
      status: 'Ring of Chameleon Power',
      property: 'Special',
      description: 'As a free action, the wearer of this ring can gain the ability to magically blend in with the surroundings. This provides a +10 competence bonus on her Hide checks. '
    },
    {
      status: 'Ring of Chameleon Power',
      property: 'Special',
      description: 'As a standard action, she can also command the ring to utilize the spell disguise self as often as she wants.'
    },
    {
      status: 'Ring of Chameleon Power',
      callback: (character: ICharacter) => {
        if (!character.actions.includes('Chameleon Power (Hide +10)')) {
          character.actions.push('Chameleon Power (Hide +10)');
        }
        if (!character.actions.includes('Chameleon Power (Disguise Self)')) {
          character.actions.push('Chameleon Power (Disguise Self)');
        }
      }
    }
  ]
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Complement parser that resolves standard wondrous items (both static and parametric +N items
 * constructed from their base strings).
 */
export function ResolveStandardWondrousItemEffects(itemName: string, description: string = ''): EffectData[] | null {
  const trimmedName = itemName.trim();

  // 1. Check static standard wondrous items first (exact or case-insensitive match)
  const exactStatic = GetEffects(StandardWondrousItems, trimmedName);
  if (exactStatic) {
    return exactStatic;
  }
  const lowerName = trimmedName.toLowerCase();
  for (const key of Object.keys(StandardWondrousItems)) {
    if (key.toLowerCase() === lowerName) {
      return StandardWondrousItems[key].map(e => ({ ...e, status: trimmedName }));
    }
  }

  // 2. Check parametric wondrous item rules constructed from base strings
  for (const rule of ParametricWondrousItemRules) {
    for (const baseStr of rule.baseStrings) {
      const escapedBase = escapeRegExp(baseStr);
      const prefixPattern = rule.allowPrefix ? '^(?:.+\\s+)?' : '^';
      const bonusRegex = new RegExp(`${prefixPattern}${escapedBase}\\s+\\+(\\d+)$`, 'i');
      const match = trimmedName.match(bonusRegex);
      if (match) {
        const bonus = parseInt(match[1], 10);
        return rule.buildEffects(trimmedName, bonus);
      }

      // Check bare base string when defaultBonus is configured (e.g. "Periapt of Wisdom (+4 Wis)", "Amulet of Mighty Fists")
      if (rule.defaultBonus !== undefined) {
        const bareRegex = new RegExp(`${prefixPattern}${escapedBase}$`, 'i');
        if (bareRegex.test(trimmedName)) {
          const descBonusMatch = description.match(/\+(\d+)/);
          const bonus = descBonusMatch ? parseInt(descBonusMatch[1], 10) : rule.defaultBonus;
          return rule.buildEffects(trimmedName, bonus);
        }
      }
    }
  }

  return null;
}
