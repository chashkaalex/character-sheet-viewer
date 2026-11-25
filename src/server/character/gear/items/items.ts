import { GetEffects } from '../../general_effects';
import { EffectData } from '../../state/effects';
import { currentRegistry } from '../../property';

import { IsAWeapon, GetSpecialWeaponMaterial } from '../weapons/weapons';
import { ICharacter } from '@server/character/icharacter';
import { ResolveStandardWondrousItemEffects, StandardWondrousItems } from './wondrous_items';
import { UniqueItemEffects } from './unique_items';
import {
  FindArmorBaseName,
  IsAnArmor,
  GetBodySlot,
  InferItemWeight,
  GuessWeightFromItemName,
  ITEM_NAME_WEIGHT_RULES
} from './items_parser';

export {
  FindArmorBaseName,
  IsAnArmor,
  GetBodySlot,
  InferItemWeight,
  GuessWeightFromItemName,
  ITEM_NAME_WEIGHT_RULES
};

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
  { slotName: 'Head', names: ['headband', 'hat', 'helmet', 'helm', 'phylactery'], possibleAmount: 1 },
  { slotName: 'Eyes', names: ['eye lenses', 'goggles'], possibleAmount: 1 },
  { slotName: 'Neck', names: ['amulet', 'brooch', 'medallion', 'necklace', 'periapt', 'scarab'], possibleAmount: 1 },
  { slotName: 'Torso', names: ['vest', 'vestment', 'shirt'], possibleAmount: 1 },
  { slotName: 'Body', names: ['robe', 'armor', 'plate', 'breastplate', 'mail', 'suit'], possibleAmount: 1 },
  { slotName: 'Waist', names: ['belt', 'belt ', 'sash'], possibleAmount: 1 },
  { slotName: 'Shoulders', names: ['cloak', 'cape', 'mantle'], possibleAmount: 1 },
  { slotName: 'Arms', names: ['bracers', 'bracelets'], possibleAmount: 1 },
  { slotName: 'Hands', names: ['gloves', 'gauntlets', 'wraps'], possibleAmount: 1 },
  { slotName: 'Fingers', names: ['ring'], possibleAmount: 2 },
  { slotName: 'Feet', names: ['boots', 'shoes', 'striders'], possibleAmount: 1 },
  { slotName: 'Holy Symbol', names: ['holy symbol'], possibleAmount: 1 }
];

export type BodySlotsMap = Map<BodySlotNames, number>;

/**
 * Combined dictionary of unique and static standard item effects.
 * Parametric wondrous items and standard armors/shields are resolved dynamically via
 * ResolveStandardWondrousItemEffects and Armor constructor respectively.
 */
export const ItemEffects: Record<string, EffectData[]> = {
  ...StandardWondrousItems,
  ...UniqueItemEffects
};

export class Item {
  public name: string;
  public amount: number;
  public description: string;
  public material: string;
  public bodySlot: string | null;
  public effects: EffectData[];
  public isWeapon: boolean;
  public isPreferred: boolean;
  public isPotion: boolean;
  public isScroll: boolean;
  public weight: number;
  public isWeightKnown: boolean;
  public isEquipped: boolean = true;
  public line?: string;

