import { GetEffects, ApplicableEffectData } from './_general_effects';
import { BaseEffect } from './state';

// @ts-ignore
const { Monk } = require('../classes_data/monk');
// @ts-ignore
const { IsAWeapon, GetSpecialWeaponMaterial } = require('./weapons');

export interface BodySlotInfo {
  slotName: string;
  names: string[];
  possibleAmount: number;
}

export const BodySlots: BodySlotInfo[] = [
  { slotName: 'Head', names: ['headband', 'hat', 'helmet', 'phylactery'], possibleAmount: 1 },
  { slotName: 'Eyes', names: ['eye lenses', 'goggles'], possibleAmount: 1 },
  { slotName: 'Neck', names: ['amulet', 'brooch', 'medallion', 'necklace', 'periapt', 'scarab'], possibleAmount: 1 },
  { slotName: 'Torso', names: ['vest', 'vestment', 'shirt'], possibleAmount: 1 },
  { slotName: 'Body', names: ['robe', 'armor'], possibleAmount: 1 },
  { slotName: 'Waist', names: ['belt ', 'sash'], possibleAmount: 1 },
  { slotName: 'Shoulders', names: ['cloak', 'cape', 'mantle'], possibleAmount: 1 },
  { slotName: 'Arms', names: ['bracers', 'bracelets'], possibleAmount: 1 },
  { slotName: 'Hands', names: ['gloves', 'gauntlets', 'wraps'], possibleAmount: 1 },
  { slotName: 'Fingers', names: ['ring'], possibleAmount: 2 },
  { slotName: 'Feet', names: ['boots', 'shoes'], possibleAmount: 1 },
  { slotName: 'Holy Symbol', names: ['holy symbol'], possibleAmount: 1 }
];

export type ItemEffect = BaseEffect | ApplicableEffectData;

/**
 * @type {Object.<string, ItemEffect[]>}
 */
export const ItemEffects: Record<string, ItemEffect[]> = {
  'Amulet of Mighty Fists': [
    { status: 'Amulet of Mighty Fists', property: 'bab', modifierType: 'Generic', value: 1 },
    { status: 'Amulet of Mighty Fists', property: 'damageBonus', modifierType: 'Generic', value: 1 }
  ],

  'Amulet of Pelor/Set': [
    { status: 'Amulet of Pelor/Set', property: 'Fort', modifierType: 'Generic', value: 1 },
    { status: 'Amulet of Pelor/Set', property: 'Ref', modifierType: 'Generic', value: 1 },
    { status: 'Amulet of Pelor/Set', property: 'Will', modifierType: 'Generic', value: 1 }
  ],

  'Amulet of Pelor with Maple Leaf': [
    { status: 'Amulet of Pelor with Maple Leaf', property: 'Fort', modifierType: 'Generic', value: 2 },
    { status: 'Amulet of Pelor with Maple Leaf', property: 'Ref', modifierType: 'Generic', value: 2 },
    { status: 'Amulet of Pelor with Maple Leaf', property: 'Will', modifierType: 'Generic', value: 2 }
  ],

  'Glamour Studded Leather Armor +1': [
    { status: 'Glamour Studded Leather Armor +1', property: 'ac', modifierType: 'Armor', value: 4 }
  ],

  'Gloves of Dexterity +4': [
    { status: 'Gloves of Dexterity +4', property: 'Dex', modifierType: 'Enhancement', value: 4 }
  ],

  'Kusarigama': [
    { status: 'Kusarigama', property: 'Trip', modifierType: 'Generic', value: 2 },
    { status: 'Kusarigama', property: 'Disarm', modifierType: 'Generic', value: 2 }
  ],

  'Boots of Agile Leaping': [
    { status: 'Boots of Agile Leaping', property: 'Jump', modifierType: 'Generic', value: 5 }
  ],

  'Boots of Landing': [
    { status: 'Boots of Landing', property: 'Special', description: 'Slow Fall 20 ft.' },
    { status: 'Boots of Landing', property: 'Special', description: 'Feather Fall 1/day' },
    { status: 'Boots of Landing', property: 'Special', description: 'Cloud Step 3/day' }
  ],

  'Bracers of Armor +3': [
    { status: 'Bracers of Armor +3', property: 'ac', modifierType: 'Armor', value: 3 }
  ],

  'Buckler': [
    { status: 'Buckler', property: 'ac', modifierType: 'Armor', value: 1 }
  ],

  'Ivory Ring of Deflection +1': [
    { status: 'Ivory Ring of Deflection +1', property: 'ac', modifierType: 'Deflection', value: 1 }
  ],

  'Ring of Protection +2': [
    { status: 'Ring of Protection +2', property: 'ac', modifierType: 'Deflection', value: 2 }
  ],

  'Cloak of Resistance +2': [
    { status: 'Cloak of Resistance +2', property: 'Fort', modifierType: 'Generic', value: 2 },
    { status: 'Cloak of Resistance +2', property: 'Ref', modifierType: 'Generic', value: 2 },
    { status: 'Cloak of Resistance +2', property: 'Will', modifierType: 'Generic', value: 2 }
  ],

  'Cloak of Charisma +4': [
    { status: 'Cloak of Charisma +4', property: 'Cha', modifierType: 'Enhancement', value: 4 }
  ],

  'Monks Chain Belt': [
    {
      status: 'Monks Chain Belt',
      property: 'ac',
      modifierType: 'Natural Armor',
      value: (character: any) => {
        const currentMonkLevel = character.classes.find((c: any) => c.name === 'Monk') ? character.classes.find((c: any) => c.name === 'Monk').level : 0;
        const monkLevel = 5 + currentMonkLevel;
        const currentMonkAcBonus = currentMonkLevel > 0 ? Monk.levelTable[currentMonkLevel].ac : 0;
        return Monk.levelTable[monkLevel].ac - currentMonkAcBonus;
      }
    },
    {
      status: 'Monks Chain Belt',
      property: 'effectiveMonkLevel',
      modifierType: 'Generic',
      value: 5
    }
  ],

  'Hand Wraps with Adamantine Plates': [
    { status: 'Hand Wraps with Adamantine Plates', property: 'Str', modifierType: 'Ability', value: 2 },
    { status: 'Hand Wraps with Adamantine Plates', property: 'Dex', modifierType: 'Ability', value: 2 },
    { status: 'Hand Wraps with Adamantine Plates', property: 'Special', description: '+2 to DC of the stunning fist attack.' }
  ],

  'Periapt of Wisdom': [
    { status: 'Periapt of Wisdom', property: 'Wis', modifierType: 'Ability', value: 4 }
  ],

  'Silver Signet Ring': [
    { status: 'Silver Signet Ring', property: 'Special', description: 'Abyssal, Infernal and Dark Speech' }
  ],
  'Signet Ring': [
    { status: 'Signet Ring', property: 'Special', description: 'Abyssal, Infernal and Dark Speech' }
  ],
  'Brooch of Shielding': [
    { status: 'Brooch of Shielding', property: 'Special', description: 'absorbs up to 101 points of damage from magic missile spells or spell-like abilities before melting and becoming useless' }
  ],

  'Whisperleaf Striders': [
    { status: 'Whisperleaf Striders', property: 'Special', description: 'Pass without trace' },
    { status: 'Whisperleaf Striders', property: 'Move Silently', modifierType: 'Generic', value: 5 },
    { status: 'Whisperleaf Striders', property: 'Special', description: 'Once per Day: Greater Invisibility for 7 rounds' }
  ],

  'Explorer\'s Outfit Masterwork': [
    { status: 'Explorer\'s Outfit Masterwork', property: 'Special', description: 'Once per Day: Greater Invisibility for 7 rounds' }
  ],

  'Elven Cloak': [
    { status: 'Elven Cloak', property: 'Hide', modifierType: 'Generic', value: 5 }
  ],

  'Headband of Intellect +2': [
    { status: 'Headband of Intellect +2', property: 'Int', modifierType: 'Enhancement', value: 2 }
  ],

  'Bone Ring +2': [
    { status: 'Bone Ring +2', property: 'ac', modifierType: 'Deflection', value: 2 }
  ],

  'Ring of Chameleon Power': [
    { status: 'Ring of Chameleon Power', property: 'Special', description: 'As a free action, the wearer of this ring can gain the ability to magically blend in with the surroundings. This provides a +10 competence bonus on her Hide checks. ' },
    { status: 'Ring of Chameleon Power', property: 'Special', description: 'As a standard action, she can also command the ring to utilize the spell disguise self as often as she wants.' }
  ],

  'Dragoncraft bracers of armor +2': [
    { status: 'Dragoncraft bracers of armor +2', property: 'ac', modifierType: 'Armor', value: 2 }
  ],
  'Black Dragoncraft Full Plate +2': [
    { status: 'Black Dragoncraft Full Plate +2', property: 'ac', modifierType: 'Armor', value: 8 + 2 }
  ],
  'Tower Shield made from Blue Dragon Hide +2': [
    { status: 'Tower Shield made from Blue Dragon Hide +2', property: 'ac', modifierType: 'Shield', value: 4 + 2 }
  ]
};

