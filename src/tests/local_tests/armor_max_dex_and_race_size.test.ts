import { Character } from '../../server/character/character';
import { Armor } from '../../server/character/gear/items/items';
import { RacesData } from '../../server/races_data/races_general_data';
import { CreatureSize } from '../../server/character/property';
import { Sizes } from '../../server/character/constants';
import { SpecialAttackBonus } from '../../server/character/property';

function buildStep12Sheet(overrides: {
  raceAndClass?: string;
  dex?: string;
  str?: string;
  statuses?: string[];
  feats?: string[];
  skills?: string[];
  battleGear?: string[];
} = {}): string[] {
  return [
    'Step12Tester',
    overrides.raceAndClass || '(Human Fighter 4)',
    'Init: +4; Senses: Listen +0, Spot +0;',
    'BAb: +4; Grapple: +6; Hp: 40/40; Speed: 30 ft.',
    'Attack: +6 Longsword.',
    'AC: 14, Touch 14, Flat-footed 10.',
    'Saves: Fort +4; Ref +5; Will +1.',
    overrides.str || 'Str: 14 (+2)',
    overrides.dex || 'Dex: 18 (+4)',
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
    'Skills:',
    ...(overrides.skills || ['Hide (Dex): 4', 'Tumble (Dex): 5']),
    'Battle Gear:',
    ...(overrides.battleGear || []),
    'Possessions:',
    'Personal Information'
  ];
}