  constructor(name: string, amount = 1, description = '', explicitWeight?: number | null) {
    this.amount = amount;
    this.description = description;

    // Parse optional [*] preferred prefix
    const preferredMatch = name.match(/^\[\*\]\s*/);
    this.isPreferred = Boolean(preferredMatch);
    const cleanName = preferredMatch ? name.slice(preferredMatch[0].length) : name;

    // Parse the item name to extract material and clean name
    const nameAndMaterial = GetSpecialWeaponMaterial(cleanName);
    this.name = cleanName.startsWith(nameAndMaterial.material) ? nameAndMaterial.name : cleanName;
    this.material = nameAndMaterial.material;

    // Set other properties
    this.bodySlot = GetBodySlot(this.name, this.description);
    if (this.bodySlot === 'Holy Symbol') {
      this.name = this.name.replace(/\s*\(holy symbol\)/i, '');
    }
    this.effects =
      GetEffects(UniqueItemEffects, this.name) ||
      ResolveStandardWondrousItemEffects(this.name, this.description) ||
      GetEffects(ItemEffects, this.name) ||
      [];
    this.isWeapon = IsAWeapon(this.name);
    this.isPotion = this.name.includes('Potion');
    this.isScroll = this.name.includes('Scroll');

    // Mandatory unit weight (explicit description weight -> PHB armor/weapon weight -> name heuristic)
    const inferredWeight = explicitWeight !== undefined
      ? explicitWeight
      : InferItemWeight(this.name, this.description, this.material);
    this.isWeightKnown = inferredWeight !== null;
    this.weight = inferredWeight ?? 0;

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
      isWeightKnown: this.isWeightKnown,
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
  maxDex?: number;
  attackPenalty?: number;
  weight: number;
}

export const ArmorsData = new Map<string, ArmorData>();
ArmorsData.set('Padded', { type: 'Light', acBonus: 1, acp: 0, maxDex: 8, weight: 10 });
ArmorsData.set('Leather', { type: 'Light', acBonus: 2, acp: -1, maxDex: 6, weight: 15 });
ArmorsData.set('Studded Leather', { type: 'Light', acBonus: 3, acp: -1, maxDex: 5, weight: 20 });
ArmorsData.set('Chain Shirt', { type: 'Light', acBonus: 4, acp: -2, maxDex: 4, weight: 25 });
ArmorsData.set('Hide', { type: 'Medium', acBonus: 3, acp: -3, maxDex: 4, weight: 25 });
ArmorsData.set('Scale Mail', { type: 'Medium', acBonus: 4, acp: -4, maxDex: 3, weight: 30 });
ArmorsData.set('Chainmail', { type: 'Medium', acBonus: 5, acp: -5, maxDex: 2, weight: 40 });
ArmorsData.set('Breastplate', { type: 'Medium', acBonus: 5, acp: -4, maxDex: 3, weight: 30 });
ArmorsData.set('Splint Mail', { type: 'Heavy', acBonus: 6, acp: -7, maxDex: 0, weight: 45 });
ArmorsData.set('Banded Mail', { type: 'Heavy', acBonus: 6, acp: -5, maxDex: 1, weight: 35 });
ArmorsData.set('Half-Plate', { type: 'Heavy', acBonus: 7, acp: -7, maxDex: 0, weight: 50 });
ArmorsData.set('Full Plate', { type: 'Heavy', acBonus: 8, acp: -6, maxDex: 1, weight: 50 });
ArmorsData.set('Buckler', { type: 'Shield', acBonus: 1, acp: -1, weight: 5 });
ArmorsData.set('Light Shield', { type: 'Shield', acBonus: 1, acp: -1, weight: 6 });
ArmorsData.set('Heavy Shield', { type: 'Shield', acBonus: 2, acp: -2, weight: 10 });
ArmorsData.set('Tower Shield', { type: 'Shield', acBonus: 4, acp: -10, maxDex: 2, attackPenalty: -2, weight: 45 });

export class Armor extends Item {
  public armorType: 'Light' | 'Medium' | 'Heavy' | 'Shield';
  public acpValue: number;
  public maxDex: number | null = null;
  public attackPenalty: number = 0;
  public enhancement: number = 0;

