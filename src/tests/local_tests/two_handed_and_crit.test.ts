import { Character } from '../../server/character/character';

function buildStep13Sheet(overrides: {
  str?: string;
  feats?: string[];
  battleGear?: string[];
} = {}): string[] {
  return [
    'Step13Tester',
    '(Human Fighter 8)',
    'Init: +2; Senses: Listen +0, Spot +0;',
    'BAb: +8/+3; Grapple: +12; Hp: 70/70; Speed: 30 ft.',
    'Attack: +12 Greatsword.',
    'AC: 12, Touch 12, Flat-footed 10.',
    'Saves: Fort +6; Ref +4; Will +2.',
    overrides.str || 'Str: 18 (+4)',
    'Dex: 14 (+2)',
    'Con: 14 (+2)',
    'Int: 10 (+0)',
    'Wis: 10 (+0)',
    'Cha: 10 (+0)',
    'Statuses:',
    'Feats:',
    ...(overrides.feats || []),
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

describe('Step 1.3: Two-Handed Weapons (1.5x Str), Handedness, and Critical Threat Range Scaling', () => {
  test('1. Two-Handed weapons (and [2H] one-handed weapons) apply 1.5x positive Strength modifier to damage, while negative Strength remains 1x', () => {
    const strongChar = new Character(buildStep13Sheet({
      str: 'Str: 18 (+4)',
      battleGear: [
        'Greatsword (2d6/19-20x2, 8 lb.)',
        'Longsword (1d8/19-20x2, 4 lb.)',
        'Bastard Sword (2H) (1d10/19-20x2, 6 lb.)',
        'Dagger (1d4/19-20x2, 1 lb.)'
      ]
    }));
    strongChar.ParseCharacter();

    const greatsword = strongChar.weapons.find(w => w.baseName === 'Greatsword')!;
    const longsword = strongChar.weapons.find(w => w.baseName === 'Longsword')!;
    const bastard2H = strongChar.weapons.find(w => w.baseName === 'Bastard Sword')!;
    const dagger = strongChar.weapons.find(w => w.baseName === 'Dagger')!;

    // Str 18 (+4) -> 1.5x = +6 for Two-Handed (Greatsword) and 2H-wielded Bastard Sword
    expect(greatsword.damageBonus.bonus).toBe(6);
    expect(greatsword.dmgValue).toBe('2d6 + 6');
    expect(greatsword.damageBonus.string).toContain('1.5x');

    expect(bastard2H.damageBonus.bonus).toBe(6);
    expect(bastard2H.dmgValue).toBe('1d10 + 6');

    // One-Handed (Longsword) and Light (Dagger) get 1.0x Str = +4
    expect(longsword.damageBonus.bonus).toBe(4);
    expect(dagger.damageBonus.bonus).toBe(4);

    // Negative Strength (Str 8 -> -1) applies -1 (1.0x penalty, NOT -2) even on a Greatsword
    const weakChar = new Character(buildStep13Sheet({
      str: 'Str: 8 (-1)',
      battleGear: ['Greatsword (2d6/19-20x2, 8 lb.)']
    }));
    weakChar.ParseCharacter();

    const weakGreatsword = weakChar.weapons.find(w => w.baseName === 'Greatsword')!;
    expect(weakGreatsword.damageBonus.bonus).toBe(-1);
    expect(weakGreatsword.dmgValue).toBe('2d6 - 1');
  });

  test('2. Improved Critical feat doubles the threat range of the selected weapon (20 -> 19-20, 19-20 -> 17-20, 18-20 -> 15-20)', () => {
    const critChar = new Character(buildStep13Sheet({
      feats: [
        'Improved Critical (Scimitar)',
        'Improved Critical: Longsword',
        'Improved Critical (Greataxe)'
      ],
      battleGear: [
        'Scimitar',
        'Longsword',
        'Greataxe',
        'Dagger'
      ]
    }));
    critChar.ParseCharacter();

    const scimitar = critChar.weapons.find(w => w.baseName === 'Scimitar')!;
    const longsword = critChar.weapons.find(w => w.baseName === 'Longsword')!;
    const greataxe = critChar.weapons.find(w => w.baseName === 'Greataxe')!;
    const dagger = critChar.weapons.find(w => w.baseName === 'Dagger')!;

    // Scimitar base 18-20/x2 (3 faces) -> 15-20/x2 (6 faces)
    expect(scimitar.critValue).toBe('15-20X2');
    // Longsword base 19-20/x2 (2 faces) -> 17-20/x2 (4 faces)
    expect(longsword.critValue).toBe('17-20X2');
    // Greataxe base x3 (1 face: 20) -> 19-20/x3 (2 faces)
    expect(greataxe.critValue).toBe('19-20X3');
    // Dagger has no Improved Critical -> remains 19-20X2
    expect(dagger.critValue).toBe('19-20X2');
  });

  test('3. Keen weapon property doubles threat range and does NOT stack with Improved Critical', () => {
    const keenChar = new Character(buildStep13Sheet({
      feats: ['Improved Critical (Rapier)'],
      battleGear: [
        'Keen Falchion +1',
        'Keen Rapier +1',
        'Longsword +1 (Keen)'
      ]
    }));
    keenChar.ParseCharacter();

    const falchion = keenChar.weapons.find(w => w.baseName === 'Falchion')!;
    const rapier = keenChar.weapons.find(w => w.baseName === 'Rapier')!;
    const longsword = keenChar.weapons.find(w => w.baseName === 'Longsword')!;

    // Keen Falchion +1 (base 18-20/x2) -> 15-20X2
    expect(falchion.critValue).toBe('15-20X2');
    // Keen Rapier +1 ALSO has Improved Critical (Rapier) -> must NOT stack beyond 15-20X2!
    expect(rapier.critValue).toBe('15-20X2');
    // Longsword +1 (Keen) (base 19-20/x2) -> 17-20X2
    expect(longsword.critValue).toBe('17-20X2');
  });
});
