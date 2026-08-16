import { GetEffects } from '../../_general_effects';
import { EffectData } from '../../state/effects';
import { currentRegistry } from '../../00_property';

import { Monk } from '../../../classes_data/monk';
import { IsAWeapon, GetSpecialWeaponMaterial } from '../weapons/weapons';
import { ICharacter } from '@server/character/icharacter';

const BodySlotNames = [
  'Head',
  'Eyes',
  'Neck',
  'Torso',
  'Body',
  'Waist',
  'Shoulders',
  'Arms',
  'Hands',
  'Fingers',
  'Feet',
  'Holy Symbol'
];

export type BodySlotNames = typeof BodySlotNames[number];

export interface BodySlotInfo {
  slotName: BodySlotNames;
  names: string[];
  possibleAmount: number;
}

export const BodySlots: BodySlotInfo[] = [
  { slotName: 'Head', names: ['headband', 'hat', 'helmet', 'phylactery'], possibleAmount: 1 },
  { slotName: 'Eyes', names: ['eye lenses', 'goggles'], possibleAmount: 1 },
  { slotName: 'Neck', names: ['amulet', 'brooch', 'medallion', 'necklace', 'periapt', 'scarab'], possibleAmount: 1 },
  { slotName: 'Torso', names: ['vest', 'vestment', 'shirt'], possibleAmount: 1 },
  { slotName: 'Body', names: ['robe', 'armor', 'plate', 'breastplate', 'mail', 'suit'], possibleAmount: 1 },
  { slotName: 'Waist', names: ['belt ', 'sash'], possibleAmount: 1 },
  { slotName: 'Shoulders', names: ['cloak', 'cape', 'mantle'], possibleAmount: 1 },
  { slotName: 'Arms', names: ['bracers', 'bracelets'], possibleAmount: 1 },
  { slotName: 'Hands', names: ['gloves', 'gauntlets', 'wraps'], possibleAmount: 1 },
  { slotName: 'Fingers', names: ['ring'], possibleAmount: 2 },
  { slotName: 'Feet', names: ['boots', 'shoes'], possibleAmount: 1 },
  { slotName: 'Holy Symbol', names: ['holy symbol'], possibleAmount: 1 }
];

export type BodySlotsMap = Map<BodySlotNames, number>;


/**
 * @type {Object.<string, EffectData[]>}
 */