  constructor(name: string, amount = 1, description = '') {
    super(name, amount, description);

    const enhMatch = this.name.match(/(?:^\+(\d+)\b|\+(\d+)\s*$)/);
    this.enhancement = enhMatch ? parseInt(enhMatch[1] || enhMatch[2], 10) : 0;

    const baseName = FindArmorBaseName(this.name);
    if (baseName) {
      const data = ArmorsData.get(baseName)!;
      this.armorType = data.type;
      this.acpValue = data.acp;
      this.maxDex = data.maxDex !== undefined ? data.maxDex : null;
      if (data.attackPenalty) {
        this.attackPenalty = data.attackPenalty;
      }

      if (!this.effects.some(e => 'property' in e && e.property === 'ac') && !this.name.includes('{')) {
        this.effects.push({
          status: this.name,
          property: 'ac',
          modifierType: this.armorType === 'Shield' ? 'Shield' : 'Armor',
          value: data.acBonus + this.enhancement
        });
      }
    } else {
      this.armorType = 'Medium';
      this.acpValue = 0;
    }

    const isMithral = this.material === 'Mithral' || /\bmithral\b/i.test(name) || /\bmithral\b/i.test(description);
    const isDarkwood = this.material === 'Darkwood' || /\bdarkwood\b/i.test(name) || /\bdarkwood\b/i.test(description);
    const hasMagicEnhancement = this.enhancement > 0 || /\+\d+/.test(this.name);
    const isMasterwork = /\bmasterwork\b/i.test(name) || /\bmasterwork\b/i.test(description) || hasMagicEnhancement;

    if (isMithral) {
      if (this.armorType === 'Heavy') {
        this.armorType = 'Medium';
      } else if (this.armorType === 'Medium') {
        this.armorType = 'Light';
      }
      if (this.maxDex !== null) {
        this.maxDex += 2;
      }
      if (this.acpValue < 0) {
        this.acpValue = Math.min(0, this.acpValue + 3);
      }
    } else if (isDarkwood) {
      if (this.acpValue < 0) {
        this.acpValue = Math.min(0, this.acpValue + 2);
      }
    } else if (isMasterwork) {
      if (this.acpValue < 0) {
        this.acpValue = Math.min(0, this.acpValue + 1);
      }
    }

    if (this.description) {
      const acpMatch = this.description.match(/(-?\d+)\s*penalty/);
      if (acpMatch) {
        this.acpValue = parseInt(acpMatch[1]);
      }
      const atkMatch = this.description.match(/(-?\d+)\s*atk/i);
      if (atkMatch) {
        this.attackPenalty = parseInt(atkMatch[1]);
      }
      const maxDexMatch = this.description.match(/\+?\s*(\d+)\s*max\s*dex/i);
      if (maxDexMatch) {
        this.maxDex = parseInt(maxDexMatch[1], 10);
      }
    }

    if (this.maxDex !== null) {
      const cap = this.maxDex;
      const armorName = this.name;
      this.effects.push({
        status: armorName,
        callback: (character: ICharacter) => {
          if (character.ac && typeof character.ac.applyMaxDexCap === 'function') {
            character.ac.applyMaxDexCap(cap, armorName);
          }
        }
      });
    }

    if (this.acpValue !== 0) {
      this.effects.push({
        status: this.name,
        property: 'acp',
        modifierType: 'Generic',
        value: this.acpValue
      });
    }

    if (this.attackPenalty !== 0) {
      this.effects.push({
        status: this.name,
        property: 'attackBonus',
        modifierType: 'Generic',
        value: this.attackPenalty
      });
    }

    // PHB p. 123 Table 7-6: Medium and Heavy armors (after Mithral category reduction)
    // reduce speed (30 -> 20 ft, 20 -> 15 ft), except for Dwarves.
    if (
      (this.armorType === 'Medium' || this.armorType === 'Heavy') &&
      !this.effects.some(e => 'property' in e && e.property === 'speed') &&
      !this.name.includes('{')
    ) {
      this.effects.push({
        status: this.name,
        property: 'speed',
        modifierType: 'Generic',
        valueResolver: (character: ICharacter) => {
          if (character.race === 'Dwarf') return 0;
          return character.speed.score <= 20 ? -5 : -10;
        }
      });
    }
  }
}
