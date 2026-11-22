import { Character } from '../../server/character/character';
import { ActionsData, NumberAction } from '../../server/character/actions/actions_effects';
import { calculateNormalFullAttack, getBaseBab } from '../../server/character/gear/weapons/full_attack';
import { SpecialAttackBonus } from '../../server/character/property';
import { StaticPropertyEffect } from '../../server/character/state/effects';

function buildTestSheet(overrides: {
  classLine?: string;
  statuses?: string[];
  feats?: string[];
  flaws?: string[];
  battleGear?: string[];
  str?: string;
  dex?: string;
  cha?: string;
} = {}): string[] {
  return [
    'TestHero',
    overrides.classLine || '(Human Fighter 3)',
    'Init: +2; Senses: Listen +0, Spot +0;',
    'BAb: +3; Grapple: +6; Hp: 30/30; Speed: 30 ft.',
    'Attack: +6 Longsword (1d8+3/19-20x2).',
    'AC: 12, Touch 12, Flat-footed 10.',
    'Saves: Fort +3; Ref +3; Will +1.',
    overrides.str || 'Str: 16 (+3)',
    overrides.dex || 'Dex: 14 (+2)',
    'Con: 14 (+2)',
    'Int: 13 (+1)',
    'Wis: 10 (+0)',
    overrides.cha || 'Cha: 14 (+2)',
    'Statuses:',
    ...(overrides.statuses || []),
    'Feats:',
    ...(overrides.feats || ['Combat Expertise']),
    'Special Abilities:',
    'Racial Traits:',
    'Bonus Abilities:',
    'Flaws, Traits, Quirks:',
    ...(overrides.flaws || []),
    'Skills:',
    'Tumble (Dex): 5',
    'Battle Gear:',
    ...(overrides.battleGear || [
      'Longsword (1d8/19-20x2, 4 lb.)',
      'Composite Longbow (1d8/x3, 3 lb.)'
    ]),
    'Possessions:',
    'Personal Information'
  ];
}

