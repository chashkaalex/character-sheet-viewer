import { Character } from '../../server/character/character';
import { SpecialAttackBonus } from '../../server/character/property';
import { ActionsData } from '../../server/character/actions/actions_effects';

function buildPhase2TestSheet(overrides: {
  feats?: string[];
  flaws?: string[];
  statuses?: string[];
  skills?: string[];
  battleGear?: string[];
} = {}): string[] {
  return [
    'Naethan',
    '(Human Fighter 9)',
    'Init: +1; Senses: Listen +0, Spot +0;',
    'BAb: +9/+4; Grapple: +14; Hp: 101/101; Speed: 20 ft.',
    'Attack: +13 Longsword (1d8+4/19-20x2) or +6 Shortbow (1d6/x3).',
    'AC: 12, Touch 12, Flat-footed 11.',
    'Saves: Fort +10; Ref +5; Will +4.',
    'Str: 19 (+4)',
    'Dex: 12 (+1)',
    'Con: 16 (+3)',
    'Int: 13 (+1)',
    'Wis: 10 (+0)',
    'Cha: 15 (+2)',
    'Statuses:',
    ...(overrides.statuses || []),
    'Feats:',
    ...(overrides.feats || [
      'Combat Expertise,',
      'Improved Trip,',
      'Exotic Weapon Proficiency (Spiked Chain),',
      'Extra Granted Maneuver,',
      'Faith Unswerving,',
      'Devoted Bulwark,',
      'Luck of Heroes,',
      'Iron Guard\'s Glare (Stance) – Enemies you threaten take a -4 penalty on attack rolls against your allies,',
      'Roots of the Mountain (Stance) – +10 bonus on checks against bull rush, overrun, trip, and tumble, and gain DR 2/-,',
      'Bolstering Voice (Stance) – Allies within 60 ft. gain +2 morale bonus on Will saves (+4 against fear).'
    ]),
    'Special Abilities:',
    'Racial Traits:',
    'Bonus Abilities:',
    'Flaws, Traits, Quirks:',
    ...(overrides.flaws || [
      'Shaky (-2 penalty on ranged attack rolls),',
      'No Time For Book Learning (Illiterate).'
    ]),
    'Skills:',
    ...(overrides.skills || [
      'Balance (Dex): 8',
      'Intimidate (Cha): 12',
      'Jump (Str): 12',
      'Ride (Dex): 8',
      'Tumble (Dex): 6'
    ]),
    'Battle Gear:',
    ...(overrides.battleGear || [
      'Longsword (1d8/19-20x2, 4 lb.),',
      'Shortbow (1d6/x3, 2 lb.).'
    ]),
    'Possessions:',
    'Personal Information'
  ];
}

