import { ICharacter } from '@server/character/icharacter';
import { WeaponAttackBonus, WeaponDamageBonus, ModifiableProperty, currentRegistry } from '../../00_property';
import { CharacterClass } from '@server/character/properties/race_and_classes';
import { ClassesData } from '../../../classes_data/_classes_general_data';
import { Item } from '@server/character/gear/items/items';
import { EffectData } from '@server/character/state/effects';

export interface WeaponData {
  range: 'Melee' | 'Ranged';
  encumbrance: 'Light' | 'One-Handed' | 'Two-Handed' | 'ranged';
  damage: string;
  critical: string;
  rangeIncrement?: number;
}

export const WeaponsData = new Map<string, WeaponData>();

// Simple Melee Weapons
WeaponsData.set('Gauntlet', { range: 'Melee', encumbrance: 'Light', damage: '1d3', critical: 'x2' });
WeaponsData.set('Unarmed', { range: 'Melee', encumbrance: 'Light', damage: '1d3', critical: 'x2' });
WeaponsData.set('Dagger', { range: 'Melee', encumbrance: 'Light', damage: '1d4', critical: '19-20/x2', rangeIncrement: 10 });
WeaponsData.set('Mace', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: 'x2' });
WeaponsData.set('Sickle', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: 'x2' });
WeaponsData.set('Club', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d6', critical: 'x2', rangeIncrement: 10 });
WeaponsData.set('Heavy Mace', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d8', critical: 'x2' });
WeaponsData.set('Morningstar', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d8', critical: 'x2' });
WeaponsData.set('Short Spear', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d6', critical: 'x2', rangeIncrement: 20 });
WeaponsData.set('Long Spear', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d8', critical: 'x3' });
WeaponsData.set('Quarterstaff', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d6', critical: 'x2' });
WeaponsData.set('Spear', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d8', critical: 'x3', rangeIncrement: 20 });

// Simple Ranged Weapons
WeaponsData.set('Light Crossbow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d8', critical: '19-20/x2', rangeIncrement: 80 });
WeaponsData.set('Light Coil Crossbow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d8', critical: '19-20/x2', rangeIncrement: 80 });
WeaponsData.set('Heavy Crossbow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d10', critical: '19-20/x2', rangeIncrement: 120 });
WeaponsData.set('Dart', { range: 'Ranged', encumbrance: 'ranged', damage: '1d4', critical: 'x2', rangeIncrement: 20 });
WeaponsData.set('Javelin', { range: 'Ranged', encumbrance: 'ranged', damage: '1d6', critical: 'x2', rangeIncrement: 30 });
WeaponsData.set('Sling', { range: 'Ranged', encumbrance: 'ranged', damage: '1d4', critical: 'x2', rangeIncrement: 50 });

// Martial Melee Weapons
WeaponsData.set('Throwing Axe', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: 'x2', rangeIncrement: 10 });
WeaponsData.set('Light Hammer', { range: 'Melee', encumbrance: 'Light', damage: '1d4', critical: 'x2', rangeIncrement: 20 });
WeaponsData.set('Handaxe', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: 'x3' });
WeaponsData.set('Kukri', { range: 'Melee', encumbrance: 'Light', damage: '1d4', critical: '18-20/x2' });
WeaponsData.set('Light Pick', { range: 'Melee', encumbrance: 'Light', damage: '1d4', critical: 'x4' });
WeaponsData.set('Sap', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: 'x2' });
WeaponsData.set('Light Shield', { range: 'Melee', encumbrance: 'Light', damage: '1d3', critical: 'x2' });
WeaponsData.set('Spiked Armour', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: 'x2' });
WeaponsData.set('Light Spiked Shield', { range: 'Melee', encumbrance: 'Light', damage: '1d4', critical: 'x2' });
WeaponsData.set('Short Sword', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: '19-20/x2' });
WeaponsData.set('Battleaxe', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d8', critical: 'x3' });
WeaponsData.set('Flail', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d8', critical: 'x2' });
WeaponsData.set('Longsword', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d8', critical: '19-20/x2' });
WeaponsData.set('Pick', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d6', critical: 'x4' });
WeaponsData.set('Rapier', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d6', critical: '18-20/x2' });
WeaponsData.set('Scimitar', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d6', critical: '18-20/x2' });
WeaponsData.set('Heavy Shield', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d4', critical: 'x2' });
WeaponsData.set('Heavy Spiked Shield', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d6', critical: 'x2' });
WeaponsData.set('Trident', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d8', critical: 'x2', rangeIncrement: 10 });
WeaponsData.set('Warhammer', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d8', critical: 'x3' });
WeaponsData.set('Falchion', { range: 'Melee', encumbrance: 'Two-Handed', damage: '2d4', critical: '18-20/x2' });
WeaponsData.set('Glaive', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d10', critical: 'x3' });
WeaponsData.set('Greataxe', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d12', critical: 'x3' });
WeaponsData.set('Greatclub', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d10', critical: 'x2' });
WeaponsData.set('Heavy Flail', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d10', critical: '19-20/x2' });
WeaponsData.set('Greatsword', { range: 'Melee', encumbrance: 'Two-Handed', damage: '2d6', critical: '19-20/x2' });
WeaponsData.set('Guisarme', { range: 'Melee', encumbrance: 'Two-Handed', damage: '2d4', critical: 'x3' });
WeaponsData.set('Halberd', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d10', critical: 'x3' });
WeaponsData.set('Lance', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d8', critical: 'x3' });
WeaponsData.set('Ranseur', { range: 'Melee', encumbrance: 'Two-Handed', damage: '2d4', critical: 'x3' });
WeaponsData.set('Scythe', { range: 'Melee', encumbrance: 'Two-Handed', damage: '2d4', critical: 'x4' });

// Martial Ranged Weapons
WeaponsData.set('Longbow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d8', critical: 'x3', rangeIncrement: 100 });
WeaponsData.set('Long Bow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d8', critical: 'x3', rangeIncrement: 100 });
WeaponsData.set('Composite Longbow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d8', critical: 'x3', rangeIncrement: 110 });
WeaponsData.set('Composite Long Bow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d8', critical: 'x3', rangeIncrement: 110 });
WeaponsData.set('Shortbow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d6', critical: 'x3', rangeIncrement: 60 });
WeaponsData.set('Short Bow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d6', critical: 'x3', rangeIncrement: 60 });
WeaponsData.set('Composite Shortbow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d6', critical: 'x3', rangeIncrement: 70 });
WeaponsData.set('Composite Short Bow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d6', critical: 'x3', rangeIncrement: 70 });

// Exotic Melee Weapons
WeaponsData.set('Kama', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: 'x2' });
WeaponsData.set('Kusarigama', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: 'x2' });
WeaponsData.set('Nunchaku', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: 'x2' });
WeaponsData.set('Sai', { range: 'Melee', encumbrance: 'Light', damage: '1d4', critical: 'x2' });
WeaponsData.set('Siangham', { range: 'Melee', encumbrance: 'Light', damage: '1d6', critical: 'x2' });
WeaponsData.set('Bastard Sword', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d10', critical: '19-20/x2' });
WeaponsData.set('Dwarven Waraxe', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d10', critical: 'x3' });
WeaponsData.set('Whip', { range: 'Melee', encumbrance: 'One-Handed', damage: '1d3', critical: 'x2' });
WeaponsData.set('Orc Axe', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d12', critical: 'x3' });
WeaponsData.set('Spiked Chain', { range: 'Melee', encumbrance: 'Two-Handed', damage: '2d4', critical: 'x2' });
WeaponsData.set('Dire Flail', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d8/1d8', critical: 'x2' });
WeaponsData.set('Gnome Hammer', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d8', critical: 'x3' });
WeaponsData.set('Two-bladed Sword', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d8', critical: '19-20/x2' });
WeaponsData.set('Dwarven Urgrosh', { range: 'Melee', encumbrance: 'Two-Handed', damage: '1d8', critical: 'x3' });

// Exotic Ranged Weapons
WeaponsData.set('Bolas', { range: 'Ranged', encumbrance: 'ranged', damage: '1d2', critical: 'x2', rangeIncrement: 10 });
WeaponsData.set('Hand Crossbow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d4', critical: '19-20/x2', rangeIncrement: 30 });
WeaponsData.set('Repeating Heavy Crossbow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d10', critical: '19-20/x2', rangeIncrement: 120 });
WeaponsData.set('Repeating Light Crossbow', { range: 'Ranged', encumbrance: 'ranged', damage: '1d8', critical: '19-20/x2', rangeIncrement: 80 });
WeaponsData.set('Net', { range: 'Ranged', encumbrance: 'ranged', damage: '—', critical: '—', rangeIncrement: 10 });
WeaponsData.set('Shuriken', { range: 'Ranged', encumbrance: 'ranged', damage: '1d2', critical: 'x2', rangeIncrement: 10 });

export interface CustomWeaponData {
  damage?: string;
  critical?: string;
  damageBonusFromWeapon?: number;
  rangeIncrement?: number;
  range?: 'Melee' | 'Ranged';
  encumbrance?: 'Light' | 'One-Handed' | 'Two-Handed' | 'ranged';
}

export const CustomWeapons = new Map<string, CustomWeaponData>([
  ['Short Sword (Green Dragon Bone)', { damage: '1d6', critical: '19-20/x2', damageBonusFromWeapon: 2 }],
  ['Flaming +1 Composite Longbow +5 Str', { damage: '1d8', critical: 'x3', range: 'Ranged', encumbrance: 'ranged', rangeIncrement: 110 }],
  ['Frost Waraxe +1 (Dwarvencraft)', { damage: '1d10', critical: 'x3', range: 'Melee', encumbrance: 'One-Handed' }],
  ['Light Purple Mournlode Mace (Magic+1)', { damage: '1d6', critical: 'x2' }],
  ['Heavy mace +2 (each blade in a shape of dragon)', { damage: '1d8', critical: 'x2' }]
]);

const specialWeaponMaterials = [
  'Adamantine',
  'Darkwood',
  'Dragonhide',
  'Cold Iron',
  'Mithral',
  'Silver',
  'Alchemical Silver'
];

export interface SpecialMaterialResult {
  material: string | null;
  name: string;
}

export function GetSpecialWeaponMaterial(name: string): SpecialMaterialResult {
  for (const material of specialWeaponMaterials) {
    if (name.includes(material)) {
      return { material: material, name: name.replace(material, '').trim() };
    }
  }
  return { material: null, name: name };
}

export function FindWeaponBaseName(fullName: string): string | null {
  // Truncate at '(' to get the basic name
  const basicName = fullName.split('(')[0].trim();
  const lowerBasic = basicName.toLowerCase();

  // 1. Direct match (case-insensitive)
  for (const baseName of WeaponsData.keys()) {
    if (baseName.toLowerCase() === lowerBasic) {
      return baseName;
    }
  }

  // 2. Substring match (case-insensitive)
  const sortedNames = Array.from(WeaponsData.keys()).sort((a, b) => b.length - a.length);
  for (const baseName of sortedNames) {
    if (lowerBasic.includes(baseName.toLowerCase())) {
      return baseName;
    }
  }
  return null;
}

export function IsAWeapon(name: string): boolean {
  const basicName = name.split('(')[0].trim();
  if (FindWeaponBaseName(basicName) !== null) return true;

  for (const customKey of CustomWeapons.keys()) {
    const customBasic = customKey.split('(')[0].trim();
    if (customKey === name || customBasic === basicName) {
      return true;
    }
  }
  return false;
}

export class Weapon {
  public name: string;
  public baseName: string | null;
  public rangeType: 'Melee' | 'Ranged' = 'Melee';
  public encumbrance: 'Light' | 'One-Handed' | 'Two-Handed' | 'ranged' = 'Light';
  public enhancement: number = 0;
  public damage: string = '1d3';
  public damageBonusFromWeapon: number = 0;
  public critical: string = 'x2';
  public range: number = 0;
  public weight: number = 0;
  public attackBonus!: WeaponAttackBonus;
  public damageBonus!: WeaponDamageBonus;
  public atkValue: string = '';
  public dmgValue: string = '';
  public critValue: string = '';
  public atkPartString: string = '';
  public dmgPartString: string = '';
  public statsString: string = '';
  public featAttackBonus: ModifiableProperty = new ModifiableProperty(0);
  public featDamageBonus: ModifiableProperty = new ModifiableProperty(0);

  constructor(name: string, description: string, weight: number, character: ICharacter) {
    // Reconstruct the full weapon name if notes are in description parentheses
    let fullName = name;
    if (description) {
      // In description, first parentheses content is stripped of leading/trailing parens by ParseItemsLine
      // but if there are multiple parens, description looks like: "Green Dragon Bone) (+1, 1d6..."
      const splitDesc = description.split(/\)\s*\(/);
      if (splitDesc.length > 1) {
        const notes = splitDesc[0].trim();
        if (!notes.match(/^[+\d]/)) {
          fullName = `${name} (${notes})`;
        }
      } else {
        // If there's no split (single parenthesis block in the original line)
        if (!description.match(/^[+\d]/) && !description.includes(',')) {
          fullName = `${name} (${description})`;
        }
      }
    }

    this.name = fullName;

    // Parse clean basic name (truncate at first '(')
    const basicName = fullName.split('(')[0].trim();
    this.baseName = FindWeaponBaseName(basicName);

    // If the base category isn't recognized and it's not a custom weapon, warn and return
    const isCustom = CustomWeapons.has(fullName) || CustomWeapons.has(basicName);
    if (!this.baseName && !isCustom) {
      console.warn(`Could not find weapon data for weapon: ${name}`);
      return;
    }

    // 1. Load standard values if baseName is recognized
    let weaponData: WeaponData | null = null;
    if (this.baseName) {
      weaponData = WeaponsData.get(this.baseName) || null;
    }

    let defaultDamage = '1d3';
    let defaultCritical = 'x2';
    let defaultRange = 0;
    let defaultDamageBonus = 0;

    if (weaponData) {
      this.rangeType = weaponData.range;
      this.encumbrance = weaponData.encumbrance;
      defaultDamage = weaponData.damage;
      defaultCritical = weaponData.critical;
      defaultRange = weaponData.rangeIncrement || 0;
    }

    // 2. Override with custom weapon template if found in library
    const customData = CustomWeapons.get(fullName) || CustomWeapons.get(basicName);
    if (customData) {
      if (customData.range) this.rangeType = customData.range;
      if (customData.encumbrance) this.encumbrance = customData.encumbrance;
      if (customData.damage) defaultDamage = customData.damage;
      if (customData.critical) defaultCritical = customData.critical;
      if (customData.rangeIncrement !== undefined) defaultRange = customData.rangeIncrement;
      if (customData.damageBonusFromWeapon !== undefined) defaultDamageBonus = customData.damageBonusFromWeapon;
    }

    this.damage = defaultDamage;
    this.critical = defaultCritical;
    this.range = defaultRange;
    this.damageBonusFromWeapon = defaultDamageBonus;
    this.weight = weight || 0;

    // 3. Parse enhancement bonus (+1, +2, etc.) from name (including basicName) or description
    // We use a negative lookahead to avoid matching non-weapon enhancement bonuses (e.g. "+2 to Trip", "+5 Str", "+2 resistance")
    const enhancementRegex = /\+(\d+)(?!\s*(?:str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma|ability|to|ac|hp|saves|save|resistance|deflection|dodge|shield|natural|armor|bab|initiative|speed|ft|feet|reach|inch|inches|meter|meters|bonus|modifier|on|against))/i;
    const nameEnhancementMatch = fullName.match(enhancementRegex);
    const descEnhancementMatch = description ? description.match(enhancementRegex) : null;
    const enhancementMatch = nameEnhancementMatch || descEnhancementMatch;
    if (enhancementMatch) {
      this.enhancement = parseInt(enhancementMatch[1]);
    }

    this.parseDescription(description);
    this.calculateWeaponStats(character);
    this.calculateBonuses(character);

    if (currentRegistry) {
      currentRegistry.registerItem(this);
    }
  }

  public matchesPattern(pattern: string): boolean {
    const patternLower = pattern.toLowerCase();
    return this.name.toLowerCase().includes(patternLower) ||
           (this.baseName !== null && this.baseName.toLowerCase().includes(patternLower));
  }

  parseDescription(description: string): void {
    if (description) {
      // Range increment override/fallback: matches 'range 80' or '80’'
      const rangeMatch = description.match(/range\s*(\d+)/i) || description.match(/(\d+)\s*’/);
      if (rangeMatch) this.range = parseInt(rangeMatch[1]);
    }
  }

  calculateWeaponStats(_character: ICharacter): void {
    // meant to be overridden by derived classes if special calculation is needed
  }

  calculateBonuses(character: ICharacter): void {
    let weaponAttackAbilityName: 'Str' | 'Dex' = this.rangeType === 'Melee' ? 'Str' : 'Dex';

    // Weapon Finesse check
    if (this.rangeType === 'Melee' && character.HasFeat('Weapon Finesse')) {
      const finesseBaseNames = ['Rapier', 'Whip', 'Spiked Chain', 'Unarmed'];
      if (this.encumbrance === 'Light' || (this.baseName && finesseBaseNames.includes(this.baseName))) {
        if (character.abilities.Dex.modifier > character.abilities.Str.modifier) {
          weaponAttackAbilityName = 'Dex';
        }
      }
    }

    const weaponAttackAbility = character.abilities[weaponAttackAbilityName];
    let weaponDamageAbility: any = this.rangeType === 'Melee' ? character.abilities['Str'] : null;

    // Composite bows add Strength to damage (capped at rating in name if rating exists)
    const isComposite = this.baseName && this.baseName.toLowerCase().includes('composite');
    if (isComposite) {
      const strAbility = character.abilities['Str'];
      if (strAbility) {
        // Find Str rating from name (e.g. "+5 Str")
        const compositeStrMatch = this.name.match(/\+(\d+)\s*Str/i);
        const strRating = compositeStrMatch ? parseInt(compositeStrMatch[1]) : 0;

        let cappedModifier = strAbility.modifier;
        if (strRating > 0) {
          cappedModifier = Math.min(strAbility.modifier, strRating);
        }

        // Construct a mock Ability object with the capped modifier
        const compositeAbility = Object.create(strAbility);
        Object.defineProperty(compositeAbility, 'modifier', {
          get: () => cappedModifier
        });
        Object.defineProperty(compositeAbility, 'ModifierString', {
          get: () => `${cappedModifier} Str modifier (composite capped)`
        });
        weaponDamageAbility = compositeAbility;
      }
    }

    this.attackBonus = new WeaponAttackBonus(character.bab, weaponAttackAbility, character.size, this.enhancement, this.featAttackBonus);
    this.damageBonus = new WeaponDamageBonus(weaponDamageAbility, character.damageBonus, this.damageBonusFromWeapon + this.enhancement, this.featDamageBonus);

    // Calculate unified stats strings
    const dice = (this.damage || '1d3').split(' ')[0];
    const dmgBonusSign = this.damageBonus.bonus >= 0 ? '+' : '-';
    const absoluteDmgBonus = Math.abs(this.damageBonus.bonus);
    const damageDisplay = `${dice} ${dmgBonusSign} ${absoluteDmgBonus}`;

    const crit = this.critical || 'x2';
    const rangeMatch = crit.match(/(\d+-\d+)/);
    const range = rangeMatch ? rangeMatch[1] : '';
    const multiplierMatch = crit.match(/[xX](\d+)/);
    const multiplier = multiplierMatch ? multiplierMatch[1] : '2';

    this.atkValue = `${this.attackBonus.bonus}`;
    this.dmgValue = damageDisplay;
    this.critValue = range ? `${range}X${multiplier}` : `X${multiplier}`;

    this.atkPartString = `Attack: ${this.atkValue}`;
    this.dmgPartString = `Damage: ${this.dmgValue}`;
    this.statsString = `${this.atkPartString} ${this.dmgPartString} Crit. ${this.critValue}`;
  }
}

export class ItemWeapon extends Weapon {
  constructor(item: Item, character: ICharacter) {
    super(item.name, item.description, item.weight, character);
  }
}

export class UnarmedWeapon extends Weapon {
  constructor(name: string, character: ICharacter) {
    super(name, '', 0, character);
  }

  calculateWeaponStats(character: ICharacter): void {
    const hasSUS = character.HasFeat('Superior Unarmed Strike');
    const hasINA = character.HasFeat('Improved Natural Attack');
    const effectiveMonkLevel = character.GetModifiableProperty('effectiveMonkLevel');

    // 1. Calculate base damage from classes
    let bestDamage = '1d3';
    let isMonkOrSimilar = false;

    for (const charClass of character.classes) {
      const classData = ClassesData.get(charClass.name);
      if (classData) {
        // If they have Monk levels, we use the Monk's progression
        if (charClass.name === 'Monk' || effectiveMonkLevel.currentScore > 0) {
          isMonkOrSimilar = true;
        }
        const damage = classData.GetUnarmedDamage(character, charClass.level);
        if (this.compareDamage(damage, bestDamage) > 0) {
          bestDamage = damage;
        }
      }
    }

    // 2. Handle Special Feats logic (SUS and INA)
    if (isMonkOrSimilar) {
      // For Monks, SUS gives +4 effective levels
      const baseProgression = ['1d6', '1d8', '1d10', '2d6', '2d8', '2d10', '4d8'];
      const susBonus = hasSUS ? 4 : 0;
      const calculatedLevel = effectiveMonkLevel.currentScore + susBonus;

      let baseKey = 0;
      if (calculatedLevel < 4) baseKey = 0;
      else if (calculatedLevel < 8) baseKey = 1;
      else if (calculatedLevel < 12) baseKey = 2;
      else if (calculatedLevel < 16) baseKey = 3;
      else if (calculatedLevel < 20) baseKey = 4;
      else baseKey = 5;

      if (hasINA) baseKey += 1;
      const finalKey = Math.min(baseKey, baseProgression.length - 1);
      this.damage = baseProgression[finalKey];
    } else if (hasSUS) {
      // For non-monks, SUS provides a specific progression based on HD
      const susProgression = ['1d4', '1d6', '1d8', '1d10', '2d6', '2d8'];
      const calculatedLevel = character.HD || 1;

      let baseKey = 0;
      if (calculatedLevel < 8) baseKey = 0;
      else if (calculatedLevel < 12) baseKey = 1;
      else if (calculatedLevel < 16) baseKey = 2;
      else if (calculatedLevel < 20) baseKey = 3;
      else baseKey = 4;

      if (hasINA) baseKey += 1;
      const finalKey = Math.min(baseKey, susProgression.length - 1);
      this.damage = susProgression[finalKey];
    } else {
      // Regular progression
      this.damage = bestDamage;
      if (hasINA) {
          // Improve damage by one step if they have INA
          const regularProgression = ['1d2', '1d3', '1d4', '1d6', '1d8', '2d6'];
          const index = regularProgression.indexOf(this.damage);
          if (index !== -1 && index < regularProgression.length - 1) {
              this.damage = regularProgression[index + 1];
          }
      }
    }

    if (isMonkOrSimilar || hasSUS) {
      const sizeStep = (character.size.currentSize.bonus - character.size.score.bonus) / 4;

      if (sizeStep > 0) {
        for (let i = 0; i < sizeStep; i++) {
          this.damage = getIncreasedDamage(this.damage);
        }
      } else if (sizeStep < 0) {
        for (let i = 0; i < Math.abs(sizeStep); i++) {
          this.damage = getDecreasedDamage(this.damage);
        }
      }
    }

    this.damageBonusFromWeapon = 0;
    this.critical = 'x2';
  }

  private compareDamage(dmg1: string, dmg2: string): number {
    const getAvg = (dice: string) => {
      const match = dice.match(/(\d+)d(\d+)/);
      if (!match) return parseInt(dice) || 0;
      return (parseInt(match[1]) * (parseInt(match[2]) + 1)) / 2;
    };
    return getAvg(dmg1) - getAvg(dmg2);
  }
}

function getIncreasedDamage(damage: string): string {
  switch (damage) {
    case '1d2': return '1d3';
    case '1d3': return '1d4';
    case '1d4': return '1d6';
    case '1d6': return '1d8';
    case '1d8': return '2d6';
    case '1d10': return '2d8';
    case '2d6': return '3d6';
    case '2d8': return '3d8';
    case '2d10': return '4d8';
    case '3d6': return '4d6';
    case '3d8': return '4d8';
    case '4d6': return '6d6';
    case '4d8': return '6d8';
    case '6d6': return '8d6';
    case '6d8': return '8d8';
    case '8d6': return '12d6';
    case '8d8': return '12d8';
    default: return damage;
  }
}

function getDecreasedDamage(damage: string): string {
  switch (damage) {
    case '1d3': return '1d2';
    case '1d4': return '1d3';
    case '1d6': return '1d4';
    case '1d8': return '1d6';
    case '2d6': return '1d8';
    case '2d8': return '1d10';
    case '3d6': return '2d6';
    case '3d8': return '2d8';
    case '4d8': return '2d10';
    case '4d6': return '3d6';
    case '6d6': return '4d6';
    case '6d8': return '4d8';
    case '8d6': return '6d6';
    case '8d8': return '6d8';
    case '12d6': return '8d6';
    case '12d8': return '8d8';
    default: return damage;
  }
}