describe('Step 1.2: Armor Max Dex Cap, Special Materials, losesDexToAc & Base Race Sizes', () => {
  test('1. Equipped Armor and Tower Shield enforce lowest Max Dexterity bonus on Normal and Touch AC', () => {
    // Dex 18 (+4), wearing Full Plate +1 (Armor +9, maxDex +1)
    const fullPlateChar = new Character(buildStep12Sheet({
      dex: 'Dex: 18 (+4)',
      battleGear: ['Full Plate +1']
    }));
    fullPlateChar.ParseCharacter();

    expect(fullPlateChar.ac.maxDexBonus).toBe(1);
    // Normal AC: 10 base + 9 Armor + 1 capped Dex = 20 (NOT 23)
    expect(fullPlateChar.ac.currentArmorClass).toBe(20);
    // Touch AC: 10 base + 1 capped Dex = 11 (NOT 14)
    expect(fullPlateChar.ac.touchArmorClass).toBe(11);
    // Flat-footed AC: 10 base + 9 Armor + 0 Dex = 19
    expect(fullPlateChar.ac.flatFootedArmorClass).toBe(19);

    // Dex 18 (+4), wearing Glamour Studded Leather Armor +1 (maxDex +5) + Tower Shield (maxDex +2, Shield +4)
    const towerShieldChar = new Character(buildStep12Sheet({
      dex: 'Dex: 18 (+4)',
      battleGear: ['Glamour Studded Leather Armor +1', 'Tower Shield']
    }));
    towerShieldChar.ParseCharacter();

    // Lowest maxDex between Studded Leather (+5) and Tower Shield (+2) is +2
    expect(towerShieldChar.ac.maxDexBonus).toBe(2);
    // Normal AC: 10 base + 4 Armor + 4 Shield + 2 capped Dex = 20
    expect(towerShieldChar.ac.currentArmorClass).toBe(20);
    expect(towerShieldChar.ac.touchArmorClass).toBe(12);
  });

  test('2. Mithral and Masterwork/Magic armors adjust maxDex, ACP, and armorType automatically, and unequipped secondary armors do not cap Dex', () => {
    const mithralFullPlate = new Armor('Mithral Full Plate +1', 1, '');
    // Full Plate base: Heavy, maxDex 1, ACP -6 -> Mithral: Medium, maxDex 3 (+2), ACP -3 (-6 + 3)
    expect(mithralFullPlate.armorType).toBe('Medium');
    expect(mithralFullPlate.maxDex).toBe(3);
    expect(mithralFullPlate.acpValue).toBe(-3);

    const mwChainShirt = new Armor('Masterwork Chain Shirt', 1, '');
    // Chain Shirt base: Light, maxDex 4, ACP -2 -> Masterwork: ACP -1
    expect(mwChainShirt.armorType).toBe('Light');
    expect(mwChainShirt.maxDex).toBe(4);
    expect(mwChainShirt.acpValue).toBe(-1);

    // Character wearing Glamour Studded Leather Armor +1 (Body slot taken, maxDex 5) with a spare Full Plate +1 in Battle Gear
    const dualArmorChar = new Character(buildStep12Sheet({
      dex: 'Dex: 18 (+4)',
      battleGear: [
        'Glamour Studded Leather Armor +1',
        'Full Plate +1'
      ]
    }));
    dualArmorChar.ParseCharacter();

    // Since Body slot was already taken by Studded Leather (maxDex 5), Full Plate +1 is unequipped and must NOT cap Dex to 1!
    expect(dualArmorChar.ac.maxDexBonus).toBe(5);
    expect(dualArmorChar.ac.currentArmorClass).toBe(18); // 10 + 4 Armor + 4 Dex
  });

  test('3. losesDexToAc (e.g. Run action without Run feat) strips positive Dex and Dodge bonuses from Normal and Touch AC', () => {
    // Character with Dex 18 (+4), Fighting Defensively (+3 Dodge with 5 Tumble ranks), and Run status (no Run feat)
    const runningNoFeat = new Character(buildStep12Sheet({
      dex: 'Dex: 18 (+4)',
      statuses: [
        'Fighting Defensively: 1 rounds/1 rounds',
        'Run: 1 rounds/1 rounds'
      ]
    }));
    runningNoFeat.ParseCharacter();

    expect(runningNoFeat.ac.losesDexToAc).toBe(true);
    // Loses +4 Dex and +3 Dodge -> Normal AC = 10, Touch AC = 10, Flat-Footed AC = 10
    expect(runningNoFeat.ac.currentArmorClass).toBe(10);
    expect(runningNoFeat.ac.touchArmorClass).toBe(10);

    // Same character WITH the Run feat retains Dex (+4) and Dodge (+3) while running -> AC = 17
    const runningWithFeat = new Character(buildStep12Sheet({
      dex: 'Dex: 18 (+4)',
      feats: ['Run'],
      statuses: [
        'Fighting Defensively: 1 rounds/1 rounds',
        'Run: 1 rounds/1 rounds'
      ]
    }));
    runningWithFeat.ParseCharacter();

    expect(runningWithFeat.ac.losesDexToAc).toBe(false);
    expect(runningWithFeat.ac.currentArmorClass).toBe(17);
    expect(runningWithFeat.ac.touchArmorClass).toBe(17);
  });

  test('4. Small race base size applies +1 size to AC & Attack, -4 size to Grapple/Trip, +4 size to Hide, and scales weapon damage down 1 step', () => {
    // Register a Small race (Halfling) in RacesData if not yet present
    const hadHalfling = RacesData.has('Halfling');
    const prevHalfling = RacesData.get('Halfling');
    RacesData.set('Halfling', {
      size: new CreatureSize(Sizes['Small']),
      speed: 20,
      effects: []
    });

    try {
      const smallChar = new Character(buildStep12Sheet({
        raceAndClass: '(Halfling Fighter 4)',
        str: 'Str: 14 (+2)',
        dex: 'Dex: 14 (+2)',
        skills: ['Hide (Dex): 4'],
        battleGear: ['Longsword (1d8/19-20x2, 4 lb.)']
      }));
      smallChar.ParseCharacter();

      expect(smallChar.parseSuccess).toBe(true);
      expect(smallChar.size.currentSize.name).toBe('Small');
      expect(smallChar.size.modifier).toBe(1);
      expect(smallChar.size.bonus).toBe(-4);

      // AC: 10 base + 2 Dex + 1 Size = 13
      expect(smallChar.ac.currentArmorClass).toBe(13);

      // Longsword: BAB (+4) + Str (+2) + Size (+1) = +7 attack; Medium 1d8 scaled down 1 step to Small = 1d6
      const sword = smallChar.weapons.find(w => w.baseName === 'Longsword')!;
      expect(sword.attackBonus.bonus).toBe(7);
      expect(sword.damage).toBe('1d6');

      // Unarmed: Small unarmed base damage is 1d2
      const unarmed = smallChar.weapons.find(w => w.baseName === 'Unarmed')!;
      expect(unarmed.damage).toBe('1d2');

      // Grapple: BAB (+4) + Str (+2) + Size (-4) = +2
      const grapple = smallChar.specialAttacks['Grapple'] as SpecialAttackBonus;
      expect(grapple.bonus).toBe(2);

      // Hide: 4 ranks + 2 Dex + 4 Size = +10
      const hide = smallChar.skills.find(s => s.name === 'Hide')!;
      expect(hide.bonus).toBe(10);
    } finally {
      if (hadHalfling && prevHalfling) {
        RacesData.set('Halfling', prevHalfling);
      } else {
        RacesData.delete('Halfling');
      }
    }
  });
});
