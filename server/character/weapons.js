const { WeaponAttackBonus, WeaponDamageBonus } = require('./property');

const WeaponsRangeTypes = new Map();

WeaponsRangeTypes.set('Gauntlet', { range: 'Melee' });
WeaponsRangeTypes.set('Unarmed', { range: 'Melee' });
WeaponsRangeTypes.set('Dagger', { range: 'Melee' });
WeaponsRangeTypes.set('Mace', { range: 'Melee' });
WeaponsRangeTypes.set('Sickle', { range: 'Melee' });
WeaponsRangeTypes.set('Club', { range: 'Melee' });
WeaponsRangeTypes.set('Heavy Mace', { range: 'Melee' });
WeaponsRangeTypes.set('Morningstar', { range: 'Melee' });
WeaponsRangeTypes.set('Short Spear', { range: 'Melee' });
WeaponsRangeTypes.set('Long Spear', { range: 'Melee' });
WeaponsRangeTypes.set('Quarterstaff', { range: 'Melee' });
WeaponsRangeTypes.set('Spear', { range: 'Melee' });

WeaponsRangeTypes.set('Light Crossbow', { range: 'Ranged' });
WeaponsRangeTypes.set('Heavy Crossbow', { range: 'Ranged' });
WeaponsRangeTypes.set('Dart', { range: 'Ranged' });
WeaponsRangeTypes.set('Javelin', { range: 'Ranged' });
WeaponsRangeTypes.set('Sling', { range: 'Ranged' });

WeaponsRangeTypes.set('Throwing Axe', { range: 'Melee' });
WeaponsRangeTypes.set('Light Hammer', { range: 'Melee' });
WeaponsRangeTypes.set('Handaxe', { range: 'Melee' });
WeaponsRangeTypes.set('Kukri', { range: 'Melee' });
WeaponsRangeTypes.set('Light Pick', { range: 'Melee' });
WeaponsRangeTypes.set('Sap', { range: 'Melee' });
WeaponsRangeTypes.set('Light Shield', { range: 'Melee' });
WeaponsRangeTypes.set('Spiked Armour', { range: 'Melee' });
WeaponsRangeTypes.set('Light Spiked Shield', { range: 'Melee' });
WeaponsRangeTypes.set('Short Sword', { range: 'Melee' });
WeaponsRangeTypes.set('Battleaxe', { range: 'Melee' });
WeaponsRangeTypes.set('Flail', { range: 'Melee' });
WeaponsRangeTypes.set('Longsword', { range: 'Melee' });
WeaponsRangeTypes.set('Pick', { range: 'Melee' });
WeaponsRangeTypes.set('Rapier', { range: 'Melee' });
WeaponsRangeTypes.set('Scimitar', { range: 'Melee' });
WeaponsRangeTypes.set('Heavy Shield', { range: 'Melee' });
WeaponsRangeTypes.set('Heavy Spiked Shield', { range: 'Melee' });
WeaponsRangeTypes.set('Trident', { range: 'Melee' });
WeaponsRangeTypes.set('Warhammer', { range: 'Melee' });
WeaponsRangeTypes.set('Falchion', { range: 'Melee' });
WeaponsRangeTypes.set('Glaive', { range: 'Melee' });
WeaponsRangeTypes.set('Greataxe', { range: 'Melee' });
WeaponsRangeTypes.set('Greatclub', { range: 'Melee' });
WeaponsRangeTypes.set('Heavy Flail', { range: 'Melee' });
WeaponsRangeTypes.set('Greatsword', { range: 'Melee' });
WeaponsRangeTypes.set('Guisarme', { range: 'Melee' });
WeaponsRangeTypes.set('Halberd', { range: 'Melee' });
WeaponsRangeTypes.set('Lance', { range: 'Melee' });
WeaponsRangeTypes.set('Ranseur', { range: 'Melee' });
WeaponsRangeTypes.set('Scythe', { range: 'Melee' });

WeaponsRangeTypes.set('Longbow', { range: 'Ranged' });
WeaponsRangeTypes.set('Composite Longbow', { range: 'Ranged' });
WeaponsRangeTypes.set('Shortbow', { range: 'Ranged' });
WeaponsRangeTypes.set('Composite Shortbow', { range: 'Ranged' });

WeaponsRangeTypes.set('Kama', { range: 'Melee' });
WeaponsRangeTypes.set('Kusarigama', { range: 'Melee' });
WeaponsRangeTypes.set('Nunchaku', { range: 'Melee' });
WeaponsRangeTypes.set('Sai', { range: 'Melee' });
WeaponsRangeTypes.set('Siangham', { range: 'Melee' });
WeaponsRangeTypes.set('Bastard Sword', { range: 'Melee' });
WeaponsRangeTypes.set('Dwarven Waraxe', { range: 'Melee' });
WeaponsRangeTypes.set('Whip', { range: 'Melee' });
WeaponsRangeTypes.set('Orc Axe', { range: 'Melee' });
WeaponsRangeTypes.set('Spiled Chain', { range: 'Melee' });
WeaponsRangeTypes.set('Dire Flail', { range: 'Melee' });
WeaponsRangeTypes.set('Gnome Hammer', { range: 'Melee' });
WeaponsRangeTypes.set('Two-bladed Sword', { range: 'Melee' });
WeaponsRangeTypes.set('Dwarven Urgrosh', { range: 'Melee' });

WeaponsRangeTypes.set('Bolas', { range: 'Ranged' });
WeaponsRangeTypes.set('Hand Crossbow', { range: 'Ranged' });
WeaponsRangeTypes.set('Repeating Heavy Crossbow', { range: 'Ranged' });
WeaponsRangeTypes.set('Repeating Light Crossbow', { range: 'Ranged' });
WeaponsRangeTypes.set('Net', { range: 'Ranged' });
WeaponsRangeTypes.set('Shuriken', { range: 'Ranged' });

const specialWeaponMaterials = [
  'Adamantine',
  'Darkwood',
  'Dragonhide',
  'Cold Iron',
  'Mithral',
  'Silver',
  'Alchemical Silver'
];

function GetSpecialWeaponMaterial(name) {
  for (const material of specialWeaponMaterials) {
    if (name.includes(material)) {
      return { material: material, name: name.replace(material, '').trim() };
    }
  }
  return { material: null, name: name };
}

function IsAWeapon(name) {
  return WeaponsRangeTypes.has(name);
}

class Weapon {
  constructor(name, bab, dmgBonus, abilities, size) {
    this.name = name;
    const weaponRangeType = WeaponsRangeTypes.get(name).range;
    if (!weaponRangeType) {
      console.warn(`Could not find weapon range type for weapon: ${name}`);
      return null;
    }

    const isWeaponMelee = weaponRangeType === 'Melee';
    const weaponAttackAbilityName = isWeaponMelee ? 'Str' : 'Dex';
    const weaponAttackAbility = abilities[weaponAttackAbilityName];
    const weaponDamageAbility = isWeaponMelee ? abilities[weaponAttackAbilityName] : null;
    this.attackBonus = new WeaponAttackBonus(bab, weaponAttackAbility, size);
    this.damageBonus = new WeaponDamageBonus(weaponDamageAbility, dmgBonus);
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    Weapon,
    GetSpecialWeaponMaterial,
    IsAWeapon,
    WeaponsRangeTypes
  };
}
