import { WeaponAttackBonus, WeaponDamageBonus, ModifiableProperty, Ability, CreatureSize } from './property';

export interface WeaponData {
  range: 'Melee' | 'Ranged';
  encumbrance: 'Light' | 'One-Handed' | 'Two-Handed' | 'ranged';
}

export const WeaponsData = new Map<string, WeaponData>();

WeaponsData.set('Gauntlet', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Unarmed', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Dagger', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Mace', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Sickle', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Club', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Heavy Mace', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Morningstar', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Short Spear', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Long Spear', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Quarterstaff', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Spear', { range: 'Melee', encumbrance: 'Two-Handed' });

WeaponsData.set('Light Crossbow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Light Coil Crossbow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Heavy Crossbow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Dart', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Javelin', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Sling', { range: 'Ranged', encumbrance: 'ranged' });

WeaponsData.set('Throwing Axe', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Light Hammer', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Handaxe', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Kukri', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Light Pick', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Sap', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Light Shield', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Spiked Armour', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Light Spiked Shield', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Short Sword', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Battleaxe', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Flail', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Longsword', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Pick', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Rapier', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Scimitar', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Heavy Shield', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Heavy Spiked Shield', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Trident', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Warhammer', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Falchion', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Glaive', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Greataxe', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Greatclub', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Heavy Flail', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Greatsword', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Guisarme', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Halberd', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Lance', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Ranseur', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Scythe', { range: 'Melee', encumbrance: 'Two-Handed' });

WeaponsData.set('Longbow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Long Bow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Composite Longbow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Composite Long Bow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Shortbow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Short Bow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Composite Shortbow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Composite Short Bow', { range: 'Ranged', encumbrance: 'ranged' });

WeaponsData.set('Kama', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Kusarigama', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Nunchaku', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Sai', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Siangham', { range: 'Melee', encumbrance: 'Light' });
WeaponsData.set('Bastard Sword', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Dwarven Waraxe', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Whip', { range: 'Melee', encumbrance: 'One-Handed' });
WeaponsData.set('Orc Axe', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Spiked Chain', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Dire Flail', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Gnome Hammer', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Two-bladed Sword', { range: 'Melee', encumbrance: 'Two-Handed' });
WeaponsData.set('Dwarven Urgrosh', { range: 'Melee', encumbrance: 'Two-Handed' });

WeaponsData.set('Bolas', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Hand Crossbow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Repeating Heavy Crossbow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Repeating Light Crossbow', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Net', { range: 'Ranged', encumbrance: 'ranged' });
WeaponsData.set('Shuriken', { range: 'Ranged', encumbrance: 'ranged' });

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
  if (WeaponsData.has(fullName)) return fullName;

  const sortedNames = Array.from(WeaponsData.keys()).sort((a, b) => b.length - a.length);
  for (const baseName of sortedNames) {
    if (fullName.includes(baseName)) {
      return baseName;
    }
  }
  return null;
}

