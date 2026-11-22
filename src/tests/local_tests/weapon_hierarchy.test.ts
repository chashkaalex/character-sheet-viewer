import { Character } from '../../server/character/character';
import {
  Weapon,
  MeleeWeapon,
  RangedWeapon,
  UnarmedWeapon,
  CreateWeaponFromItem
} from '../../server/character/gear/weapons/weapons';
import { Item } from '../../server/character/gear/items/items';

function buildWeaponHierarchyTestSheet(overrides: {
  feats?: string[];
  statuses?: string[];
  flaws?: string[];
  battleGear?: string[];
} = {}): string[] {
  return [
    'WeaponTester',
    '(Human Fighter 6)',
    'Init: +3; Senses: Listen +0, Spot +0;',
    'BAb: +6/+1; Grapple: +8; Hp: 50/50; Speed: 30 ft.',
    'Attack: +8 Longsword.',
    'AC: 13, Touch 13, Flat-footed 10.',
    'Saves: Fort +5; Ref +5; Will +2.',
    'Str: 14 (+2)',
    'Dex: 18 (+4)',
    'Con: 14 (+2)',
    'Int: 10 (+0)',
    'Wis: 10 (+0)',
    'Cha: 10 (+0)',
    'Statuses:',
    ...(overrides.statuses || []),
    'Feats:',
    ...(overrides.feats || []),
    'Special Abilities:',
    'Racial Traits:',
    'Bonus Abilities:',
    'Flaws, Traits, Quirks:',
    ...(overrides.flaws || []),
    'Skills:',
    'Battle Gear:',
    ...(overrides.battleGear || [
      'Longsword (1d8/19-20x2, 4 lb.)',
      'Rapier (1d6/18-20x2, 2 lb.)',
      'Flaming +1 Composite Longbow +5 Str (+1 1d8+1d6{fire} /X3)',
      'Light Crossbow (1d8/19-20x2, 4 lb.)'
    ]),
    'Possessions:',
    'Personal Information'
  ];
}

describe('Step 1.1c: Polymorphic MeleeWeapon and RangedWeapon Hierarchy', () => {
  test('1. ParseWeapons and CreateWeaponFromItem instantiate MeleeWeapon, UnarmedWeapon (extends MeleeWeapon), and RangedWeapon subclasses', () => {
    const character = new Character(buildWeaponHierarchyTestSheet());
    character.ParseCharacter();

    expect(character.parseSuccess).toBe(true);

    const unarmed = character.weapons.find(w => w.baseName === 'Unarmed')!;
    const longsword = character.weapons.find(w => w.baseName === 'Longsword')!;
    const rapier = character.weapons.find(w => w.baseName === 'Rapier')!;
    const bow = character.weapons.find(w => w.baseName === 'Composite Longbow')!;
    const crossbow = character.weapons.find(w => w.baseName === 'Light Crossbow')!;

    expect(unarmed).toBeInstanceOf(Weapon);
    expect(unarmed).toBeInstanceOf(MeleeWeapon);
    expect(unarmed).toBeInstanceOf(UnarmedWeapon);
    expect(unarmed).not.toBeInstanceOf(RangedWeapon);

    expect(longsword).toBeInstanceOf(Weapon);
    expect(longsword).toBeInstanceOf(MeleeWeapon);
    expect(longsword).not.toBeInstanceOf(RangedWeapon);

    expect(rapier).toBeInstanceOf(MeleeWeapon);
    expect(rapier).not.toBeInstanceOf(RangedWeapon);

    expect(bow).toBeInstanceOf(Weapon);
    expect(bow).toBeInstanceOf(RangedWeapon);
    expect(bow).not.toBeInstanceOf(MeleeWeapon);

    expect(crossbow).toBeInstanceOf(RangedWeapon);
    expect(crossbow).not.toBeInstanceOf(MeleeWeapon);

    // Direct factory check
    const daggerWeapon = CreateWeaponFromItem(new Item('Dagger', 1, ''), character);
    const slingWeapon = CreateWeaponFromItem(new Item('Sling', 1, ''), character);
    expect(daggerWeapon).toBeInstanceOf(MeleeWeapon);
    expect(slingWeapon).toBeInstanceOf(RangedWeapon);
  });

  test('2. MeleeWeapon encapsulates Weapon Finesse and melee bonuses, while RangedWeapon encapsulates Dex attack, Composite Str cap, and ranged bonuses', () => {
    const character = new Character(buildWeaponHierarchyTestSheet({
      feats: ['Weapon Finesse'],
      statuses: ['Charge: 1 rounds/1 rounds'],
      flaws: ['Shaky']
    }));
    character.ParseCharacter();

    const longsword = character.weapons.find(w => w.baseName === 'Longsword') as MeleeWeapon;
    const rapier = character.weapons.find(w => w.baseName === 'Rapier') as MeleeWeapon;
    const bow = character.weapons.find(w => w.baseName === 'Composite Longbow') as RangedWeapon;
    const crossbow = character.weapons.find(w => w.baseName === 'Light Crossbow') as RangedWeapon;

    // Longsword (One-Handed, not finessable): uses Str (+2) + BAB (+6) + Charge (+2 melee) = +10 attack
    expect(longsword.attackBonus.ability.name).toBe('Str');
    expect(longsword.attackBonus.bonus).toBe(10);

    // Rapier (finessable MeleeWeapon): uses Dex (+4) + BAB (+6) + Charge (+2 melee) = +12 attack, Str (+2) for damage
    expect(rapier.attackBonus.ability.name).toBe('Dex');
    expect(rapier.attackBonus.bonus).toBe(12);
    expect(rapier.damageBonus.bonus).toBe(2);

    // Composite Longbow +1 (+5 Str) (RangedWeapon): uses Dex (+4) + BAB (+6) + 1 enh - 2 Shaky = +9 attack
    // Damage: capped Str (+2, since Str mod +2 <= +5 cap) + 1 enh = +3
    expect(bow.attackBonus.ability.name).toBe('Dex');
    expect(bow.attackBonus.bonus).toBe(9);
    expect(bow.damageBonus.bonus).toBe(3);

    // Light Crossbow (non-composite RangedWeapon): uses Dex (+4) + BAB (+6) - 2 Shaky = +8 attack, 0 ability damage
    expect(crossbow.attackBonus.ability.name).toBe('Dex');
    expect(crossbow.attackBonus.bonus).toBe(8);
    expect(crossbow.damageBonus.bonus).toBe(0);
  });
});
