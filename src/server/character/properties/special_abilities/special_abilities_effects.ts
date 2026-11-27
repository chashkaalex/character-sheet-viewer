import { ClassesData } from '../../../classes_data/classes_general_data';
import { ICharacter } from '../../icharacter';
import { EffectData, MutatingEffectData, StaticPropertyEffect } from '../../state/effects';

const ALL_SPELL_SCHOOLS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
  'Universal'
] as const;

/**
 * Extracts the canonical base name of a Special Ability line by stripping trailing commas/periods,
 * parenthesized summary details (e.g. "AC Bonus (+3)," -> "AC Bonus", "Slow fall 30ft.," -> "Slow fall"),
 * or trailing numeric summaries (e.g. "Steely Resolve 15," -> "Steely Resolve").
 */
export function extractSpecialAbilityBaseName(line: string): string {
  let clean = line.trim().replace(/[,.;]+$/, '').trim();
  // Strip everything from the first '(' onward if there's a name before it
  const parenIdx = clean.indexOf('(');
  if (parenIdx > 0) {
    clean = clean.substring(0, parenIdx).trim();
  }
  // Strip trailing distance/number tokens like "30ft." or "15"
  clean = clean.replace(/\s+\d+(?:\s*ft\.?)?$/i, '').trim();
  clean = clean.replace(/[,.;]+$/, '').trim();
  return clean;
}

/**
 * Checks whether a special ability base name is a standard class ability already granted/computed
 * by one of the character's classes in `ClassesData`.
 */
export function isClassDerivedSpecialAbility(character: Readonly<ICharacter>, abilityOrLine: string): boolean {
  const baseName = extractSpecialAbilityBaseName(abilityOrLine).toLowerCase();
  if (!baseName) return false;

  for (const charClass of character.classes || []) {
    const classData = ClassesData.get(charClass.name);
    if (!classData?.classAbilities) continue;
    for (const classAbility of classData.classAbilities) {
      if (classAbility.trim().toLowerCase() === baseName) {
        return true;
      }
    }
  }
  return false;
}

function buildSchoolSpellPowerEffects(defaultSchool: string): EffectData[] {
  return [
    {
      status: `${defaultSchool} Spell Power`,
      description: `Increases caster level for ${defaultSchool} spells and reduces caster level for spells of other schools.`,
      callback: (character: ICharacter, args: Record<string, unknown>) => {
        const rawLine = (args['rawLine'] as string) || '';
        const unseeenSeerLevel = character.GetClassLevel('Unseen Seer');
        const defaultTier = unseeenSeerLevel >= 3 ? Math.floor(unseeenSeerLevel / 3) : 1;

        let bonusCl = defaultTier;
        let penaltyCl = -defaultTier;

        const bonusMatch = rawLine.match(/\+(\d+)\s*CL\s+to\s+[A-Za-z]+/i);
        const penaltyMatch = rawLine.match(/(-\d+)\s*CL\s+to\s+other\s+schools/i);
        if (bonusMatch) bonusCl = parseInt(bonusMatch[1], 10);
        if (penaltyMatch) penaltyCl = parseInt(penaltyMatch[1], 10);

        const statusLabel = `${defaultSchool} Spell Power`;
        ALL_SPELL_SCHOOLS.forEach(school => {
          const propName = `casterLevelSchool (${school})`;
          const prop = character.GetModifiableProperty(propName);
          if (!character.HasPropertyInitialized(propName)) {
            character.registerProperty(propName, prop);
          }
          prop.applyEffect(
            new StaticPropertyEffect({
              status: statusLabel,
              property: propName,
              modifierType: 'Generic',
              value: school.toLowerCase() === defaultSchool.toLowerCase() ? bonusCl : penaltyCl
            })
          );
        });
      }
    } as MutatingEffectData
  ];
}

export const SpecialAbilitiesEffects: Record<string, EffectData[]> = {
  'Illusion Spell Power': buildSchoolSpellPowerEffects('Illusion'),
  'Divination Spell Power': buildSchoolSpellPowerEffects('Divination'),
  'Abjuration Spell Power': buildSchoolSpellPowerEffects('Abjuration'),
  'Conjuration Spell Power': buildSchoolSpellPowerEffects('Conjuration'),
  'Enchantment Spell Power': buildSchoolSpellPowerEffects('Enchantment'),
  'Evocation Spell Power': buildSchoolSpellPowerEffects('Evocation'),
  'Necromancy Spell Power': buildSchoolSpellPowerEffects('Necromancy'),
  'Transmutation Spell Power': buildSchoolSpellPowerEffects('Transmutation'),

  'Martial School': [
    {
      status: 'Martial School',
      description: 'Martial School (Hand and Foot): Monastic combat school training.'
    }
  ],
  'Secrets of the Diplomat': [
    {
      status: 'Secrets of the Diplomat',
      description: 'Secrets of the Diplomat (Extended Spell List).'
    }
  ],
  'Penetrating Strike': [
    {
      status: 'Penetrating Strike',
      description: 'Penetrating Strike (Dungeonscape ACF): Deal half sneak attack dice as untyped damage when flanking creatures immune to sneak attack.'
    }
  ],
  'Poison Use': [
    {
      status: 'Poison Use',
      description: 'Never risk accidentally poisoning yourself when applying poison to a blade.'
    }
  ],
  'Spell Reflection': [
    {
      status: 'Spell Reflection',
      description: 'Spell Reflection (Complete Mage ACF): As an immediate action, reflect a spell or ranged spell attack that misses you back at its caster.'
    }
  ],
  'Trapmaking': [
    {
      status: 'Trapmaking',
      description: 'Craft and deploy mechanical/booby traps.'
    }
  ],
  'Sense Natural Magic': [
    {
      status: 'Sense Natural Magic',
      description: 'Sense natural magical phenomena.'
    }
  ],
  'Axe Focus': [
    {
      status: 'Axe Focus',
      description: 'Focused training with axes.'
    }
  ],
  'Racial Foes': [
    {
      status: 'Racial Foes',
      description: '+2 damage against Orcs, Goblinoids, and Giants.'
    }
  ]
};

export const BonusAbilitiesEffects: Record<string, EffectData[]> = {
  'School Bonus': [
    {
      status: 'School Bonus',
      description: '+2 bonus on Balance; with 9+ base Balance ranks, +2 bonus on attacks of opportunity against bull rush or trip attempts and +4 on Dexterity or Strength checks to resist being tripped or bull rushed.'
    }
  ],
  'Fey creatures regard you as though you were fey': [
    {
      status: 'Fey Affinity',
      description: 'Fey creatures regard you as though you were fey.'
    }
  ],
  '+1 on Bardic Knowledge on Yuan-Ti Culture': [
    {
      status: 'Yuan-Ti Culture Lore',
      description: '+1 bonus on Bardic Knowledge checks regarding Yuan-Ti Culture.'
    }
  ],
  'Decipher Script +1': [
    {
      status: 'Ioun Temple Training',
      description: 'Decipher Script +1 (From Ioun Temple).'
    }
  ],
  'Knowledge (dungeoneering) +1': [
    {
      status: 'Dungeoneering Book',
      description: 'Knowledge (dungeoneering) +1 (Book).'
    }
  ],
  'Knowledge (architecture and engineering) +1': [
    {
      status: 'Home Training (Architecture)',
      description: 'Knowledge (architecture and engineering) +1 (From home).'
    }
  ],
  'Knowledge (arcana - Dragons 101) +1': [
    {
      status: 'Dragons 101',
      description: 'Knowledge (arcana - Dragons 101) +1 (From home).'
    }
  ]
};