export function IsAWeapon(name: string): boolean {
  return FindWeaponBaseName(name) !== null;
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

  constructor(name: string, description: string, weight: number, character: any) {
    this.name = name;
    this.baseName = FindWeaponBaseName(name);

    if (!this.baseName) {
      console.warn(`Could not find weapon data for weapon: ${name}`);
      return;
    }

    const weaponData = WeaponsData.get(this.baseName);
    if (weaponData) {
      this.rangeType = weaponData.range;
      this.encumbrance = weaponData.encumbrance;
    }

    this.weight = weight || 0;

    this.parseDescription(description);
    this.calculateWeaponStats(character);
    this.calculateBonuses(character);
  }

  parseDescription(description: string): void {
    if (description) {
      // Enhancement bonus: matches '+1', '+2', etc.
      const enhancementMatch = description.match(/\+(\d+)/);
      if (enhancementMatch) this.enhancement = parseInt(enhancementMatch[1]);

      // Damage & Critical stats: matches '1d6 + 2/19-20' or '1d8/x3'
      const damageMatch = description.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*\/\s*([\d-xX]+)/);
      if (damageMatch) {
        const fullDamage = damageMatch[1].trim();
        const bonusPart = fullDamage.match(/[+-]\s*(\d+)/);
        this.damageBonusFromWeapon = bonusPart ? parseInt(fullDamage.substring(fullDamage.indexOf(bonusPart[0])).replace(/\s+/g, '')) : 0;
        this.damage = fullDamage.split(' ')[0];
        this.critical = damageMatch[2].trim();
      } else {
        const justDamageMatch = description.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/);
        if (justDamageMatch) {
          const fullDamage = justDamageMatch[1].trim();
          const bonusPart = fullDamage.match(/[+-]\s*(\d+)/);
          this.damageBonusFromWeapon = bonusPart ? parseInt(fullDamage.substring(fullDamage.indexOf(bonusPart[0])).replace(/\s+/g, '')) : 0;
          this.damage = fullDamage.split(' ')[0];
        }
      }

      // Range increment: matches 'range 80' or '80’'
      const rangeMatch = description.match(/range\s*(\d+)/i) || description.match(/(\d+)\s*’/);
      if (rangeMatch) this.range = parseInt(rangeMatch[1]);
    }
  }

  calculateWeaponStats(_character: any): void {
    // meant to be overridden by derived classes if special calculation is needed
  }

  calculateBonuses(character: any): void {
    let weaponAttackAbilityName: 'Str' | 'Dex' = this.rangeType === 'Melee' ? 'Str' : 'Dex';

    // Weapon Finesse check
    if (this.rangeType === 'Melee' && typeof character.hasWeaponFinesse === 'function' && character.hasWeaponFinesse()) {
      const finesseBaseNames = ['Rapier', 'Whip', 'Spiked Chain', 'Unarmed'];
      if (this.encumbrance === 'Light' || (this.baseName && finesseBaseNames.includes(this.baseName))) {
        if (character.abilities.Dex.modifier > character.abilities.Str.modifier) {
          weaponAttackAbilityName = 'Dex';
        }
      }
    }

    const weaponAttackAbility = character.abilities[weaponAttackAbilityName];
    const weaponDamageAbility = this.rangeType === 'Melee' ? character.abilities['Str'] : null;

    this.attackBonus = new WeaponAttackBonus(character.bab, weaponAttackAbility, character.size, this.enhancement);
    this.damageBonus = new WeaponDamageBonus(weaponDamageAbility, character.damageBonus, this.damageBonusFromWeapon);

    // Calculate unified stats strings
    const dice = (this.damage || '1d3').split(' ')[0];
    const dmgBonusSign = this.damageBonus.bonus >= 0 ? '+' : '-';
    const absoluteDmgBonus = Math.abs(this.damageBonus.bonus);
    const damageDisplay = `${dice} ${dmgBonusSign} ${absoluteDmgBonus}`;

    const crit = this.critical || '20';
    const rangeMatch = crit.match(/(\d+-\d+)/);
    const range = rangeMatch ? rangeMatch[1] : '20';
    const multiplierMatch = crit.match(/[xX](\d+)/);
    const multiplier = multiplierMatch ? multiplierMatch[1] : '2';

    this.atkValue = `${this.attackBonus.bonus}`;
    this.dmgValue = damageDisplay;
    this.critValue = `${range}X${multiplier}`;

    this.atkPartString = `Attack: ${this.atkValue}`;
    this.dmgPartString = `Damage: ${this.dmgValue}`;
    this.statsString = `${this.atkPartString} ${this.dmgPartString} Crit. ${this.critValue}`;
  }
}

export class ItemWeapon extends Weapon {
  constructor(item: any, character: any) {
    super(item.name, item.description, item.weight, character);
  }
}

export class UnarmedWeapon extends Weapon {
  constructor(name: string, character: any) {
    super(name, '', 0, character);
  }

  calculateWeaponStats(character: any): void {
    let unarmedProgressionArray = ['1d3', '1d4', '1d6'];
    let baseKey = 0;

    const isMonk = character.classes.some((c: any) => c.name === 'Monk');
    const hasSUS = character.feats.some((f: any[]) => f.some(e => e.status === 'Superior Unarmed Strike'));
    const hasINA = character.feats.some((f: any[]) => f.some(e => e.status === 'Improved Natural Attack'));

    let effectiveLevel = 0;
    if (character.effectiveMonkLevel) {
      effectiveLevel = character.effectiveMonkLevel.currentScore;
    }

    if (isMonk || effectiveLevel > 0) {
      unarmedProgressionArray = ['1d6', '1d8', '1d10', '2d6', '2d8', '2d10', '4d8'];
      const susBonus = hasSUS ? 4 : 0;
      const calculatedLevel = effectiveLevel + susBonus;

      if (calculatedLevel < 4) baseKey = 0;
      else if (calculatedLevel < 8) baseKey = 1;
      else if (calculatedLevel < 12) baseKey = 2;
      else if (calculatedLevel < 16) baseKey = 3;
      else if (calculatedLevel < 20) baseKey = 4;
      else baseKey = 5;
    } else if (hasSUS) {
      unarmedProgressionArray = ['1d4', '1d6', '1d8', '1d10', '2d6', '2d8'];
      const calculatedLevel = character.HD || 1;

      if (calculatedLevel < 8) baseKey = 0;
      else if (calculatedLevel < 12) baseKey = 1;
      else if (calculatedLevel < 16) baseKey = 2;
      else if (calculatedLevel < 20) baseKey = 3;
      else baseKey = 4;
    }

    if (hasINA) {
      baseKey += 1;
    }

    const finalKey = Math.min(baseKey, unarmedProgressionArray.length - 1);
    this.damage = unarmedProgressionArray[finalKey];
    this.damageBonusFromWeapon = 0;
    this.critical = 'x2';
  }
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = {
    Weapon,
    ItemWeapon,
    UnarmedWeapon,
    GetSpecialWeaponMaterial,
    IsAWeapon,
    WeaponsData,
    FindWeaponBaseName
  };
}
