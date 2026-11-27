import * as fs from 'fs';
import * as path from 'path';
import { Character, CharacterError } from '../../server/character/character';
import {
  GetCharacterByDocId,
  GetCharacterRepByDocId,
  OnCastSpell
} from '../../server/character/character_manipulation';
import {
  resolveSpellDuration,
  SpellsData
} from '../../server/character/spells';
import {
  extractSpecialAbilityBaseName,
  isClassDerivedSpecialAbility,
  SpecialAbilitiesEffects
} from '../../server/character/properties/special_abilities/special_abilities_effects';
import { renderSpellSlots } from '../../client/ts/spells/spell_slots';

const TEMP_SPELL_DC_FILE = path.join(__dirname, 'test_character_sheets', 'spell_save_dc_temp.txt');
const MORTY_ORIG_FILE = path.join(__dirname, 'test_character_sheets', 'morty_test.txt');
const MORTY_TEMP_FILE = path.join(__dirname, 'test_character_sheets', 'morty_illusion_cl_temp.txt');

function buildSpellDcTestSheet(options: {
  wisScore?: number;
  feats?: string[];
  preparedLevel1?: string[];
  preparedLevel2?: string[];
} = {}): string[] {
  const wisScore = options.wisScore ?? 18;
  const feats = options.feats ?? [
    'Spell Focus (Enchantment),',
    'Greater Spell Focus (Enchantment),'
  ];
  const preparedLevel1 = options.preparedLevel1 ?? ['Doom', 'Command', 'Sanctuary'];
  const preparedLevel2 = options.preparedLevel2 ?? ['Hold Person', 'Zone of Truth', 'Bull\'s Strength'];

  return [
    'SpellDcTester',
    '(Human Cleric 5)',
    'Init: +1; Senses: Listen +4, Spot +4;',
    'BAb: +3; Grapple: +4; Hp: 40/40; Speed: 30 ft.',
    'Attack: +4 Longsword.',
    'AC: 11, Touch 11, Flat-footed 10.',
    'Saves: Fort +6; Ref +2; Will +8.',
    'Str: 12 (+1)',
    'Dex: 12 (+1)',
    'Con: 14 (+2)',
    'Int: 12 (+1)',
    `Wis: ${wisScore} (+4)`,
    'Cha: 12 (+1)',
    'Statuses:',
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
    'Light',
    'Virtue',
    'Guidance',
    'Resistance',
    'level 1',
    ...preparedLevel1,
    'level 1 - domain',
    'Sanctuary',
    'level 2',
    ...preparedLevel2,
    'level 2 - domain',
    'Bull\'s Strength',
    'Skills:',
    'Concentration (Con): 5',
    'Spellcraft (Int): 5',
    'Battle Gear:',
    'Longsword',
    'Possessions:',
    'Personal Information'
  ];
}