describe('Step 1.1: BAB vs. Attack Roll Modifiers Separation', () => {
  test('1. True BAB remains unpolluted by general attack roll buffs and penalties (Haste, Tower Shield, Combat Expertise, Shaken)', () => {
    const character = new Character(buildTestSheet({
      classLine: '(Human Fighter 5)',
      statuses: [
        'Haste: 1 rounds/5 rounds',
        'Combat Expertise -3: 1 rounds/1 rounds',
        'Shaken: 1 rounds/5 rounds'
      ],
      battleGear: [
        'Longsword (1d8/19-20x2, 4 lb.)',
        'Composite Longbow (1d8/x3, 3 lb.)',
        'Tower Shield (45 lb.)'
      ]
    }));
    character.ParseCharacter();

    expect(character.parseSuccess).toBe(true);
    // True BAB from Fighter 5 is strictly +5
    expect(character.bab.currentScore).toBe(5);
    expect(getBaseBab(character)).toBe(5);

    // General attackBonus aggregates: +1 (Haste) - 3 (Combat Expertise) - 2 (Shaken) - 2 (Tower Shield) = -6
    expect(character.attackBonus.currentScore).toBe(-6);

    // Longsword attack: +5 BAB + 2 Str (16 - 2 Shaken = 14 -> +2) - 6 attackBonus = +1
    const sword = character.weapons.find(w => w.baseName === 'Longsword')!;
    expect(sword.attackBonus.bonus).toBe(1);

    // Composite Longbow attack: +5 BAB + 1 Dex (14 - 2 Shaken = 12 -> +1) - 6 attackBonus = 0
    const bow = character.weapons.find(w => w.baseName === 'Composite Longbow')!;
    expect(bow.attackBonus.bonus).toBe(0);

    // Grapple check includes BAB (+5) + Str (+2) + attackBonus (-6) = +1
    const grapple = character.specialAttacks['Grapple'] as SpecialAttackBonus;
    expect(grapple.bonus).toBe(1);
  });

  test('2. Combat Expertise cap and iterative attacks depend strictly on true BAB, not temporary attack bonuses', () => {
    const character = new Character(buildTestSheet({
      classLine: '(Human Fighter 4)',
      statuses: [
        'Haste: 1 rounds/5 rounds',
        'Inspire Courage +2: 1 rounds/5 rounds',
        'Prayer: 1 rounds/5 rounds'
      ]
    }));
    character.ParseCharacter();

    // Fighter 4 has true BAB = 4, despite +4 total attackBonus from Haste (+1), Inspire Courage (+2), Prayer (+1)
    expect(character.bab.currentScore).toBe(4);
    expect(character.attackBonus.currentScore).toBe(4);

    // Combat Expertise max cap is Math.min(5, BAB) = 4 (NOT 5!)
    const ceAction = ActionsData['Combat Expertise'] as NumberAction;
    expect(ceAction.maxNumberResolver(character)).toBe(4);

    // Normal full attack for Fighter 4 with Haste has 1 base attack + 1 Haste attack = 2 attacks (NOT 2 iterative + 1 Haste = 3)
    const sword = character.weapons.find(w => w.baseName === 'Longsword')!;
    const fullAtk = calculateNormalFullAttack(sword, character);
    expect(fullAtk.attacks.length).toBe(2);

    // However, if a true BAB effect (like Divine Power setting BAB to +6) is applied to bab, iteratives DO increase
    character.bab.applyEffect(new StaticPropertyEffect({
      status: 'Divine Power',
      property: 'bab',
      modifierType: 'Enhancement',
      value: 2
    }));
    expect(character.bab.currentScore).toBe(6);
    expect(ceAction.maxNumberResolver(character)).toBe(5);
    const fullAtkAfterDivinePower = calculateNormalFullAttack(sword, character);
    // 2 iteratives (+6/+1) + 1 Haste extra attack = 3 attacks
    expect(fullAtkAfterDivinePower.attacks.length).toBe(3);
  });

  test('3. Melee-only (Charge, Smite) and Ranged-only (Shaky) modifiers are isolated to their respective weapon types', () => {
    const character = new Character(buildTestSheet({
      classLine: '(Human Crusader 6)',
      statuses: [
        'Charge: 1 rounds/1 rounds',
        'Smite: 1 rounds/1 rounds'
      ],
      flaws: ['Shaky'],
      battleGear: [
        'Longsword (1d8/19-20x2, 4 lb.)',
        'Composite Longbow (1d8/x3, 3 lb.)'
      ]
    }));
    character.ParseCharacter();

    // Crusader 6: BAB = +6, Str 16 (+3), Dex 14 (+2), Cha 14 (+2)
    expect(character.bab.currentScore).toBe(6);
    // Charge (+2 melee) + Smite (+2 Cha melee) = +4 meleeAttackBonus
    expect(character.meleeAttackBonus.currentScore).toBe(4);
    // Smite (+6 Crusader level) = +6 meleeDamageBonus
    expect(character.meleeDamageBonus.currentScore).toBe(6);
    // Shaky flaw = -2 rangedAttackBonus
    expect(character.rangedAttackBonus.currentScore).toBe(-2);

    const sword = character.weapons.find(w => w.baseName === 'Longsword')!;
    const bow = character.weapons.find(w => w.baseName === 'Composite Longbow')!;

    // Longsword (Melee): +6 BAB + 3 Str + 4 meleeAttackBonus (Charge +2, Smite +2) = +13 (unaffected by Shaky -2)
    expect(sword.attackBonus.bonus).toBe(13);
    // Longsword Damage: +3 Str + 6 meleeDamageBonus (Smite) = +9
    expect(sword.damageBonus.bonus).toBe(9);

    // Composite Longbow (Ranged): +6 BAB + 2 Dex - 2 rangedAttackBonus (Shaky) = +6 (unaffected by Charge or Smite!)
    expect(bow.attackBonus.bonus).toBe(6);
    // Composite Longbow Damage: +3 Str + 0 rangedDamageBonus = +3 (unaffected by Smite +6 melee damage!)
    expect(bow.damageBonus.bonus).toBe(3);
  });

  test('4. Amulet of Mighty Fists applies +1 attack and +1 damage ONLY to Unarmed strike, not manufactured weapons', () => {
    const character = new Character(buildTestSheet({
      classLine: '(Human Monk 4)',
      battleGear: [
        'Amulet of Mighty Fists',
        'Quarterstaff',
        'Light Crossbow'
      ]
    }));
    character.ParseCharacter();

    // Monk 4: BAB +3, Str 16 (+3), Dex 14 (+2)
    const unarmed = character.weapons.find(w => w.baseName === 'Unarmed')!;
    const staff = character.weapons.find(w => w.baseName === 'Quarterstaff')!;
    const crossbow = character.weapons.find(w => w.baseName === 'Light Crossbow')!;

    // Unarmed: +3 BAB + 3 Str + 1 Amulet of Mighty Fists = +7 attack, +3 Str + 1 Amulet = +4 damage
    expect(unarmed.attackBonus.bonus).toBe(7);
    expect(unarmed.damageBonus.bonus).toBe(4);

    // Quarterstaff: +3 BAB + 3 Str = +6 attack, +3 Str = +3 damage (no Amulet bonus!)
    expect(staff.attackBonus.bonus).toBe(6);
    expect(staff.damageBonus.bonus).toBe(3);

    // Light Crossbow: +3 BAB + 2 Dex = +5 attack, +0 damage (no Amulet bonus!)
    expect(crossbow.attackBonus.bonus).toBe(5);
    expect(crossbow.damageBonus.bonus).toBe(0);
  });
});
