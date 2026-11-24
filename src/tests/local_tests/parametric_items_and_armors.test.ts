import { Character } from '../../server/character/character';
import { Armor, Item } from '../../server/character/gear/items/items';
import { ResolveStandardWondrousItemEffects, StandardWondrousItems } from '../../server/character/gear/items/wondrous_items';
import { UniqueItemEffects } from '../../server/character/gear/items/unique_items';

function buildStep21Sheet(overrides: {
  battleGear?: string[];
} = {}): string[] {
  return [
    'Step21Tester',
    '(Human Monk 4)',
    'Init: +2; Senses: Listen +0, Spot +0;',
    'BAb: +3; Grapple: +5; Hp: 35/35; Speed: 40 ft.',
    'Attack: +5 Unarmed.',
    'AC: 15, Touch 15, Flat-footed 13.',
    'Saves: Fort +6; Ref +6; Will +6.',
    'Str: 14 (+2)',
    'Dex: 14 (+2)',
    'Con: 14 (+2)',
    'Int: 14 (+2)',
    'Wis: 14 (+2)',
    'Cha: 14 (+2)',
    'Statuses:',
    'Feats:',
    'Special Abilities:',
    'Racial Traits:',
    'Bonus Abilities:',
    'Flaws, Traits, Quirks:',
    'Skills:',
    'Battle Gear:',
    ...(overrides.battleGear || []),
    'Possessions:',
    'Personal Information'
  ];
}

describe('Step 2.1: Parametric Standard Magic Items, Automatic Armor/Shield AC & Modular Item Files', () => {
  test('1. Separate modules exist for StandardWondrousItems (wondrous_items.ts) and UniqueItemEffects (unique_items.ts)', () => {
    expect(StandardWondrousItems).toBeDefined();
    expect(typeof ResolveStandardWondrousItemEffects).toBe('function');
    expect(UniqueItemEffects).toBeDefined();
    expect(UniqueItemEffects['Thror\'s Holy Symbol of Moradin']).toBeDefined();
  });

  test('2. Unregistered magic and masterwork armors & shields automatically compute their Armor/Shield AC bonus and Body slot', () => {
    const chainShirt = new Armor('Mithral Chain Shirt +3', 1, '');
    // Chain Shirt base AC = 4, +3 enhancement => +7 Armor AC, Body slot = 'Body'
    expect(chainShirt.bodySlot).toBe('Body');
    expect(chainShirt.enhancement).toBe(3);

    const heavyShield = new Armor('Darkwood Heavy Shield +2', 1, '');
    // Heavy Shield base AC = 2, +2 enhancement => +4 Shield AC
    expect(heavyShield.enhancement).toBe(2);

    const char = new Character([
      ...buildStep21Sheet({
        battleGear: [
          'Mithral Chain Shirt +3',
          'Darkwood Heavy Shield +2'
        ]
      }).map(l => l === '(Human Monk 4)' ? '(Human Fighter 4)' : l)
    ]);
    char.ParseCharacter();

    expect(char.parseSuccess).toBe(true);
    expect(char.parseWarnings).toEqual([]);
    expect(char.bodySlots.get('Body')).toBe(0);
    // Fighter 4: 10 base + 2 Dex + 7 Armor (Mithral Chain Shirt +3) + 4 Shield (Darkwood Heavy Shield +2) = 23 AC
    expect(char.ac.currentArmorClass).toBe(23);
    expect(char.ac.flatFootedArmorClass).toBe(21);
    expect(char.ac.touchArmorClass).toBe(12);
  });

  test('3. Parametric wondrous items and rings resolve any +N tier for abilities, saves, deflection, natural armor, and bracers of armor', () => {
    const char = new Character(buildStep21Sheet({
      battleGear: [
        'Belt of Giant Strength +6',
        'Gloves of Dexterity +6',
        'Amulet of Health +4',
        'Headband of Intellect +6',
        'Cloak of Charisma +6',
        'Vest of Resistance +5',
        'Ring of Protection +5',
        'Bracers of Armor +8'
      ]
    }));
    char.ParseCharacter();

    expect(char.parseWarnings).toEqual([]);
    // Base abilities are all 14 (+2)
    expect(char.abilities.Str.currentScore).toBe(20); // 14 + 6
    expect(char.abilities.Dex.currentScore).toBe(20); // 14 + 6
    expect(char.abilities.Con.currentScore).toBe(18); // 14 + 4
    expect(char.abilities.Int.currentScore).toBe(20); // 14 + 6
    expect(char.abilities.Cha.currentScore).toBe(20); // 14 + 6

    // Monk 4 base saves = +4; with new ability mods (Con 18 -> +4, Dex 20 -> +5, Wis 14 -> +2) + 5 Resistance:
    expect(char.saves.Fort.bonus).toBe(4 + 4 + 5); // 13
    expect(char.saves.Ref.bonus).toBe(4 + 5 + 5);  // 14
    expect(char.saves.Will.bonus).toBe(4 + 2 + 5); // 11

    // AC: 10 base + 5 Dex + 2 Wis (Monk) + 8 Armor (Bracers +8) + 5 Deflection (Ring +5) = 30
    expect(char.ac.currentArmorClass).toBe(30);

    // Check Neck slot items (Periapt of Wisdom +6 and Amulet of Natural Armor +4) on a second character
    const char2 = new Character(buildStep21Sheet({
      battleGear: [
        'Periapt of Wisdom +6',
        'Ring of Deflection +4'
      ]
    }));
    char2.ParseCharacter();
    expect(char2.abilities.Wis.currentScore).toBe(20); // 14 + 6

    const amuletNat4 = new Item('Amulet of Natural Armor +4', 1, '');
    expect(amuletNat4.effects).toEqual([
      { status: 'Amulet of Natural Armor +4', property: 'ac', modifierType: 'Natural Armor', value: 4 }
    ]);
  });

  test('4. Amulet of Mighty Fists +N scales unarmed attack and damage by +N without affecting manufactured weapons', () => {
    const char = new Character(buildStep21Sheet({
      battleGear: [
        'Amulet of Mighty Fists +3',
        'Quarterstaff'
      ]
    }));
    char.ParseCharacter();

    const unarmed = char.weapons.find(w => w.baseName === 'Unarmed')!;
    const staff = char.weapons.find(w => w.baseName === 'Quarterstaff')!;

    // Monk 4: BAB +3, Str 14 (+2) => Unarmed base +5 atk / +2 dmg -> with Amulet +3 => +8 atk / +5 dmg
    expect(unarmed.attackBonus.bonus).toBe(8);
    expect(unarmed.damageBonus.bonus).toBe(5);

    // Quarterstaff: unaffected by Amulet of Mighty Fists (+5 atk / +2 dmg)
    expect(staff.attackBonus.bonus).toBe(5);
    expect(staff.damageBonus.bonus).toBe(2);
  });
});