export const ItemEffects: Record<string, EffectData[]> = {
  'Thror\'s Holy Symbol of Moradin': [
    {
      status: 'Thror\'s Holy Symbol of Moradin',
      callback: (character: ICharacter, _args: Record<string, unknown>) => {
        if (!character.actions.includes('Use Thror\'s Holy Symbol')) {
          character.actions.push('Use Thror\'s Holy Symbol');
        }
      }
    }
  ],

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

  'Amulet of Natural Armor +1': [
    { status: 'Amulet of Natural Armor +1', property: 'ac', modifierType: 'Natural Armor', value: 1 }
  ],

  'Ring of Protection +2': [
    { status: 'Ring of Protection +2', property: 'ac', modifierType: 'Deflection', value: 2 }
  ],

  'Cloak of Resistance +2': [
    { status: 'Cloak of Resistance +2', property: 'Fort', modifierType: 'Generic', value: 2 },
    { status: 'Cloak of Resistance +2', property: 'Ref', modifierType: 'Generic', value: 2 },
    { status: 'Cloak of Resistance +2', property: 'Will', modifierType: 'Generic', value: 2 }
  ],

  'Cloak of Resistance +3': [
    { status: 'Cloak of Resistance +3', property: 'Fort', modifierType: 'Generic', value: 3 },
    { status: 'Cloak of Resistance +3', property: 'Ref', modifierType: 'Generic', value: 3 },
    { status: 'Cloak of Resistance +3', property: 'Will', modifierType: 'Generic', value: 3 }
  ],

  'Cloak of Charisma +4': [
    { status: 'Cloak of Charisma +4', property: 'Cha', modifierType: 'Enhancement', value: 4 }
  ],

  'Goggles of the Golden Sun': [
    { status: 'Goggles of the Golden Sun', property: 'Special', description: 'While wearing "goggles of the golden sun", you are immune to blindness and dazzling effects. This is a continuous effect and requires no activation.In addition, three times per day you can activate these goggles and sacrifice a prepared spell or spell slot of 3rd level or higher to use fireball (as the spell; Reflex DC 14 half), using your own caster level or that of the goggles, whichever is higher. The fireball created by the goggles resembles a hurtling, exploding comet.' }
  ],

  'Monks Chain Belt': [
    {
      status: 'Monks Chain Belt',
      property: 'ac',
      modifierType: 'Natural Armor',
      valueResolver: (character: ICharacter) => {
        const currentMonkLevel = character.GetClassLevel('Monk');
        const monkLevel = Math.min(20, 5 + currentMonkLevel);
        const currentMonkAcBonus = currentMonkLevel > 0 ? (Monk.levelTable[currentMonkLevel].ac as number) : 0;
        return (Monk.levelTable[monkLevel].ac as number) - currentMonkAcBonus;
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
    { status: 'Hand Wraps with Adamantine Plates', property: 'Str', modifierType: 'Enhancement', value: 2 },
    { status: 'Hand Wraps with Adamantine Plates', property: 'Dex', modifierType: 'Enhancement', value: 2 },
    { status: 'Hand Wraps with Adamantine Plates', property: 'Special', description: '+2 to DC of the stunning fist attack.' }
  ],

  'Periapt of Wisdom': [
    { status: 'Periapt of Wisdom', property: 'Wis', modifierType: 'Enhancement', value: 4 }
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
  ],
  'Belt of Giant Strength +4': [
    { status: 'Belt of Giant Strength +4', property: 'Str', modifierType: 'Enhancement', value: 4 }
  ],
  'Full Plate +1': [
    { status: 'Full Plate +1', property: 'ac', modifierType: 'Armor', value: 8 + 1 }
  ],

  'Hair Shirt of Suffering': [
    { status: 'Hair Shirt of Suffering', property: 'ac', modifierType: 'Natural Armor', value: 1 },
    { status: 'Hair Shirt of Suffering', property: 'Special', description: 'Once per day: Activate to use cure serious wounds on any creature other than yourself (healing 3d8+9 points of damage).' },
    {
      status: 'Hair Shirt of Suffering',
      callback: (character: ICharacter) => {
        character.hp.max -= 2;
        if (character.hp.current > character.hp.max) {
          character.hp.current = character.hp.max;
        }
      }
    }
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
  public effects: EffectData[];
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

    if (currentRegistry) {
      currentRegistry.registerItem(this);
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

export interface ArmorData {
  type: 'Light' | 'Medium' | 'Heavy' | 'Shield';
  acBonus: number;
  acp: number;
}

export const ArmorsData = new Map<string, ArmorData>();
ArmorsData.set('Padded', { type: 'Light', acBonus: 1, acp: 0 });
ArmorsData.set('Leather', { type: 'Light', acBonus: 2, acp: -1 });
ArmorsData.set('Studded Leather', { type: 'Light', acBonus: 3, acp: -1 });
ArmorsData.set('Chain Shirt', { type: 'Light', acBonus: 4, acp: -2 });
ArmorsData.set('Hide', { type: 'Medium', acBonus: 3, acp: -3 });
ArmorsData.set('Scale Mail', { type: 'Medium', acBonus: 4, acp: -4 });
ArmorsData.set('Chainmail', { type: 'Medium', acBonus: 5, acp: -5 });
ArmorsData.set('Breastplate', { type: 'Medium', acBonus: 5, acp: -4 });
ArmorsData.set('Splint Mail', { type: 'Heavy', acBonus: 6, acp: -7 });
ArmorsData.set('Banded Mail', { type: 'Heavy', acBonus: 6, acp: -5 });
ArmorsData.set('Half-Plate', { type: 'Heavy', acBonus: 7, acp: -7 });
ArmorsData.set('Full Plate', { type: 'Heavy', acBonus: 8, acp: -6 });
ArmorsData.set('Buckler', { type: 'Shield', acBonus: 1, acp: -1 });
ArmorsData.set('Light Shield', { type: 'Shield', acBonus: 1, acp: -1 });
ArmorsData.set('Heavy Shield', { type: 'Shield', acBonus: 2, acp: -2 });
ArmorsData.set('Tower Shield', { type: 'Shield', acBonus: 4, acp: -10 });

export function FindArmorBaseName(fullName: string): string | null {
  if (ArmorsData.has(fullName)) return fullName;

  const sortedNames = Array.from(ArmorsData.keys()).sort((a, b) => b.length - a.length);
  for (const baseName of sortedNames) {
    if (fullName.toLowerCase().includes(baseName.toLowerCase())) {
      return baseName;
    }
  }
  return null;
}

export function IsAnArmor(name: string): boolean {
  return FindArmorBaseName(name) !== null;
}

export class Armor extends Item {
  public armorType: 'Light' | 'Medium' | 'Heavy' | 'Shield';
  public acpValue: number;

  constructor(name: string, amount = 1, description = '') {
    super(name, amount, description);

    const baseName = FindArmorBaseName(this.name);
    if (baseName) {
      const data = ArmorsData.get(baseName)!;
      this.armorType = data.type;
      this.acpValue = data.acp;
    } else {
      this.armorType = 'Medium';
      this.acpValue = 0;
    }

    if (this.description) {
      const acpMatch = this.description.match(/(-?\d+)\s*penalty/);
      if (acpMatch) {
        this.acpValue = parseInt(acpMatch[1]);
      }
    }

    if (this.acpValue !== 0) {
      this.effects.push({
        status: this.name,
        property: 'acp',
        modifierType: 'Generic',
        value: this.acpValue
      });
    }
  }
}
