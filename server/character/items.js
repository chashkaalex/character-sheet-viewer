const { Monk } = require('../classes_data/monk');
const { IsAWeapon, GetSpecialWeaponMaterial } = require('./weapons');
const { GetEffects } = require('./_general_effects');

const BodySlots = [
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

const ItemEffects = {
  'Amulet of Mighty Fists': [
    { status: 'Amulet of Mighty Fists', property: 'bab', modifierType: 'Generic', value: 1 },
    { status: 'Amulet of Mighty Fists', property: 'damageBonus', modifierType: 'Generic', value: 1 }
  ],

  'Amulet of Pelor/Set': [
    { status: 'Amulet of Pelor/Set', property: 'Fort', modifierType: 'Generic', value: 1 },
    { status: 'Amulet of Pelor/Set', property: 'Ref', modifierType: 'Generic', value: 1 },
    { status: 'Amulet of Pelor/Set', property: 'Will', modifierType: 'Generic', value: 1 }
  ],

  'Glamour Studded Leather Armor +1': [
    { status: 'Glamour Studded Leather Armor +1', property: 'ac', modifierType: 'Armor', value: 4 }
  ],
  'Kusarigama': [
    { status: 'Kusarigama ', property: 'Trip', modifierType: 'Generic', value: 2 },
    { status: 'Kusarigama ', property: 'Disarm', modifierType: 'Generic', value: 2 }
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
    { status: 'Braces of Armor +3', property: 'ac', modifierType: 'Armor', value: 3 }
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
    { status: 'Cloak of Charisma +4', property: 'Char', modifierType: 'Enhancement', value: 4 }
  ],

  'Monks Chain Belt': [
    {
      status: 'Monks Chain Belt',
      property: 'ac',
      modifierType: 'Natural Armor',
      value: function (character) {
        const currentMonkLevel = character.classes.find(c => c.name === 'Monk') ? character.classes.find(c => c.name === 'Monk').level : 0;
        const monkLevel = 5 + currentMonkLevel;
        const currentMonkAcBonus = currentMonkLevel > 0 ? Monk.levelTable[currentMonkLevel].ac : 0;
        return Monk.levelTable[monkLevel].ac - currentMonkAcBonus;
      }
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
  ]
};



function GetBodySlot(itemName) {
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

class Item {
  constructor(name, amount = 1) {
    this.amount = amount;

    // Parse the item name to extract material and clean name
    const nameAndMaterial = GetSpecialWeaponMaterial(name);
    this.name = name.startsWith(nameAndMaterial.material) ? nameAndMaterial.name : name;
    this.material = nameAndMaterial.material;

    // Set other properties
    this.bodySlot = GetBodySlot(this.name);
    if (this.bodySlot === 'Holy Symbol') {
      this.name = this.name.replace(/\s*\(holy symbol\)/i, '');
    }
    this.effects = GetEffects(ItemEffects, this.name);
    this.isWeapon = IsAWeapon(this.name);
    this.isPotion = this.name.includes('Potion');
    this.isScroll = this.name.includes('Scroll');
  }
  get state() {
    return {
      name: this.name,
      bodySlot: this.bodySlot,
      material: this.material,
      amount: this.amount,
      isPotion: this.isPotion,
      isScroll: this.isScroll,
      isWeapon: this.isWeapon
    };
  }
  IsUsable() {
    return this.isPotion || this.isScroll;
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    Item,
    GetBodySlot,
    ItemEffects,
    BodySlots
  };
}
