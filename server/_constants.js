//much of what is here should be in some form of a DB, rather than a static object
//in the future, we should use a DB to store names of possible classes, races, etc.
//so that each DM would be able to create their own for their campaign

const abilityNames = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Char'];
const saveNames = ['Fort', 'Ref', 'Will'];

const Sizes = {
  'Fine': { name: 'Fine', next: 'Diminutive', previous: 'Fine', modifier: 8, bonus: -16 },
  'Diminutive': { name: 'Diminutive', next: 'Tiny', previous: 'Fine', modifier: 4, bonus: -12 },
  'Tiny': { name: 'Tiny', next: 'Small', previous: 'Diminutive', modifier: 2, bonus: -8 },
  'Small': { name: 'Small', next: 'Medium', previous: 'Tiny', modifier: 1, bonus: -4 },
  'Medium': { name: 'Medium', next: 'Large', previous: 'Small', modifier: 0, bonus: 0 },
  'Large': { name: 'Large', next: 'Huge', previous: 'Medium', modifier: -1, bonus: 4 },
  'Huge': { name: 'Huge', next: 'Gargantuan', previous: 'Large', modifier: -2, bonus: 8 },
  'Gargantuan': { name: 'Gargantuan', next: 'Colossal', previous: 'Huge', modifier: -4, bonus: 12 },
  'Colossal': { name: 'Colossal', next: 'Colossal', previous: 'Gargantuan', modifier: -8, bonus: 16 }
};

const resistances = [
  'Acid',
  'Cold',
  'Fire',
  'Electricity',
  'Sonic',
  'Poison'
];

const races = [
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
];

const spellcasterClasses = [
  'Wizard',
  'Sorcerer',
  'Cleric',
  'Paladin',
  'Druid',
  'Ranger',
  'Bard',

  //prestige spellcaster classes
  'Archmage',
  'Sacred Fist'
];

const skillsAbilities = {
  'Appraise': 'Int',
  'Balance': 'Dex',
  'Bluff': 'Char',
  'Climb': 'Str',
  'Concentration': 'Con',
  'Craft': 'Int',
  'Decipher Script': 'Int',
  'Diplomacy': 'Char',
  'Disable Device': 'Int',
  'Disguise': 'Char',
  'Escape Artist': 'Dex',
  'Forgery': 'Int',
  'Gather Information': 'Char',
  'Handle Animal': 'Char',
  'Heal': 'Wis',
  'Hide': 'Dex',
  'Intimidate': 'Char',
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
  'Perform': 'Char',
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
  'Use Magic Device': 'Char',
  'Use Rope': 'Dex'
};

const skillsSynergyReversed = {
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
};

const specialAttackNames = [
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
];

const modifierTypes = {
  'Ability': {  //doesn't participate in property effects, added for clarity
    isStackable: true,
    againstTouch: false
  },
  'Alchemical': {
    isStackable: false,
    againstTouch: false
  },
  'Circumstance': {
    isStackable: true,
    againstTouch: false
  },
  'Competence': {
    isStackable: false,
    againstTouch: false
  },
  'Deflection': {
    isStackable: false,
    againstTouch: true
  },
  'Dodge': {
    isStackable: true,
    againstTouch: true
  },
  'Enhancement': {
    isStackable: false,
    againstTouch: false
  },
  'Insight': {
    isStackable: false,
    againstTouch: false
  },
  'Luck': {
    isStackable: false,
    againstTouch: false
  },
  'Morale': {
    isStackable: false,
    againstTouch: false
  },
  'Natural Armor': {
    isStackable: false,
    againstTouch: false
  },
  'Profane': {
    isStackable: false,
    againstTouch: false
  },
  'Racial': {
    isStackable: false,
    againstTouch: false
  },
  'Resistance': {
    isStackable: false,
    againstTouch: false
  },
  'Sacred': {
    isStackable: false,
    againstTouch: false
  },
  'Size': {
    isStackable: false,
    againstTouch: false
  },

  //Armor Class types
  'Shield': {
    isStackable: false,
    againstTouch: false
  },
  'Armor': {
    isStackable: false,
    againstTouch: false
  },
  'Mage Armor': {
    isStackable: false,
    againstTouch: true
  },
  'Generic': {  //used for effects that don't fit into any other category
    isStackable: true,
    againstTouch: false
  }
};

/**
 * @typedef {'Ability' | 'Alchemical' | 'Circumstance' | 'Competence' | 'Deflection' | 'Dodge' | 'Enhancement' | 'Insight' | 'Luck' | 'Morale' | 'Natural Armor' | 'Profane' | 'Racial' | 'Resistance' | 'Sacred' | 'Size' | 'Shield' | 'Armor' | 'Mage Armor' | 'Generic'} ModifierType
 */



