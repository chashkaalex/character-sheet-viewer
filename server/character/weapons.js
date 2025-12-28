
const weaponsRangeTypes = new Map();

weaponsRangeTypes.set('Gauntlet', { range: 'Melee' });
weaponsRangeTypes.set('Unarmed', { range: 'Melee' });
weaponsRangeTypes.set('Dagger', { range: 'Melee' });
weaponsRangeTypes.set('Mace', { range: 'Melee' });
weaponsRangeTypes.set('Sickle', { range: 'Melee' });
weaponsRangeTypes.set('Club', { range: 'Melee' });
weaponsRangeTypes.set('Heavy Mace', { range: 'Melee' });
weaponsRangeTypes.set('Morningstar', { range: 'Melee' });
weaponsRangeTypes.set('Short Spear', { range: 'Melee' });
weaponsRangeTypes.set('Long Spear', { range: 'Melee' });
weaponsRangeTypes.set('Quarterstaff', { range: 'Melee' });
weaponsRangeTypes.set('Spear', { range: 'Melee' });

weaponsRangeTypes.set('Light Crossbow', { range: 'Ranged' });
weaponsRangeTypes.set('Heavy Crossbow', { range: 'Ranged' });
weaponsRangeTypes.set('Dart', { range: 'Ranged' });
weaponsRangeTypes.set('Javelin', { range: 'Ranged' });
weaponsRangeTypes.set('Sling', { range: 'Ranged' });

weaponsRangeTypes.set('Throwing Axe', { range: 'Melee' });
weaponsRangeTypes.set('Light Hammer', { range: 'Melee' });
weaponsRangeTypes.set('Handaxe', { range: 'Melee' });
weaponsRangeTypes.set('Kukri', { range: 'Melee' });
weaponsRangeTypes.set('Light Pick', { range: 'Melee' });
weaponsRangeTypes.set('Sap', { range: 'Melee' });
weaponsRangeTypes.set('Light Shield', { range: 'Melee' });
weaponsRangeTypes.set('Spiked Armour', { range: 'Melee' });
weaponsRangeTypes.set('Light Spiked Shield', { range: 'Melee' });
weaponsRangeTypes.set('Short Sword', { range: 'Melee' });
weaponsRangeTypes.set('Battleaxe', { range: 'Melee' });
weaponsRangeTypes.set('Flail', { range: 'Melee' });
weaponsRangeTypes.set('Longsword', { range: 'Melee' });
weaponsRangeTypes.set('Pick', { range: 'Melee' });
weaponsRangeTypes.set('Rapier', { range: 'Melee' });
weaponsRangeTypes.set('Scimitar', { range: 'Melee' });
weaponsRangeTypes.set('Heavy Shield', { range: 'Melee' });
weaponsRangeTypes.set('Heavy Spiked Shield', { range: 'Melee' });
weaponsRangeTypes.set('Trident', { range: 'Melee' });
weaponsRangeTypes.set('Warhammer', { range: 'Melee' });
weaponsRangeTypes.set('Falchion', { range: 'Melee' });
weaponsRangeTypes.set('Glaive', { range: 'Melee' });
weaponsRangeTypes.set('Greataxe', { range: 'Melee' });
weaponsRangeTypes.set('Greatclub', { range: 'Melee' });
weaponsRangeTypes.set('Heavy Flail', { range: 'Melee' });
weaponsRangeTypes.set('Greatsword', { range: 'Melee' });
weaponsRangeTypes.set('Guisarme', { range: 'Melee' });
weaponsRangeTypes.set('Halberd', { range: 'Melee' });
weaponsRangeTypes.set('Lance', { range: 'Melee' });
weaponsRangeTypes.set('Ranseur', { range: 'Melee' });
weaponsRangeTypes.set('Scythe', { range: 'Melee' });

weaponsRangeTypes.set('Longbow', { range: 'Ranged' });
weaponsRangeTypes.set('Composite Longbow', { range: 'Ranged' });
weaponsRangeTypes.set('Shortbow', { range: 'Ranged' });
weaponsRangeTypes.set('Composite Shortbow', { range: 'Ranged' });

weaponsRangeTypes.set('Kama', { range: 'Melee' });
weaponsRangeTypes.set('Kusarigama', { range: 'Melee' });
weaponsRangeTypes.set('Nunchaku', { range: 'Melee' });
weaponsRangeTypes.set('Sai', { range: 'Melee' });
weaponsRangeTypes.set('Siangham', { range: 'Melee' });
weaponsRangeTypes.set('Bastard Sword', { range: 'Melee' });
weaponsRangeTypes.set('Dwarven Waraxe', { range: 'Melee' });
weaponsRangeTypes.set('Whip', { range: 'Melee' });
weaponsRangeTypes.set('Orc Axe', { range: 'Melee' });
weaponsRangeTypes.set('Spiled Chain', { range: 'Melee' });
weaponsRangeTypes.set('Dire Flail', { range: 'Melee' });
weaponsRangeTypes.set('Gnome Hammer', { range: 'Melee' });
weaponsRangeTypes.set('Two-bladed Sword', { range: 'Melee' });
weaponsRangeTypes.set('Dwarven Urgrosh', { range: 'Melee' });

weaponsRangeTypes.set('Bolas', { range: 'Ranged' });
weaponsRangeTypes.set('Hand Crossbow', { range: 'Ranged' });
weaponsRangeTypes.set('Repeating Heavy Crossbow', { range: 'Ranged' });
weaponsRangeTypes.set('Repeating Light Crossbow', { range: 'Ranged' });
weaponsRangeTypes.set('Net', { range: 'Ranged' });
weaponsRangeTypes.set('Shuriken', { range: 'Ranged' });

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
  return weaponRangeType = weaponsRangeTypes.has(name);
}

class Weapon {
  constructor(name, bab, dmgBonus, abilities, size) {
    this.name = name;
    const weaponRangeType = weaponsRangeTypes.get(name).range;
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