describe('Phase 5, Step 5.1: Declarative SRD Spell Metadata, Auto-Calculated Save DCs & Graceful Unknown-Spell Fallback', () => {
  beforeEach(() => {
    fs.writeFileSync(TEMP_SPELL_DC_FILE, buildSpellDcTestSheet().join('\n'), 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_SPELL_DC_FILE)) {
      fs.unlinkSync(TEMP_SPELL_DC_FILE);
    }
    if (fs.existsSync(MORTY_TEMP_FILE)) {
      fs.unlinkSync(MORTY_TEMP_FILE);
    }
  });

  test('1. Save DC Calculation with Spell Focus & Greater Spell Focus and zero property-not-found warnings', () => {
    const rep = GetCharacterRepByDocId(TEMP_SPELL_DC_FILE) as any;
    expect(rep instanceof CharacterError).toBe(false);
    expect(rep.parseWarnings).toEqual([]);

    const clericData = rep.spellCasting.classSpellCastingData.find((c: any) => c.className === 'Cleric');
    expect(clericData).toBeDefined();

    // Level 2 Hold Person (Enchantment, Will negates):
    // 10 base + 2 spell level + 4 Wis + 1 Spell Focus (Enchantment) + 1 Greater Spell Focus (Enchantment) = 18
    const holdPersonSlot = clericData.preparedSpells['2'].find((s: any) => s.spell === 'Hold Person');
    expect(holdPersonSlot).toBeDefined();
    expect(holdPersonSlot.school).toBe('Enchantment');
    expect(holdPersonSlot.savingThrow).toBe('Will negates');
    expect(holdPersonSlot.saveDc).toBe(18);
    expect(holdPersonSlot.saveDcString).toContain('18');
    expect(holdPersonSlot.saveDcString).toContain('Spell Focus (Enchantment)');
    expect(holdPersonSlot.saveDcString).toContain('Greater Spell Focus (Enchantment)');

    // Level 1 Command (Enchantment, Will negates): 10 + 1 + 4 Wis + 2 Focus = 17
    const commandSlot = clericData.preparedSpells['1'].find((s: any) => s.spell === 'Command');
    expect(commandSlot.saveDc).toBe(17);

    // Level 1 Doom (Necromancy, Will negates): 10 + 1 + 4 Wis + 0 (no Necromancy focus) = 15
    const doomSlot = clericData.preparedSpells['1'].find((s: any) => s.spell === 'Doom');
    expect(doomSlot.school).toBe('Necromancy');
    expect(doomSlot.savingThrow).toBe('Will negates');
    expect(doomSlot.saveDc).toBe(15);

    // Level 2 Bull's Strength (harmless buff): no offensive Save DC badge
    const bullsStrengthSlot = clericData.preparedSpells['2'].find((s: any) => s.spell === 'Bull\'s Strength');
    expect(bullsStrengthSlot.saveDc).toBeNull();

    // Known spells also expose saveDc and saveDcString
    const knownHoldPerson = clericData.knownSpells['2'].find((s: any) => s.spellName === 'Hold Person');
    expect(knownHoldPerson).toBeDefined();
    expect(knownHoldPerson.saveDc).toBe(18);

    // UI renderSpellSlots renders DC badge on Hold Person slot
    const renderedHtml = renderSpellSlots(
      clericData.spellSlots,
      clericData.preparedSpells,
      'Cleric',
      'In Advance',
      clericData.knownSpells,
      'list'
    );
    expect(renderedHtml).toContain('DC 18');
  });

  test('2. Declarative durationFormula resolution supports standard SRD duration formulas alongside custom functions', () => {
    const dummyCaster = { level: { currentScore: 5 } } as any;
    expect(resolveSpellDuration({ durationFormula: '1 round' } as any, dummyCaster)).toBe(1);
    expect(resolveSpellDuration({ durationFormula: '1 round/level' } as any, dummyCaster)).toBe(5);
    expect(resolveSpellDuration({ durationFormula: '1 min' } as any, dummyCaster)).toBe(10);
    expect(resolveSpellDuration({ durationFormula: '1 min/level' } as any, dummyCaster)).toBe(50);
    expect(resolveSpellDuration({ durationFormula: '10 min' } as any, dummyCaster)).toBe(100);
    expect(resolveSpellDuration({ durationFormula: '10 min/level' } as any, dummyCaster)).toBe(500);
    expect(resolveSpellDuration({ durationFormula: '1 hour/level' } as any, dummyCaster)).toBe(3000);
    expect(resolveSpellDuration({ durationFormula: '24 hours' } as any, dummyCaster)).toBe(14400);
    expect(resolveSpellDuration({ durationFormula: 'permanent' } as any, dummyCaster)).toBe(-1);

    // SpellsData entries expose school and savingThrow metadata
    expect(SpellsData['Hold Person'].school).toBe('Enchantment');
    expect(SpellsData['Hold Person'].savingThrow).toBe('Will negates');
    expect(SpellsData['Fireball'].school).toBe('Evocation');
    expect(SpellsData['Fireball'].savingThrow).toBe('Reflex half');
  });

  test('3. Graceful Unknown-Spell Fallback: casting an unmodeled spell from a prepared slot consumes the slot and applies a default status without throwing an error', () => {
    // Write a sheet with an unmodeled spell 'Wall of Gears' in Cleric level 1 slot 0
    fs.writeFileSync(
      TEMP_SPELL_DC_FILE,
      buildSpellDcTestSheet({ preparedLevel1: ['Wall of Gears', 'Command', 'Doom'] }).join('\n'),
      'utf-8'
    );

    const castResult = OnCastSpell(TEMP_SPELL_DC_FILE, {
      casterClassName: 'Cleric',
      spellLevel: '1',
      slotIndex: 0,
      spellName: 'Wall of Gears',
      isUsed: false,
      isEmpty: false,
      targets: ['Self']
    }) as any;

    expect(castResult instanceof CharacterError).toBe(false);
    // Slot 0 is marked used
    const clericData = castResult.spellCasting.classSpellCastingData.find((c: any) => c.className === 'Cleric');
    expect(clericData.preparedSpells['1'][0].used).toBe(true);
    // Default status 'Wall of Gears' is applied to the character
    const wallStatus = castResult.statuses.find((s: any) => s.name === 'Wall of Gears');
    expect(wallStatus).toBeDefined();
    expect(wallStatus.duration).toBeGreaterThan(0);

    // Also verify casting a Cleric class-list spell that wasn't previously in SpellsData (e.g. 'Sanctuary') validates and casts cleanly
    const sanctuarySlot = clericData.preparedSpells['1 - domain'][0];
    expect(sanctuarySlot.isValid).toBe(true);
    const castSanctuary = OnCastSpell(TEMP_SPELL_DC_FILE, {
      casterClassName: 'Cleric',
      spellLevel: '1 - domain',
      slotIndex: 0,
      spellName: 'Sanctuary',
      isUsed: false,
      isEmpty: false,
      targets: ['Self']
    }) as any;
    expect(castSanctuary instanceof CharacterError).toBe(false);
    expect(castSanctuary.statuses.some((s: any) => s.name === 'Sanctuary')).toBe(true);
  });

  test('4. Morty Illusion Spell Power (+1 CL to Illusion, -1 CL to other schools): Illusion spells resolve at CL 11 (10+1) and non-Illusion spells resolve at CL 9 (10-1)', () => {
    fs.copyFileSync(MORTY_ORIG_FILE, MORTY_TEMP_FILE);
    const morty = GetCharacterByDocId(MORTY_TEMP_FILE) as Character;
    expect(morty.spellCasting.GetCasterLevel('Beguiler').currentScore).toBe(10);
    expect(morty.spellCasting.GetEffectiveCasterLevel('Beguiler', 'Illusion', morty)).toBe(11);
    expect(morty.spellCasting.GetEffectiveCasterLevel('Beguiler', 'Transmutation', morty)).toBe(9);
    expect(morty.spellCasting.GetEffectiveCasterLevel('Beguiler', 'Enchantment', morty)).toBe(9);

    const mortyRep = GetCharacterRepByDocId(MORTY_TEMP_FILE) as any;
    const beguilerData = mortyRep.spellCasting.classSpellCastingData.find((c: any) => c.className === 'Beguiler');
    expect(beguilerData).toBeDefined();

    // Check known spells across all levels on Morty: Illusion spells have casterLevel 11, non-Illusion spells have casterLevel 9
    for (const lvl of ['0', '1', '2', '3']) {
      for (const spell of beguilerData.knownSpells[lvl]) {
        if (spell.school === 'Illusion') {
          expect(spell.casterLevel).toBe(11);
        } else {
          expect(spell.casterLevel).toBe(9);
        }
      }
    }

    // Cast Displacement (Level 3 Illusion, 1 round/level) -> duration should be 11 rounds (10 + 1)
    const afterDisplacement = OnCastSpell(MORTY_TEMP_FILE, {
      casterClassName: 'Beguiler',
      spellLevel: '3',
      slotIndex: 0,
      spellName: 'Displacement',
      isUsed: false,
      isEmpty: true,
      targets: ['Self']
    }) as any;
    const dispStatus = afterDisplacement.statuses.find((s: any) => s.name === 'Displacement');
    expect(dispStatus).toBeDefined();
    expect(dispStatus.duration).toBe(11);

    // Cast Haste (Level 3 Transmutation, 1 round/level) -> duration should be 9 rounds (10 - 1)
    const afterHaste = OnCastSpell(MORTY_TEMP_FILE, {
      casterClassName: 'Beguiler',
      spellLevel: '3',
      slotIndex: 0,
      spellName: 'Haste',
      isUsed: false,
      isEmpty: true,
      targets: ['Self']
    }) as any;
    const hasteStatus = afterHaste.statuses.find((s: any) => s.name === 'Haste');
    expect(hasteStatus).toBeDefined();
    expect(hasteStatus.duration).toBe(9);
  });

  test('5. ParseSpecialAbilities & ParseBonusAbilities distinguish class-derived summary lines (e.g. Thror AC Bonus (+3)) from non-class special abilities (e.g. Illusion Spell Power) and apply them outside class files', () => {
    // 1. Illusion Spell Power is registered in SpecialAbilitiesEffects (not hardcoded in unseen_seer.ts)
    expect(SpecialAbilitiesEffects['Illusion Spell Power']).toBeDefined();
    const unseenSeerPath = path.join(__dirname, '../../server/classes_data/unseen_seer.ts');
    const unseenSeerSource = fs.readFileSync(unseenSeerPath, 'utf-8');
    expect(unseenSeerSource).not.toContain('casterLevelSchool');

    // 2. Base-name extraction & class-derived check:
    // On Thror (Monk 6 / Cleric 3 / Sacred Fist 3), "AC Bonus (+3)," -> base name "AC Bonus", recognized as class-derived from Monk/Sacred Fist
    expect(extractSpecialAbilityBaseName('AC Bonus (+3),')).toBe('AC Bonus');
    expect(extractSpecialAbilityBaseName('Steely Resolve 15,')).toBe('Steely Resolve');
    const throrPath = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
    const rawThrorLines = fs.readFileSync(throrPath, 'utf-8').split(/\r?\n/).filter(l => l.trim() !== '');
    const thror = new Character(rawThrorLines, throrPath);
    thror.ParseCharacter();
    expect(isClassDerivedSpecialAbility(thror, 'AC Bonus')).toBe(true);
    expect(isClassDerivedSpecialAbility(thror, 'Fast Movement')).toBe(true);
    expect(isClassDerivedSpecialAbility(thror, 'Turn undead')).toBe(true);
    // "Martial School" is NOT a standard Monk/Cleric/Sacred Fist class ability, so it is parsed via SpecialAbilitiesEffects
    expect(isClassDerivedSpecialAbility(thror, 'Martial School')).toBe(false);
    expect(thror.Special.list.some(p => p.status === 'Martial School')).toBe(true);

    // 3. On a Cleric (who is NOT an Unseen Seer) with "Illusion Spell Power (+1 CL to Illusion, -1 CL to other schools)" in Special Abilities,
    // ParseSpecialAbilities still applies +1 CL to Illusion and -1 CL to other schools!
    const customLines = buildSpellDcTestSheet();
    const specialIdx = customLines.indexOf('Special Abilities:');
    customLines.splice(specialIdx + 1, 0, 'Illusion Spell Power (+1 CL to Illusion, -1 CL to other schools),');
    fs.writeFileSync(TEMP_SPELL_DC_FILE, customLines.join('\n'), 'utf-8');

    const clericWithIllusionPower = GetCharacterByDocId(TEMP_SPELL_DC_FILE) as Character;
    expect(clericWithIllusionPower.HasClass('Unseen Seer')).toBe(false);
    expect(clericWithIllusionPower.spellCasting.GetEffectiveCasterLevel('Cleric', 'Illusion', clericWithIllusionPower)).toBe(6); // 5 + 1
    expect(clericWithIllusionPower.spellCasting.GetEffectiveCasterLevel('Cleric', 'Enchantment', clericWithIllusionPower)).toBe(4); // 5 - 1
  });
});
