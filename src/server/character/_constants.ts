/**
 * Domain constants for the Character Sheet Viewer.
 * Many of these should eventually move to a database.
 */

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
