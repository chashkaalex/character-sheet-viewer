


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
  { slotName: 'Feet', names: ['boots', 'shoes'], possibleAmount: 1 }
];

const ItemEffects = {
  'Amulet of Mighty Fists': [
    { status: 'Amulet of Mighty Fists', property: 'bab', modifierType: 'Generic', value: 1 },
    { status: 'Amulet of Mighty Fists', property: 'damageBonus', modifierType: 'Generic', value: 1 }
  ],
  'Kusarigama': [
    { status: 'Kusarigama ', property: 'Trip', modifierType: 'Generic', value: 2 },
    { status: 'Kusarigama ', property: 'Disarm', modifierType: 'Generic', value: 2 }
  ],

  'Boots of Agile Leaping': [
    { status: 'Boots of Agile Leaping', property: 'Jump', modifierType: 'Generic', value: 5 }
  ],

  'Bracers of Armor +3': [
    { status: 'Braces of Armor +3', property: 'ac', modifierType: 'Armor', value: 3 }
  ],

  'Ring of Protection +2': [
    { status: 'Ring of Protection +2', property: 'ac', modifierType: 'Deflection', value: 2 }
  ],

  'Cloak of Resistance +2': [
    { status: 'Cloak of Resistance +2', property: 'Fort', modifierType: 'Generic', value: 2 },
    { status: 'Cloak of Resistance +2', property: 'Ref', modifierType: 'Generic', value: 2 },
    { status: 'Cloak of Resistance +2', property: 'Will', modifierType: 'Generic', value: 2 }
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
  ]
};

function GetItemEffects(itemName) {
  const effects = ItemEffects[itemName];
  //console.log(effects);
  return effects ? effects : null;
}

function GetBodySlot(itemName) {
  const itemNameWords = itemName.toLowerCase().split(' ');
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
    this.effects = GetItemEffects(this.name);
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
    GetItemEffects,
    ItemEffects,
    BodySlots
  };
}
