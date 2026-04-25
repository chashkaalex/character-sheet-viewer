/**
 * Domain constants for the Character Sheet Viewer.
 * Many of these should eventually move to a database.
 */

export const AbilityNames = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'] as const;
export type AbilityName = typeof AbilityNames[number] | 'None';

export const SaveNames = ['Fort', 'Ref', 'Will'] as const;
export type SaveName = typeof SaveNames[number];

export interface SizeInfo {
  name: string;
  next: string;
  previous: string;
  modifier: number;
  bonus: number;
}

export const Sizes: Record<string, SizeInfo> = {
  'Fine': { name: 'Fine', next: 'Diminutive', previous: 'Fine', modifier: 8, bonus: -16 },
  'Diminutive': { name: 'Diminutive', next: 'Tiny', previous: 'Fine', modifier: 4, bonus: -12 },
  'Tiny': { name: 'Tiny', next: 'Small', previous: 'Diminutive', modifier: 2, bonus: -8 },
  'Small': { name: 'Small', next: 'Medium', previous: 'Tiny', modifier: 1, bonus: -4 },
  'Medium': { name: 'Medium', next: 'Large', previous: 'Small', modifier: 0, bonus: 0 },
  'Large': { name: 'Large', next: 'Huge', previous: 'Medium', modifier: -1, bonus: 4 },
  'Huge': { name: 'Huge', next: 'Gargantuan', previous: 'Large', modifier: -2, bonus: 8 },
  'Gargantuan': { name: 'Gargantuan', next: 'Colossal', previous: 'Huge', modifier: -4, bonus: 12 },
  'Colossal': { name: 'Colossal', next: 'Colossal', previous: 'Gargantuan', modifier: -8, bonus: 16 }
} as const;

export const Resistances = [
  'Acid',
  'Cold',
  'Fire',
  'Electricity',
  'Sonic',
  'Poison'
] as const;

export const Races = [
  'Dwarf',
  'Elf',
  'Half-Elf',
  'Gnome',
  'Halfling',
  'Human',
  'Orc',
  'Half-Orc',
  'Troll',
  'Goblin',
  'Kobold',
  'Lizardfolk'
] as const;

export const SpellcasterClasses = [
  'Wizard',
  'Sorcerer',
  'Cleric',
  'Paladin',
  'Druid',
  'Ranger',
  'Bard',
  'Archmage',
  'Sacred Fist'
] as const;

export const SkillsAbilities: Record<string, AbilityName | 'None'> = {
  'Appraise': 'Int',
  'Balance': 'Dex',
  'Bluff': 'Cha',
  'Climb': 'Str',
  'Concentration': 'Con',
  'Craft': 'Int',
  'Decipher Script': 'Int',
  'Diplomacy': 'Cha',
  'Disable Device': 'Int',
  'Disguise': 'Cha',
  'Escape Artist': 'Dex',
  'Forgery': 'Int',
  'Gather Information': 'Cha',
  'Handle Animal': 'Cha',
  'Heal': 'Wis',
  'Hide': 'Dex',
  'Intimidate': 'Cha',
  'Jump': 'Str',
  'Knowledge (arcana)': 'Int',
  'Knowledge (architecture and engineering)': 'Int',
  'Knowledge (dungeoneering)': 'Int',
  'Knowledge (geography)': 'Int',
  'Knowledge (history)': 'Int',
  'Knowledge (local)': 'Int',
  'Knowledge (nature)': 'Int',
  'Knowledge (nobility and royalty)': 'Int',
  'Knowledge (religion)': 'Int',
  'Knowledge (the planes)': 'Int',
  'Listen': 'Wis',
  'Move Silently': 'Dex',
  'Open Lock': 'Dex',
  'Perform': 'Cha',
  'Profession': 'Wis',
  'Ride': 'Dex',
  'Search': 'Int',
  'Sense Motive': 'Wis',
  'Sleight of Hand': 'Dex',
  'Speak Language': 'None',
  'Spellcraft': 'Int',
  'Spot': 'Wis',
  'Survival': 'Wis',
  'Swim': 'Str',
  'Tumble': 'Dex',
  'Use Magic Device': 'Cha',
  'Use Rope': 'Dex'
} as const;

export const SkillsSynergyReversed: Record<string, string[]> = {
  'Appraise': ['Craft'],
  'Balance': ['Tumble'],
  'Climb': ['Use Rope'],
  'Diplomacy': [
    'Bluff',
    'Knowledge (nobility and royalty)',
    'Sense Motive'
  ],
  'Disguise': ['Bluff'],
  'Escape Artist': ['Use Rope'],
  'Gather Information': ['Knowledge (local)'],
  'Intimidate': ['Bluff'],
  'Jump': ['Tumble'],
  'Knowledge (nature)': ['Survival'],
  'Ride': ['Handle Animal'],
  'Search': ['Knowledge (architecture and engineering)'],
  'Sleight of Hand': ['Bluff'],
  'Spellcraft': [
    'Knowledge (arcana)',
    'Use Magic Device'
  ],
  'Survival': [
    'Knowledge (dungeoneering)',
    'Knowledge (geography)',
    'Knowledge (nature)',
    'Knowledge (the planes)',
    'Search'
  ],
  'Tumble': ['Jump'],
  'Use Magic Device': [
    'Decipher Script',
    'Spellcraft'
  ],
  'Use Rope': ['Escape Artist']
} as const;

export const SpecialAttackNames = [
  'Aid another',
  'Bull rush',
  'Charge',
  'Disarm',
  'Feint',
  'Grapple',
  'Mounted Combat',
  'Overrun',
  'Sunder',
  'Throw splash weapon',
  'Trip',
  'Turn (rebuke) undead',
  'Two-weapon fighting'
] as const;

export interface ModifierTypeInfo {
  isStackable: boolean;
  againstTouch: boolean;
}

export const ModifierTypes = {
  'Ability': { isStackable: true, againstTouch: false },
  'Alchemical': { isStackable: false, againstTouch: false },
  'Circumstance': { isStackable: true, againstTouch: false },
  'Competence': { isStackable: false, againstTouch: false },
  'Deflection': { isStackable: false, againstTouch: true },
  'Dodge': { isStackable: true, againstTouch: true },
  'Enhancement': { isStackable: false, againstTouch: false },
  'Insight': { isStackable: false, againstTouch: false },
  'Luck': { isStackable: false, againstTouch: false },
  'Morale': { isStackable: false, againstTouch: false },
  'Natural Armor': { isStackable: false, againstTouch: false },
  'Profane': { isStackable: false, againstTouch: false },
  'Racial': { isStackable: false, againstTouch: false },
  'Resistance': { isStackable: false, againstTouch: false },
  'Sacred': { isStackable: false, againstTouch: false },
  'Size': { isStackable: false, againstTouch: false },
  'Shield': { isStackable: false, againstTouch: false },
  'Armor': { isStackable: false, againstTouch: false },
  'Mage Armor': { isStackable: false, againstTouch: true },
  'Generic': { isStackable: true, againstTouch: false }
} as const;

export type ModifierType = keyof typeof ModifierTypes;

export const VisionTypes = {
  'Regular': { description: 'Needs light source to see.' },
  'Darkvision': { description: 'Can see in darkness.' },
  'Low-light': { description: 'Can see in dim light.' }
} as const;

export type VisionType = keyof typeof VisionTypes;

