import { Character } from '../../server/character/character';
import { Armor, Item } from '../../server/character/gear/items/items';
import { InferItemWeight, GuessWeightFromItemName } from '../../server/character/gear/items/items_parser';
import { CalculateCarryingCapacity, CalculateCharacterEncumbrance } from '../../server/character/properties/encumbrance';
import { createInventoryItem, renderInventoryWeightSummaries } from '../../client/ts/character/inventory';

function buildStep22Sheet(overrides: {
  raceAndClass?: string;
  strLine?: string;
  dexLine?: string;
  speedFt?: number;
  battleGear?: string[];
} = {}): string[] {
  const speed = overrides.speedFt ?? 30;
  return [
    'EncumbranceTester',
    overrides.raceAndClass || '(Human Fighter 4)',
    'Init: +2; Senses: Listen +0, Spot +0;',
    `BAb: +4; Grapple: +6; Hp: 35/35; Speed: ${speed} ft.`,
    'Attack: +6 Unarmed.',
    'AC: 14, Touch 14, Flat-footed 12.',
    'Saves: Fort +4; Ref +3; Will +1.',
    overrides.strLine || 'Str: 10 (+0)',
    overrides.dexLine || 'Dex: 18 (+4)',
    'Con: 14 (+2)',
    'Int: 10 (+0)',
    'Wis: 10 (+0)',
    'Cha: 10 (+0)',
    'Statuses:',
    'Feats:',
    'Special Abilities:',
    'Racial Traits:',
    'Bonus Abilities:',
    'Flaws, Traits, Quirks:',
    'Skills:',
    'Climb (Str): 4',
    'Battle Gear:',
    ...(overrides.battleGear || []),
    'Possessions:',
    'Personal Information'
  ];
}