export function GetBodySlot(itemName: string): string | null {
  const lowerName = itemName.toLowerCase();

  if (lowerName.includes('holy symbol')) {
    return 'Holy Symbol';
  }

  const itemNameWords = lowerName.split(' ');
  for (let i = 0; i < itemNameWords.length; i++) {
    const bodySlot = BodySlots.find(slot => slot.names.includes(itemNameWords[i]));
    if (bodySlot) {
      return bodySlot.slotName;
    }
  }
  return null;
}

export class Item {
  public name: string;
  public amount: number;
  public description: string;
  public material: string;
  public bodySlot: string | null;
  public effects: ItemEffect[];
  public isWeapon: boolean;
  public isPotion: boolean;
  public isScroll: boolean;
  public weight: number;

  constructor(name: string, amount = 1, description = '') {
    this.amount = amount;
    this.description = description;

    // Parse the item name to extract material and clean name
    const nameAndMaterial = GetSpecialWeaponMaterial(name);
    this.name = name.startsWith(nameAndMaterial.material) ? nameAndMaterial.name : name;
    this.material = nameAndMaterial.material;

    // Set other properties
    this.bodySlot = GetBodySlot(this.name);
    if (this.bodySlot === 'Holy Symbol') {
      this.name = this.name.replace(/\s*\(holy symbol\)/i, '');
    }
    this.effects = GetEffects(ItemEffects, this.name) || [];
    this.isWeapon = IsAWeapon(this.name);
    this.isPotion = this.name.includes('Potion');
    this.isScroll = this.name.includes('Scroll');

    // Parse Weight: 3 lb.
    this.weight = 0;
    if (this.description) {
      const weightMatch = this.description.match(/(\d+)\s*lb/);
      if (weightMatch) this.weight = parseInt(weightMatch[1]);
    }
  }
  get state() {
    return {
      name: this.name,
      bodySlot: this.bodySlot,
      material: this.material,
      amount: this.amount,
      isPotion: this.isPotion,
      isScroll: this.isScroll,
      isWeapon: this.isWeapon,
      weight: this.weight,
      description: this.description
    };
  }
  public IsUsable(): boolean {
    return this.isPotion || this.isScroll;
  }
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = {
    Item,
    GetBodySlot,
    ItemEffects,
    BodySlots
  };
}
