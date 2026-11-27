import * as fs from 'fs';
import * as path from 'path';
import { Character } from '../../server/character/character';
import {
  AddStatusToCharacter,
  GetCharacterByDocId,
  GetCharacterRepByDocId,
  OnCastSpell,
  OnRoundsElapsed,
  UpdateHp
} from '../../server/character/character_manipulation';

const TEMP_HEALTH_FILE = path.join(__dirname, 'test_character_sheets', 'health_dr_neg_levels_temp.txt');

function buildHealthTestSheet(options: {
  hpCurrent?: number;
  hpMax?: number;
  resistanceLine?: string;
  statuses?: string[];
  feats?: string[];
} = {}): string[] {
  const hpCurrent = options.hpCurrent ?? 40;
  const hpMax = options.hpMax ?? 40;
  const resistanceLine = options.resistanceLine ?? 'Resistance: 10 fire, DR 5/-, SR 15';
  const statuses = options.statuses ?? [];
  const feats = options.feats ?? [];

  return [
    'HealthTester',
    '(Human Cleric 4)',
    'Init: +2; Senses: Listen +2, Spot +2;',
    `BAb: +3; Grapple: +5; Hp: ${hpCurrent}/${hpMax}; Speed: 30 ft.`,
    'Attack: +5 Longsword.',
    'AC: 12, Touch 12, Flat-footed 10.',
    resistanceLine,
    'Saves: Fort +6; Ref +3; Will +6.',
    'Str: 14 (+2)',
    'Dex: 14 (+2)',
    'Con: 14 (+2)',
    'Int: 12 (+1)',
    'Wis: 16 (+3)',
    'Cha: 12 (+1)',
    'Statuses:',
    ...statuses,
    'Feats:',
    ...feats,
    'Special Abilities:',
    'Domains (Protection, Strength),',
    'Racial Traits:',
    'Bonus Abilities:',
    'Flaws, Traits, Quirks:',
    'Prepared Spells:',
    'Cleric',
    'level 0',
    'Detect Magic',
    'level 1',
    'Bless',
    'Skills:',
    'Concentration (Con): 4',
    'Climb (Str): 4',
    'Hide (Dex): 4',
    'Diplomacy (Cha): 4',
    'Battle Gear:',
    'Longsword',
    'Possessions:',
    'Personal Information'
  ];
}

