import { Character } from '../../server/character/character';
import { ActionsData, NumberAction } from '../../server/character/actions/actions_effects';

function buildPhase1CrusaderSheet(overrides: {
  classLine?: string;
  statuses?: string[];
  skills?: string[];
  chaLine?: string;
} = {}): string[] {
  return [
    'Naethan',
    overrides.classLine || '(Human Crusader 9)',
    'Init: +1; Senses: Listen +0, Spot +0;',
    'BAb: +9/+4; Grapple: +14; Hp: 101/101; Speed: 20 ft.',
    'Attack: +13 Longsword (1d8+4/19-20x2).',
    'AC: 11, Touch 11, Flat-footed 10.',
    'Saves: Fort +9; Ref +4; Will +5.',
    'Str: 19 (+4)',
    'Dex: 12 (+1)',
    'Con: 16 (+3)',
    'Int: 13 (+1)',
    'Wis: 10 (+0)',
    overrides.chaLine || 'Cha: 15 (+2)',
    'Statuses:',
    ...(overrides.statuses || []),
    'Feats:',
    'Combat Expertise,',
    'Improved Trip.',
    'Special Abilities:',
    'Racial Traits:',
    'Bonus Abilities:',
    'Flaws, Traits, Quirks:',
    'Skills:',
    ...(overrides.skills || [
      'Balance (Dex): 8',
      'Intimidate (Cha): 12',
      'Jump (Str): 12',
      'Martial Lore (Int): 12',
      'Ride (Dex): 8',
      'Tumble (Dex): 6'
    ]),
    'Battle Gear:',
    'Longsword (1d8/19-20x2, 4 lb.).',
    'Possessions:',
    'Personal Information'
  ];
}

describe('Naethan Phase 1: Crusader Class & Martial Lore Skill', () => {
  test('parses Human Crusader 9 and Martial Lore skill with zero errors or warnings', () => {
    const character = new Character(buildPhase1CrusaderSheet());
    character.ParseCharacter();

    expect(character.parseSuccess).toBe(true);
    expect(character.parseErrors).toEqual([]);
    expect(character.parseWarnings).toEqual([]);
    expect(character.race).toBe('Human');
    expect(character.GetClassLevel('Crusader')).toBe(9);
    expect(character.HD).toBe(9);
  });

  test('computes Crusader 9 BAB (+9), base Saves (Fort +6, Ref +3, Will +3), and Indomitable Soul (+Cha to Will)', () => {
    const character = new Character(buildPhase1CrusaderSheet());
    character.ParseCharacter();

    expect(character.bab.currentScore).toBe(9);
    // Fort: 6 (Crusader 9) + 3 (Con 16) = 9
    expect(character.saves.Fort.bonus).toBe(9);
    // Ref: 3 (Crusader 9) + 1 (Dex 12) = 4
    expect(character.saves.Ref.bonus).toBe(4);
    // Will: 3 (Crusader 9) + 0 (Wis 10) + 2 (Indomitable Soul from Cha 15) = 5
    expect(character.saves.Will.bonus).toBe(5);
    expect(character.saves.Will.string).toContain('Indomitable Soul');
  });

  test('Indomitable Soul includes temporary/status Charisma increases (e.g. Eagle\'s Splendor)', () => {
    const character = new Character(buildPhase1CrusaderSheet({
      statuses: ['Eagle\'s Splendor: 1 rounds/10 rounds']
    }));
    character.ParseCharacter();

    // Cha 15 + 4 (Eagle's Splendor) = 19 (+4 mod) -> Will = 3 (Crusader) + 0 (Wis) + 4 (Indomitable Soul) = 7
    expect(character.abilities.Cha?.modifier).toBe(4);
    expect(character.saves.Will.bonus).toBe(7);
  });

  test('Martial Lore skill uses Int modifier and does not suffer Armor Check Penalty', () => {
    const character = new Character(buildPhase1CrusaderSheet());
    character.ParseCharacter();

    const martialLore = character.skills.find(s => s.name === 'Martial Lore');
    expect(martialLore).toBeDefined();
    // 12 ranks + 1 Int = 13
    expect(martialLore!.bonus).toBe(13);
  });

  test('Crusader 9 registers Steely Resolve 15, Zealous Surge, Furious Counterstrike, and Smite', () => {
    const character = new Character(buildPhase1CrusaderSheet());
    character.ParseCharacter();

    expect(character.actions).toContain('Furious Counterstrike');
    expect(character.actions).toContain('Smite');

    const fcAction = ActionsData['Furious Counterstrike'] as NumberAction;
    expect(fcAction).toBeInstanceOf(NumberAction);
    expect(fcAction.maxNumberResolver(character)).toBe(15);

    expect(character.Special.list.some(e => e.status === 'Steely Resolve' && e.description.includes('15'))).toBe(true);
    expect(character.Special.list.some(e => e.status === 'Zealous Surge')).toBe(true);
    expect(character.Special.list.some(e => e.status === 'Indomitable Soul')).toBe(true);
    expect(character.Special.list.some(e => e.status === 'Smite')).toBe(true);
  });

  test('Furious Counterstrike status grants +1 (1-9 pool), +2 (10-14 pool), and +3 (15 pool) to attack and damage', () => {
    const charPool5 = new Character(buildPhase1CrusaderSheet({
      statuses: ['Furious Counterstrike 5: 1 rounds/1 rounds']
    }));
    charPool5.ParseCharacter();
    const sword5 = charPool5.weapons.find(w => w.baseName === 'Longsword')!;
    // Base Longsword: +9 BAB + 4 Str = +13 atk, +4 dmg -> +14 atk, +5 dmg with Furious Counterstrike 5 (+1)
    expect(sword5.attackBonus.bonus).toBe(14);
    expect(sword5.damageBonus.bonus).toBe(5);

    const charPool15 = new Character(buildPhase1CrusaderSheet({
      statuses: ['Furious Counterstrike 15: 1 rounds/1 rounds']
    }));
    charPool15.ParseCharacter();
    const sword15 = charPool15.weapons.find(w => w.baseName === 'Longsword')!;
    // Furious Counterstrike 15 -> +3 atk (+16), +3 dmg (+7)
    expect(sword15.attackBonus.bonus).toBe(16);
    expect(sword15.damageBonus.bonus).toBe(7);
  });

  test('Smite status grants +Cha modifier (+2) to attack and +Crusader level (+9) to damage', () => {
    const character = new Character(buildPhase1CrusaderSheet({
      statuses: ['Smite: 1 rounds/1 rounds']
    }));
    character.ParseCharacter();

    const sword = character.weapons.find(w => w.baseName === 'Longsword')!;
    // Base Longsword: +13 atk, +4 dmg -> +15 atk (+2 Cha), +13 dmg (+9 Crusader level)
    expect(sword.attackBonus.bonus).toBe(15);
    expect(sword.damageBonus.bonus).toBe(13);
  });
});