describe('Naethan Phase 2: Feats, Stances (as Actions), & Flaws', () => {
  test('parses all of Naethan\'s feats and flaws without any parse warnings', () => {
    const character = new Character(buildPhase2TestSheet());
    character.ParseCharacter();

    expect(character.parseSuccess).toBe(true);
    expect(character.parseErrors).toEqual([]);
    expect(character.parseWarnings).toEqual([]);
  });

  test('Luck of Heroes grants +1 Luck bonus to AC (including Touch and Flat-Footed) and all Saves', () => {
    const character = new Character(buildPhase2TestSheet());
    character.ParseCharacter();

    // Base 10 + 1 Dex + 1 Luck = 12 AC, 12 Touch AC, 11 Flat-Footed AC
    expect(character.ac.currentArmorClass).toBe(12);
    expect(character.ac.touchArmorClass).toBe(12);
    expect(character.ac.flatFootedArmorClass).toBe(11);

    // Fighter 9 base saves: Fort 6 + 3 Con + 1 Luck = 10; Ref 3 + 1 Dex + 1 Luck = 5; Will 3 + 0 Wis + 1 Luck = 4
    expect(character.saves.Fort.bonus).toBe(10);
    expect(character.saves.Ref.bonus).toBe(5);
    expect(character.saves.Will.bonus).toBe(4);
  });

  test('Devoted Bulwark registers action and grants +1 Morale bonus to AC (including Touch and Flat-Footed) when active', () => {
    const character = new Character(buildPhase2TestSheet({
      statuses: ['Devoted Bulwark: 1 rounds/1 rounds']
    }));
    character.ParseCharacter();

    expect(character.actions).toContain('Devoted Bulwark');
    expect(ActionsData['Devoted Bulwark']).toBeDefined();
    expect(ActionsData['Devoted Bulwark'].calculateDuration(character)).toBe(1);

    // Base 10 + 1 Dex + 1 Luck + 1 Morale = 13 AC, 13 Touch AC, 12 Flat-Footed AC
    expect(character.ac.currentArmorClass).toBe(13);
    expect(character.ac.touchArmorClass).toBe(13);
    expect(character.ac.flatFootedArmorClass).toBe(12);
  });

  test('Stance feats register Iron Guard\'s Glare Stance, Roots of the Mountain Stance, and Bolstering Voice Stance actions', () => {
    const character = new Character(buildPhase2TestSheet());
    character.ParseCharacter();

    expect(character.actions).toContain('Iron Guard\'s Glare Stance');
    expect(character.actions).toContain('Roots of the Mountain Stance');
    expect(character.actions).toContain('Bolstering Voice Stance');

    expect(ActionsData['Iron Guard\'s Glare Stance']).toBeDefined();
    expect(ActionsData['Roots of the Mountain Stance']).toBeDefined();
    expect(ActionsData['Bolstering Voice Stance']).toBeDefined();
  });

  test('Roots of the Mountain Stance grants +10 to Bull rush, Overrun, Trip, and Tumble, and adds DR 2/- to Special', () => {
    const character = new Character(buildPhase2TestSheet({
      statuses: ['Roots of the Mountain Stance: 1 rounds/-1 rounds']
    }));
    character.ParseCharacter();

    // Base Bull rush = 0, Overrun = 0, Trip = +4 Str + 4 Improved Trip = 8 -> +10 = 18
    expect(character.specialAttacks['Bull rush'].currentScore).toBe(10);
    expect(character.specialAttacks['Overrun'].currentScore).toBe(10);
    expect((character.specialAttacks['Trip'] as SpecialAttackBonus).bonus).toBe(18);

    // Tumble: 6 ranks + 1 Dex + 2 Jump synergy + 10 Roots of the Mountain = 19
    const tumble = character.skills.find(s => s.name === 'Tumble')!;
    expect(tumble.bonus).toBe(19);

    expect(
      character.Special.list.some(
        e => e.status === 'Roots of the Mountain Stance' && e.description.includes('DR 2/-')
      )
    ).toBe(true);
  });

  test('Bolstering Voice Stance grants +2 Morale bonus to Will saves', () => {
    const character = new Character(buildPhase2TestSheet({
      statuses: ['Bolstering Voice Stance: 1 rounds/-1 rounds']
    }));
    character.ParseCharacter();

    // Base Will 4 (3 Fighter + 0 Wis + 1 Luck) + 2 Morale = 6
    expect(character.saves.Will.bonus).toBe(6);
  });

  test('Shaky applies -2 to ranged attacks and No Time For Book Learning adds Illiterate special entry', () => {
    const character = new Character(buildPhase2TestSheet());
    character.ParseCharacter();

    const shortbow = character.weapons.find(w => w.baseName === 'Shortbow')!;
    // BAB +9 + 1 Dex - 2 Shaky = +8
    expect(shortbow.attackBonus.bonus).toBe(8);

    expect(
      character.Special.list.some(
        e => e.status === 'No Time For Book Learning' && e.description.toLowerCase().includes('illiterate')
      )
    ).toBe(true);
  });
});