describe('Phase 4, Step 4.3: Status-Driven Temp HP & Nonlethal Damage, DR/SR, Negative HP (-1 to -10), Ability Damage & Negative Levels', () => {
  beforeEach(() => {
    fs.writeFileSync(TEMP_HEALTH_FILE, buildHealthTestSheet().join('\n'), 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_HEALTH_FILE)) {
      fs.unlinkSync(TEMP_HEALTH_FILE);
    }
  });

  test('1. Status-driven Temp HP absorbs damage first, updates/removes the Temp HP status without writing Temp HP into the GDoc Hp line, and Negative HP transitions through Disabled (0), Dying (-1..-9) / Diehard, and Dead (-10)', () => {
    // Start character at 5/40 HP with no DR so raw damage is tested cleanly
    fs.writeFileSync(
      TEMP_HEALTH_FILE,
      buildHealthTestSheet({ hpCurrent: 5, hpMax: 40, resistanceLine: 'Resistance: 10 fire' }).join('\n'),
      'utf-8'
    );

    // Grant 10 Temp HP via status (e.g. "Temp HP 10" for 10 rounds)
    AddStatusToCharacter(TEMP_HEALTH_FILE, 'Temp HP 10', 10);
    const charWithTemp = GetCharacterByDocId(TEMP_HEALTH_FILE) as Character;
    expect(charWithTemp.temporaryHp).toBe(10);
    expect(charWithTemp.hp.current).toBe(5);

    // 1a. Inflict 6 physical damage -> Temp HP absorbs all 6, leaving "Temp HP 4" status and 5/40 HP
    const repAfter6 = UpdateHp(TEMP_HEALTH_FILE, 6, 'inflict') as any;
    expect(repAfter6.hp.current).toBe(5);
    expect(repAfter6.temporaryHp).toBe(4);
    expect(repAfter6.statuses.some((s: any) => s.name === 'Temp HP 4')).toBe(true);
    expect(repAfter6.statuses.some((s: any) => s.name === 'Temp HP 10')).toBe(false);

    // Verify the GDoc Hp line still strictly stores "Hp: 5/40" without temp/nonlethal text
    const rawDocAfter6 = fs.readFileSync(TEMP_HEALTH_FILE, 'utf-8');
    expect(rawDocAfter6).toContain('Hp: 5/40;');

    // 1b. Inflict 9 physical damage -> remaining 4 Temp HP is consumed (status removed), 5 damage drops HP from 5 to 0 -> Disabled
    const repAtZero = UpdateHp(TEMP_HEALTH_FILE, 9, 'inflict') as any;
    expect(repAtZero.temporaryHp).toBe(0);
    expect(repAtZero.hp.current).toBe(0);
    expect(repAtZero.statuses.some((s: any) => s.name.startsWith('Temp HP'))).toBe(false);
    expect(repAtZero.statuses.some((s: any) => s.name === 'Disabled')).toBe(true);
    expect(repAtZero.statuses.some((s: any) => s.name === 'Dying')).toBe(false);

    // 1c. Inflict 3 more damage -> HP becomes -3/40 -> Disabled replaced by Dying
    const repAtMinus3 = UpdateHp(TEMP_HEALTH_FILE, 3, 'inflict') as any;
    expect(repAtMinus3.hp.current).toBe(-3);
    expect(repAtMinus3.statuses.some((s: any) => s.name === 'Dying')).toBe(true);
    expect(repAtMinus3.statuses.some((s: any) => s.name === 'Disabled')).toBe(false);
    expect(fs.readFileSync(TEMP_HEALTH_FILE, 'utf-8')).toContain('Hp: -3/40;');

    // 1d. Cure 5 HP -> HP becomes 2/40 -> Dying and Disabled are automatically removed
    const repHealed = UpdateHp(TEMP_HEALTH_FILE, 5, 'cure') as any;
    expect(repHealed.hp.current).toBe(2);
    expect(repHealed.statuses.some((s: any) => s.name === 'Dying')).toBe(false);
    expect(repHealed.statuses.some((s: any) => s.name === 'Disabled')).toBe(false);

    // 1e. Inflict 15 damage -> HP becomes -10/40 (capped at -10) -> Dead
    const repDead = UpdateHp(TEMP_HEALTH_FILE, 15, 'inflict') as any;
    expect(repDead.hp.current).toBe(-10);
    expect(repDead.statuses.some((s: any) => s.name === 'Dead')).toBe(true);
    expect(repDead.statuses.some((s: any) => s.name === 'Dying')).toBe(false);

    // 1f. Diehard feat: when reduced to -1..-9 HP, character gets Disabled instead of Dying
    fs.writeFileSync(
      TEMP_HEALTH_FILE,
      buildHealthTestSheet({
        hpCurrent: 4,
        hpMax: 40,
        resistanceLine: 'Resistance: 10 fire',
        feats: ['Endurance,', 'Diehard']
      }).join('\n'),
      'utf-8'
    );
    const repDiehard = UpdateHp(TEMP_HEALTH_FILE, 8, 'inflict') as any;
    expect(repDiehard.hp.current).toBe(-4);
    expect(repDiehard.statuses.some((s: any) => s.name === 'Disabled')).toBe(true);
    expect(repDiehard.statuses.some((s: any) => s.name === 'Dying')).toBe(false);
  });

  test('2. Status-driven Nonlethal Damage tracks via status, triggers Staggered when Nonlethal == current HP and Unconscious when Nonlethal > current HP, and Cure reduces Nonlethal simultaneously', () => {
    fs.writeFileSync(
      TEMP_HEALTH_FILE,
      buildHealthTestSheet({ hpCurrent: 20, hpMax: 40, resistanceLine: 'Resistance: 10 fire' }).join('\n'),
      'utf-8'
    );

    // Inflict 20 nonlethal damage via UpdateHp(..., 0, 'inflict', { nonlethal: 20 })
    const repStaggered = UpdateHp(TEMP_HEALTH_FILE, 0, 'inflict', { nonlethal: 20 }) as any;
    expect(repStaggered.hp.current).toBe(20);
    expect(repStaggered.nonlethalDamage).toBe(20);
    expect(repStaggered.statuses.some((s: any) => s.name === 'Nonlethal 20')).toBe(true);
    expect(repStaggered.statuses.some((s: any) => s.name === 'Staggered')).toBe(true);

    // Inflict 5 more nonlethal damage -> Nonlethal 25 > 20 current HP -> Unconscious (replaces Staggered)
    const repUnconscious = UpdateHp(TEMP_HEALTH_FILE, 0, 'inflict', { nonlethal: 5 }) as any;
    expect(repUnconscious.nonlethalDamage).toBe(25);
    expect(repUnconscious.statuses.some((s: any) => s.name === 'Nonlethal 25')).toBe(true);
    expect(repUnconscious.statuses.some((s: any) => s.name === 'Unconscious')).toBe(true);
    expect(repUnconscious.statuses.some((s: any) => s.name === 'Staggered')).toBe(false);

    // Cure 10 HP (D&D 3.5 PHB p. 146: magical healing cures an equal amount of nonlethal damage!)
    // Lethal HP: 20 + 10 = 30; Nonlethal: 25 - 10 = 15 (< 30, so Staggered and Unconscious are removed)
    const repCured = UpdateHp(TEMP_HEALTH_FILE, 10, 'cure') as any;
    expect(repCured.hp.current).toBe(30);
    expect(repCured.nonlethalDamage).toBe(15);
    expect(repCured.statuses.some((s: any) => s.name === 'Nonlethal 15')).toBe(true);
    expect(repCured.statuses.some((s: any) => s.name === 'Unconscious')).toBe(false);
    expect(repCured.statuses.some((s: any) => s.name === 'Staggered')).toBe(false);
  });

  test('3. Damage Reduction (DR) and Spell Resistance (SR) are parsed as structured properties and DR automatically reduces incoming physical damage', () => {
    // Resistance line has "Resistance: 10 fire, DR 5/-, SR 15"
    const char = GetCharacterByDocId(TEMP_HEALTH_FILE) as Character;
    expect(char.dr.currentScore).toBe(5);
    expect(char.sr.currentScore).toBe(15);

    const rep0 = GetCharacterRepByDocId(TEMP_HEALTH_FILE) as any;
    expect(rep0.dr.currentScore).toBe(5);
    expect(rep0.sr.currentScore).toBe(15);

    // Inflict 12 physical damage + 14 fire damage -> DR 5 reduces physical to 7, Fire Res 10 reduces fire to 4 -> total 11 damage (40 -> 29)
    const rep1 = UpdateHp(TEMP_HEALTH_FILE, 12, 'inflict', { fire: 14 }) as any;
    expect(rep1.hp.current).toBe(29);

    // Roots of the Mountain Stance grants DR 2/- (stacks or applies to dr property)
    const stanceChar = new Character(buildHealthTestSheet({
      resistanceLine: 'Resistance: 10 fire',
      statuses: ['Roots of the Mountain Stance: 1 rounds/-1 rounds']
    }));
    stanceChar.ParseCharacter();
    expect(stanceChar.dr.currentScore).toBe(2);
  });

  test('4. Negative Level N applies -N to attack rolls, saving throws, skill checks, special attacks (Grapple), caster level, and -5*N to max HP', () => {
    const char = new Character(buildHealthTestSheet({
      hpCurrent: 40,
      hpMax: 40,
      statuses: ['Negative Level 2: 1 rounds/10 rounds']
    }));
    char.ParseCharacter();

    // Base Longsword attack +5 -> +3; Saves Fort (4 base + 2 Con - 2 NegLvl = 4), Ref (1 base + 2 Dex - 2 NegLvl = 1), Will (4 base + 3 Wis - 2 NegLvl = 5)
    expect(char.weapons.find(w => w.name === 'Longsword')!.attackBonus.bonus).toBe(3);
    expect(char.saves.Fort.bonus).toBe(4);
    expect(char.saves.Ref.bonus).toBe(1);
    expect(char.saves.Will.bonus).toBe(5);
    // Skills: Concentration (4 ranks + 2 Con - 2 NegLvl = 4), Climb (4 ranks + 2 Str - 2 NegLvl = 4)
    expect(char.skills.find(s => s.name === 'Concentration')!.bonus).toBe(4);
    expect(char.skills.find(s => s.name === 'Climb')!.bonus).toBe(4);
    // Grapple: 3 BAB + 2 Str - 2 NegLvl = 3
    expect((char.specialAttacks['Grapple'] as any).bonus).toBe(3);
    // Caster level: Cleric 4 - 2 = 2
    expect(char.spellCasting.GetCasterLevel('Cleric').currentScore).toBe(2);
    // Max HP: 40 - (5 * 2) = 30, and current HP clamped to new max (30)
    expect(char.hp.max).toBe(30);
    expect(char.hp.current).toBe(30);
  });

  test('5. Ability Damage statuses (<Ability> Damage N and Ability Damage (<Ability>) N) reduce effective ability score and Con damage dynamically reduces Max HP by Con modifier delta * HD', () => {
    // Character is Cleric 4 (HD = 4) with Str 14 (+2) and Con 14 (+2) and 40/40 HP
    // Apply Str Damage 4 (Str 14 -> 10, mod +2 -> 0) and Ability Damage (Con) 4 (Con 14 -> 10, mod +2 -> 0, delta = -2 * 4 HD = -8 HP)
    const char = new Character(buildHealthTestSheet({
      hpCurrent: 40,
      hpMax: 40,
      statuses: [
        'Str Damage 4: 1 rounds/-1 rounds',
        'Ability Damage (Con) 4: 1 rounds/-1 rounds'
      ]
    }));
    char.ParseCharacter();

    expect(char.abilities.Str.currentScore).toBe(10);
    expect(char.abilities.Str.modifier).toBe(0);
    expect(char.abilities.Con.currentScore).toBe(10);
    expect(char.abilities.Con.modifier).toBe(0);
    // Max HP drops by 2 * 4 HD = 8 (40 -> 32)
    expect(char.hp.max).toBe(32);
    expect(char.hp.current).toBe(32);
  });

  test('6. Virtue spell (Cleric 0, Touch, 1 min = 10 rounds) grants 1 temporary hit point via status, absorbs incoming damage, and expires after 10 rounds', () => {
    // Prepare Virtue in Cleric level 0 slot
    const lines = buildHealthTestSheet({
      hpCurrent: 25,
      hpMax: 40,
      resistanceLine: 'Resistance: 10 fire'
    }).map(l => (l === 'Detect Magic' ? 'Virtue' : l));
    fs.writeFileSync(TEMP_HEALTH_FILE, lines.join('\n'), 'utf-8');

    const repBefore = GetCharacterRepByDocId(TEMP_HEALTH_FILE) as any;
    expect(repBefore.temporaryHp).toBe(0);
    expect(repBefore.spellCasting.classSpellCastingData[0].preparedSpells['0'][0].isValid).toBe(true);

    // Cast Virtue on Self -> adds "Virtue" status for 10 rounds (1 minute) and sets temporaryHp = 1
    const repAfterCast = OnCastSpell(TEMP_HEALTH_FILE, {
      casterClassName: 'Cleric',
      spellLevel: '0',
      slotIndex: 0,
      spellName: 'Virtue',
      isUsed: false,
      isEmpty: false,
      targets: ['Self']
    }) as any;

    expect(repAfterCast.temporaryHp).toBe(1);
    const virtueStatus = repAfterCast.statuses.find((s: any) => s.name === 'Virtue');
    expect(virtueStatus).toBeDefined();
    expect(virtueStatus.duration).toBe(10);

    // Inflict 1 physical damage -> absorbed by Virtue's 1 Temp HP, removing Virtue status and leaving HP at 25/40
    const repAfterHit = UpdateHp(TEMP_HEALTH_FILE, 1, 'inflict') as any;
    expect(repAfterHit.hp.current).toBe(25);
    expect(repAfterHit.temporaryHp).toBe(0);
    expect(repAfterHit.statuses.some((s: any) => s.name === 'Virtue')).toBe(false);
  });

  test('7. Hourly Nonlethal Damage Recovery (PHB p. 146): heals 1 nonlethal damage per hour per character level (HD) when time elapses', () => {
    // HealthTester is Cleric 4 (HD = 4) at 20/40 HP
    fs.writeFileSync(
      TEMP_HEALTH_FILE,
      buildHealthTestSheet({ hpCurrent: 20, hpMax: 40, resistanceLine: 'Resistance: 10 fire' }).join('\n'),
      'utf-8'
    );

    // Inflict 22 nonlethal damage -> Unconscious (22 > 20 HP)
    const rep0 = UpdateHp(TEMP_HEALTH_FILE, 0, 'inflict', { nonlethal: 22 }) as any;
    expect(rep0.nonlethalDamage).toBe(22);
    expect(rep0.statuses.some((s: any) => s.name === 'Unconscious')).toBe(true);

    // Advance 300 rounds (30 minutes) -> Nonlethal elapsed becomes 301 (< 600 rounds / 1 hour), so no hourly healing yet
    const repHalfHour = OnRoundsElapsed(TEMP_HEALTH_FILE, 300) as any;
    expect(repHalfHour.nonlethalDamage).toBe(22);

    // Advance another 300 rounds (total 600 rounds = 1 full hour elapsed) -> heals 1 * 4 HD = 4 nonlethal (22 -> 18)
    // Since 18 < 20 current HP, Unconscious is automatically cleared!
    const repOneHour = OnRoundsElapsed(TEMP_HEALTH_FILE, 300) as any;
    expect(repOneHour.nonlethalDamage).toBe(18);
    expect(repOneHour.statuses.some((s: any) => s.name === 'Nonlethal 18')).toBe(true);
    expect(repOneHour.statuses.some((s: any) => s.name === 'Unconscious')).toBe(false);

    // Advance 5 hours (3000 rounds) -> heals 5 * 4 HD = 20 nonlethal (18 -> 0), removing Nonlethal status completely
    const repSixHours = OnRoundsElapsed(TEMP_HEALTH_FILE, 3000) as any;
    expect(repSixHours.nonlethalDamage).toBe(0);
    expect(repSixHours.statuses.some((s: any) => s.name.startsWith('Nonlethal'))).toBe(false);
  });
});