describe('Step 2.2: Mandatory Item Weights, Unique Item Weight Inference, Armor Speed Reduction & Encumbrance', () => {
  test('1. Standard armors, shields, and weapons resolve PHB weights (with Mithral/Darkwood halving) when description omits weight', () => {
    const fullPlate = new Armor('Full Plate +1', 1, '');
    expect(fullPlate.weight).toBe(50);

    const mithralBreastplate = new Armor('Mithral Breastplate +1', 1, '');
    // Base Breastplate is 30 lb -> Mithral halves weight to 15 lb
    expect(mithralBreastplate.weight).toBe(15);

    const darkwoodShield = new Armor('Darkwood Heavy Shield +2', 1, '');
    // Base Heavy Shield is 10 lb -> Darkwood halves weight to 5 lb
    expect(darkwoodShield.weight).toBe(5);

    const greatsword = new Item('Greatsword +1', 1, '');
    expect(greatsword.weight).toBe(8);

    const dagger = new Item('Mithral Dagger', 1, '');
    expect(dagger.weight).toBe(0.5);

    const frostWaraxe = new Item('Frost Waraxe +1', 1, '');
    expect(frostWaraxe.weight).toBe(8);
    expect(frostWaraxe.isWeightKnown).toBe(true);

    // Explicit weight in description still overrides inferred weight
    const customPlate = new Armor('Black Dragoncraft Full Plate +2', 1, '40 lb');
    expect(customPlate.weight).toBe(40);
  });

  test('2. Unique and wondrous items without explicit weight infer sensible weights from their item name keywords', () => {
    expect(new Item('Helm of Glorious Recovery', 1, '').weight).toBe(3);
    expect(new Item('Cloak of Resistance +3', 1, '').weight).toBe(1);
    expect(new Item('Whisperleaf Striders', 1, '').weight).toBe(1);
    expect(new Item('Boots of Agile Leaping', 1, '').weight).toBe(1);
    expect(new Item('Monks Chain Belt', 1, '').weight).toBe(2);
    expect(new Item('Belt of Giant Strength +4', 1, '').weight).toBe(1);
    expect(new Item('Hand Wraps with Adamantine Plates', 1, '').weight).toBe(2);
    expect(new Item('Gloves of Dexterity +2', 1, '').weight).toBe(0.5);
    expect(new Item('Bracers of Armor +3', 1, '').weight).toBe(1);
    expect(new Item('Thror\'s Holy Symbol of Moradin', 1, '').weight).toBe(1);
    expect(new Item('Ring of Protection +2', 1, '').weight).toBe(0);
    expect(new Item('Amulet of Natural Armor +1', 1, '').weight).toBe(0);
    expect(new Item('Goggles of the Golden Sun', 1, '').weight).toBe(0);
    expect(InferItemWeight('Explorer\'s Outfit Masterwork', '')).toBe(8);
  });

  test('3. Medium and Heavy armors automatically reduce speed (30 -> 20, 20 -> 15), except for Dwarves or Mithral Medium-to-Light armor', () => {
    // Human in Chainmail (Medium) -> 30 ft reduced to 20 ft
    const humanMedium = new Character(buildStep22Sheet({
      raceAndClass: '(Human Fighter 4)',
      strLine: 'Str: 18 (+4)',
      battleGear: ['Chainmail +1']
    }));
    humanMedium.ParseCharacter();
    expect(humanMedium.speed.currentScore).toBe(20);

    // Human in Mithral Breastplate (Medium reduced to Light by Mithral) -> stays 30 ft
    const humanMithral = new Character(buildStep22Sheet({
      raceAndClass: '(Human Fighter 4)',
      strLine: 'Str: 18 (+4)',
      battleGear: ['Mithral Breastplate +1']
    }));
    humanMithral.ParseCharacter();
    expect(humanMithral.speed.currentScore).toBe(30);

    // Dwarf in Full Plate (Heavy) -> stays 20 ft (Dwarf racial trait ignores armor/load speed reduction)
    const dwarfHeavy = new Character(buildStep22Sheet({
      raceAndClass: '(Dwarf Fighter 4)',
      strLine: 'Str: 18 (+4)',
      speedFt: 20,
      battleGear: ['Full Plate +1']
    }));
    dwarfHeavy.ParseCharacter();
    expect(dwarfHeavy.speed.currentScore).toBe(20);
  });

  test('4. Carrying capacity table (PHB Table 9-1) and encumbrance load penalties (Max Dex, worse-of ACP, speed reduction)', () => {
    // PHB Table 9-1 checks
    expect(CalculateCarryingCapacity(10, 'Medium')).toEqual({
      lightLoadMax: 33,
      mediumLoadMax: 66,
      heavyLoadMax: 100
    });
    expect(CalculateCarryingCapacity(18, 'Medium')).toEqual({
      lightLoadMax: 100,
      mediumLoadMax: 200,
      heavyLoadMax: 300
    });
    expect(CalculateCarryingCapacity(10, 'Small')).toEqual({
      lightLoadMax: 24.75,
      mediumLoadMax: 49.5,
      heavyLoadMax: 75
    });
    expect(CalculateCarryingCapacity(10, 'Large')).toEqual({
      lightLoadMax: 66,
      mediumLoadMax: 132,
      heavyLoadMax: 200
    });

    // Unarmored Human Fighter with Str 10 (Light <= 33, Medium <= 66, Heavy <= 100), Dex 18 (+4)
    // Carrying 50 lb item => Medium Load: Max Dex capped at +3 (AC = 13), ACP = -3, Speed = 20 ft.
    const mediumLoadChar = new Character(buildStep22Sheet({
      strLine: 'Str: 10 (+0)',
      dexLine: 'Dex: 18 (+4)',
      battleGear: ['Anvil of Trials (50 lb)']
    }));
    mediumLoadChar.ParseCharacter();

    const encMed = CalculateCharacterEncumbrance(mediumLoadChar);
    expect(encMed.totalWeight).toBe(50);
    expect(encMed.loadCategory).toBe('Medium');
    expect(mediumLoadChar.ac.currentArmorClass).toBe(13); // 10 + 3 (Dex capped at +3 by Medium Load)
    expect(mediumLoadChar.acp.currentScore).toBe(-3);
    expect(mediumLoadChar.speed.currentScore).toBe(20);

    // Carrying 80 lb item with Str 10 => Heavy Load: Max Dex capped at +1 (AC = 11), ACP = -6, Speed = 20 ft.
    const heavyLoadChar = new Character(buildStep22Sheet({
      strLine: 'Str: 10 (+0)',
      dexLine: 'Dex: 18 (+4)',
      battleGear: ['Heavy Statue (80 lb)']
    }));
    heavyLoadChar.ParseCharacter();
    expect(heavyLoadChar.encumbrance.loadCategory).toBe('Heavy');
    expect(heavyLoadChar.ac.currentArmorClass).toBe(11); // 10 + 1 (Dex capped at +1 by Heavy Load)
    expect(heavyLoadChar.acp.currentScore).toBe(-6);
    expect(heavyLoadChar.speed.currentScore).toBe(20);
  });

  test('5. Items whose weight cannot be inferred default weight to 0, set isWeightKnown=false, and emit a parseWarning', () => {
    expect(GuessWeightFromItemName('Mysterious Unknown Relic')).toBeNull();
    expect(InferItemWeight('Mysterious Unknown Relic', '')).toBeNull();

    const unknownItem = new Item('Mysterious Unknown Relic', 1, '');
    expect(unknownItem.weight).toBe(0);
    expect(unknownItem.isWeightKnown).toBe(false);

    // Known weightless items (like rings) have weight 0 AND isWeightKnown = true
    const ring = new Item('Ring of Protection +1', 1, '');
    expect(ring.weight).toBe(0);
    expect(ring.isWeightKnown).toBe(true);

    const charWithUnknownWeight = new Character(buildStep22Sheet({
      battleGear: ['Mysterious Unknown Relic']
    }));
    charWithUnknownWeight.ParseCharacter();
    expect(charWithUnknownWeight.parseWarnings).toContain('Item Mysterious Unknown Relic weight not found');
  });

  test('6. Overloaded character emits a parseWarning, and client inventory UI depicts per-item weights, total gear weight, and load category', () => {
    // Str 10 (max heavy load = 100 lb) carrying 120 lb => Overloaded
    const overloadedChar = new Character(buildStep22Sheet({
      strLine: 'Str: 10 (+0)',
      battleGear: ['Lead Statue (120 lb)']
    }));
    overloadedChar.ParseCharacter();

    expect(overloadedChar.encumbrance.loadCategory).toBe('Overloaded');
    expect(overloadedChar.parseWarnings).toContain('Character is overloaded: 120 lb carried (max heavy load: 100 lb)');

    // Client per-item weight display
    (global as any).document = {
      createElement: () => ({
        className: '',
        dataset: {},
        innerHTML: ''
      })
    };
    const knownItemEl = createInventoryItem({ name: 'Full Plate +1', amount: 1, weight: 50, isWeightKnown: true }, 0, 'battleGear');
    expect(knownItemEl.innerHTML).toContain('50 lb');

    const stackedItemEl = createInventoryItem({ name: 'Throwing Axe', amount: 4, weight: 2, isWeightKnown: true }, 1, 'battleGear');
    expect(stackedItemEl.innerHTML).toContain('8 lb');

    const unknownItemEl = createInventoryItem({ name: 'Mystery Orb', amount: 1, weight: 0, isWeightKnown: false }, 2, 'battleGear');
    expect(unknownItemEl.innerHTML).toContain('? lb');

    // Client total gear weight and load category summary
    const summaries = renderInventoryWeightSummaries({
      encumbrance: overloadedChar.encumbrance,
      battleGear: [{ name: 'Lead Statue', amount: 1, weight: 120, isWeightKnown: true }],
      possessions: [{ name: 'Backpack', amount: 1, weight: 2, isWeightKnown: true }, { name: 'Rope', amount: 1, weight: 10, isWeightKnown: true }]
    } as any);
    expect(summaries.battleGearHtml).toContain('120 / 100 lb');
    expect(summaries.battleGearHtml).toContain('Overloaded');
    expect(summaries.possessionsHtml).toContain('12 lb');
  });
});
