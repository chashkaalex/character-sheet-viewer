import * as fs from 'fs';
import * as path from 'path';
import { CharacterError } from '../../server/character/character';
import {
  GetCharacterRepByDocId,
  OnCastSpell,
  OnLongRest,
  OnRoundsElapsed,
  OnUseAction
} from '../../server/character/character_manipulation';

const THROR_ORIG_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
const THROR_TEMP_FILE = path.join(__dirname, 'test_character_sheets', 'thror_resource_pools_temp.txt');
const BESS_ORIG_FILE = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');
const BESS_TEMP_FILE = path.join(__dirname, 'test_character_sheets', 'bess_resource_pools_temp.txt');

describe('Phase 3, Step 3.1: Unified Daily Resource Pools & Long Rest', () => {
  beforeEach(() => {
    fs.copyFileSync(THROR_ORIG_FILE, THROR_TEMP_FILE);
    fs.copyFileSync(BESS_ORIG_FILE, BESS_TEMP_FILE);
  });

  afterEach(() => {
    if (fs.existsSync(THROR_TEMP_FILE)) fs.unlinkSync(THROR_TEMP_FILE);
    if (fs.existsSync(BESS_TEMP_FILE)) fs.unlinkSync(BESS_TEMP_FILE);
  });

  test('1. Turn Undead calculates max daily uses (3 + Cha mod + 4 Extra Turning), persists remaining uses across rounds, and blocks when exhausted', () => {
    // Thror has Cha 10 (0 modifier) -> base Turn Undead max uses = 3 + 0 = 3/day
    const rep0 = GetCharacterRepByDocId(THROR_TEMP_FILE) as any;
    expect(rep0.actionsMetadata['Turn Undead'].maxUses).toBe(3);
    expect(rep0.actionsMetadata['Turn Undead'].usesRemaining).toBe(3);

    // 1st use of Turn Undead
    const rep1 = OnUseAction(THROR_TEMP_FILE, 'Turn Undead') as any;
    expect(rep1 instanceof CharacterError).toBe(false);
    expect(rep1.actionsMetadata['Turn Undead'].usesRemaining).toBe(2);
    expect(rep1.statuses.some((s: any) => s.name === 'Turn Undead (Used 1/3)')).toBe(true);

    // Advance 2 rounds so the 1-round 'Turn Undead' status expires, while daily counter persists
    const afterRound1 = OnRoundsElapsed(THROR_TEMP_FILE, 2) as any;
    expect(afterRound1.statuses.some((s: any) => s.name === 'Turn Undead')).toBe(false);
    expect(afterRound1.actionsMetadata['Turn Undead'].usesRemaining).toBe(2);

    // 2nd and 3rd uses of Turn Undead
    const rep2 = OnUseAction(THROR_TEMP_FILE, 'Turn Undead') as any;
    expect(rep2 instanceof CharacterError).toBe(false);
    expect(rep2.actionsMetadata['Turn Undead'].usesRemaining).toBe(1);
    OnRoundsElapsed(THROR_TEMP_FILE, 2);

    const rep3 = OnUseAction(THROR_TEMP_FILE, 'Turn Undead') as any;
    expect(rep3 instanceof CharacterError).toBe(false);
    expect(rep3.actionsMetadata['Turn Undead'].usesRemaining).toBe(0);
    expect(rep3.statuses.some((s: any) => s.name === 'Turn Undead (Used 3/3)')).toBe(true);

    // Advance 2 rounds so 1-round 'Turn Undead' expires again
    OnRoundsElapsed(THROR_TEMP_FILE, 2);

    // 4th attempt should fail because daily pool is 0/3
    const rep4 = OnUseAction(THROR_TEMP_FILE, 'Turn Undead');
    expect(rep4 instanceof CharacterError).toBe(true);
    if (rep4 instanceof CharacterError) {
      expect(rep4.errorMessage).toContain('No daily uses remaining');
    }

    // Adding Extra Turning feat increases maxUses by +4 (from 3 to 7)
    const content = fs.readFileSync(THROR_TEMP_FILE, 'utf-8');
    fs.writeFileSync(THROR_TEMP_FILE, content.replace('Feats:', 'Feats:\nExtra Turning,'), 'utf-8');
    const repWithExtraTurning = GetCharacterRepByDocId(THROR_TEMP_FILE) as any;
    expect(repWithExtraTurning.actionsMetadata['Turn Undead'].maxUses).toBe(7);
    expect(repWithExtraTurning.actionsMetadata['Turn Undead'].usesRemaining).toBe(4); // 7 max - 3 used
  });

  test('2. Stunning Fist calculates max daily uses (Monk + Sacred Fist + floor(other/4) + 1 Monks Chain Belt) and tracks remaining uses', () => {
    // Thror: Monk 6 + Sacred Fist 3 + floor(3 Cleric / 4) + 1 (Monks Chain Belt) = 10 uses/day
    const rep0 = GetCharacterRepByDocId(THROR_TEMP_FILE) as any;
    expect(rep0.actionsMetadata['Stunning Fist'].maxUses).toBe(10);
    expect(rep0.actionsMetadata['Stunning Fist'].usesRemaining).toBe(10);

    const rep1 = OnUseAction(THROR_TEMP_FILE, 'Stunning Fist') as any;
    expect(rep1 instanceof CharacterError).toBe(false);
    expect(rep1.actionsMetadata['Stunning Fist'].usesRemaining).toBe(9);
    expect(rep1.statuses.some((s: any) => s.name === 'Stunning Fist (Used 1/10)')).toBe(true);
  });

  test('3. OnLongRest replenishes all prepared spells, spontaneous slots, Bardic Music songs, and daily ability/item uses', () => {
    // 1. Spend a prepared Cleric spell, Turn Undead, Feat of Strength, and Use Thror's Holy Symbol on Thror
    OnCastSpell(THROR_TEMP_FILE, {
      casterClassName: 'Cleric',
      spellLevel: '1 - domain',
      slotIndex: 0,
      spellName: 'Enlarge Person',
      isUsed: false,
      isEmpty: false,
      targets: ['Self']
    });
    OnUseAction(THROR_TEMP_FILE, 'Turn Undead');
    OnUseAction(THROR_TEMP_FILE, 'Feat of Strength');
    OnUseAction(THROR_TEMP_FILE, 'Use Thror\'s Holy Symbol');

    const beforeRestThror = GetCharacterRepByDocId(THROR_TEMP_FILE) as any;
    expect(beforeRestThror.actionsMetadata['Turn Undead'].usesRemaining).toBe(2);
    expect(beforeRestThror.actionsMetadata['Feat of Strength'].usesRemaining).toBe(0);
    expect(beforeRestThror.actionsMetadata['Use Thror\'s Holy Symbol'].usesRemaining).toBe(0);
    expect(beforeRestThror.statuses.some((s: any) => s.name === 'Enlarge Person')).toBe(true);
    expect(beforeRestThror.statuses.some((s: any) => s.name === 'Use Thror\'s Holy Symbol')).toBe(true);

    // Call OnLongRest on Thror (wraps 8 hours = 4800 rounds elapsed, expiring timed statuses and clearing daily counters)
    const afterRestThror = OnLongRest(THROR_TEMP_FILE) as any;
    expect(afterRestThror instanceof CharacterError).toBe(false);
    expect(afterRestThror.actionsMetadata['Turn Undead'].usesRemaining).toBe(3);
    expect(afterRestThror.actionsMetadata['Feat of Strength'].usesRemaining).toBe(1);
    expect(afterRestThror.actionsMetadata['Use Thror\'s Holy Symbol'].usesRemaining).toBe(1);
    expect(afterRestThror.statuses.some((s: any) => s.name === 'Enlarge Person')).toBe(false);
    expect(afterRestThror.statuses.some((s: any) => s.name === 'Use Thror\'s Holy Symbol')).toBe(false);
    expect(afterRestThror.statuses.some((s: any) => s.name === 'Turn Undead')).toBe(false);
    expect(afterRestThror.statuses.some((s: any) => s.name === 'Feat of Strength')).toBe(false);
    const clericAfterRest = afterRestThror.spellCasting.classSpellCastingData.find((c: any) => c.className === 'Cleric');
    expect(clericAfterRest.preparedSpells['1 - domain'][0].used).toBe(false);

    // 2. Spend a spontaneous Bard spell and a Bardic Music song on Bess, then call OnLongRest
    OnCastSpell(BESS_TEMP_FILE, {
      casterClassName: 'Bard',
      spellLevel: '3',
      slotIndex: 0,
      spellName: 'Haste',
      isUsed: false,
      isEmpty: false,
      targets: ['Self']
    });
    OnUseAction(BESS_TEMP_FILE, 'Inspire Courage', ['Self']);

    const beforeRestBess = GetCharacterRepByDocId(BESS_TEMP_FILE) as any;
    const bardBefore = beforeRestBess.spellCasting.classSpellCastingData.find((c: any) => c.className === 'Bard');
    expect(bardBefore.preparedSpells['3'].some((s: any) => s.used)).toBe(true);
    expect(beforeRestBess.actionCategoryResources.songs.remaining).toBeLessThan(beforeRestBess.actionCategoryResources.songs.max);

    const afterRestBess = OnLongRest(BESS_TEMP_FILE) as any;
    expect(afterRestBess instanceof CharacterError).toBe(false);
    const bardAfter = afterRestBess.spellCasting.classSpellCastingData.find((c: any) => c.className === 'Bard');
    expect(bardAfter.preparedSpells['3'].every((s: any) => !s.used)).toBe(true);
    expect(afterRestBess.actionCategoryResources.songs.remaining).toBe(afterRestBess.actionCategoryResources.songs.max);
  });

  test('4. main.html places Long Rest button inside time-progression-controls and Party button in a separate element', () => {
    const mainHtmlPath = path.join(__dirname, '../../client/html/main.html');
    const html = fs.readFileSync(mainHtmlPath, 'utf-8');

    const timeControlsMatch = html.match(/<div class="time-progression-controls">([\s\S]*?)<\/div>/);
    expect(timeControlsMatch).not.toBeNull();
    const timeControlsContent = timeControlsMatch![1];

    // Long Rest button is inside time-progression-controls
    expect(timeControlsContent).toContain('onLongRest()');
    // Party button is moved out of time-progression-controls into its own container
    expect(timeControlsContent).not.toContain('id="partyButton"');
    expect(html).toContain('id="partyButton"');
  });
});
