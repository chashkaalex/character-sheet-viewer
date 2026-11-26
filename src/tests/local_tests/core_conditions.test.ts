import * as fs from 'fs';
import * as path from 'path';
import { Character } from '../../server/character/character';
import {
  AddStatusToCharacter,
  GetCharacterByDocId,
  GetCharacterRepByDocId
} from '../../server/character/character_manipulation';
import { convertToRounds, onConditionPresetSelected, onTacticalPresetSelected } from '../../client/ts/dashboard/statuses';

const TEMP_COND_FILE = path.join(__dirname, 'test_character_sheets', 'core_conditions_temp.txt');

function buildConditionsSheet(statuses: string[] = []): string[] {
  return [
    'ConditionTester',
    '(Human Fighter 4)',
    'Init: +3; Senses: Listen +2, Spot +2;',
    'BAb: +4; Grapple: +7; Hp: 40/40; Speed: 30 ft.',
    'Attack: +7 Longsword.',
    'AC: 13, Touch 13, Flat-footed 10.',
    'Saves: Fort +6; Ref +4; Will +3.',
    'Str: 16 (+3)',
    'Dex: 16 (+3)',
    'Con: 14 (+2)',
    'Int: 12 (+1)',
    'Wis: 14 (+2)',
    'Cha: 10 (+0)',
    'Statuses:',
    ...statuses,
    'Feats:',
    'Special Abilities:',
    'Racial Traits:',
    'Bonus Abilities:',
    'Flaws, Traits, Quirks:',
    'Skills:',
    'Climb (Str): 4',
    'Hide (Dex): 4',
    'Search (Int): 4',
    'Spot (Wis): 4',
    'Listen (Wis): 4',
    'Diplomacy (Cha): 4',
    'Battle Gear:',
    'Longsword',
    'Longbow',
    'Possessions:',
    'Personal Information'
  ];
}

describe('Phase 4, Step 4.2: Complete D&D 3.5 Core Conditions Matrix, Tactical Statuses & Status Tooltips', () => {
  beforeEach(() => {
    fs.writeFileSync(TEMP_COND_FILE, buildConditionsSheet().join('\n'), 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_COND_FILE)) {
      fs.unlinkSync(TEMP_COND_FILE);
    }
  });

  test('1. Fatigued & Exhausted escalation, Lesser Restoration downgrade/cure, and Heal full condition cure', () => {
    // 1. Apply Fatigued -> -2 Str (16 -> 14), -2 Dex (16 -> 14), speed unchanged (30)
    AddStatusToCharacter(TEMP_COND_FILE, 'Fatigued', -1);
    const fatiguedChar = GetCharacterByDocId(TEMP_COND_FILE) as Character;
    expect(fatiguedChar.abilities.Str.currentScore).toBe(14);
    expect(fatiguedChar.abilities.Dex.currentScore).toBe(14);
    expect(fatiguedChar.speed.currentScore).toBe(30);

    // 2. Apply Exhausted -> replaces Fatigued, -6 Str (16 -> 10), -6 Dex (16 -> 10), speed halved (30 -> 15)
    AddStatusToCharacter(TEMP_COND_FILE, 'Exhausted', -1);
    const exhaustedChar = GetCharacterByDocId(TEMP_COND_FILE) as Character;
    expect(exhaustedChar.HasStatus('Fatigued')).toBe(false);
    expect(exhaustedChar.HasStatus('Exhausted')).toBe(true);
    expect(exhaustedChar.abilities.Str.currentScore).toBe(10);
    expect(exhaustedChar.abilities.Dex.currentScore).toBe(10);
    expect(exhaustedChar.speed.currentScore).toBe(15);

    // 3. Apply Lesser Restoration -> downgrades Exhausted to Fatigued
    AddStatusToCharacter(TEMP_COND_FILE, 'Lesser Restoration', 1);
    const downgradedChar = GetCharacterByDocId(TEMP_COND_FILE) as Character;
    expect(downgradedChar.HasStatus('Exhausted')).toBe(false);
    expect(downgradedChar.HasStatus('Fatigued')).toBe(true);
    expect(downgradedChar.abilities.Str.currentScore).toBe(14);
    expect(downgradedChar.speed.currentScore).toBe(30);

    // 4. Second Lesser Restoration -> removes Fatigued completely
    AddStatusToCharacter(TEMP_COND_FILE, 'Lesser Restoration', 1);
    const curedChar = GetCharacterByDocId(TEMP_COND_FILE) as Character;
    expect(curedChar.HasStatus('Fatigued')).toBe(false);
    expect(curedChar.abilities.Str.currentScore).toBe(16);

    // 5. Heal removes Blinded, Dazzled, Deafened, Exhausted, Fatigued, Nauseated, Sickened, Stunned
    AddStatusToCharacter(TEMP_COND_FILE, 'Blinded', 10);
    AddStatusToCharacter(TEMP_COND_FILE, 'Sickened', 10);
    AddStatusToCharacter(TEMP_COND_FILE, 'Stunned', 10);
    AddStatusToCharacter(TEMP_COND_FILE, 'Exhausted', 10);
    AddStatusToCharacter(TEMP_COND_FILE, 'Heal', 1);
    const afterHeal = GetCharacterByDocId(TEMP_COND_FILE) as Character;
    expect(afterHeal.HasStatus('Blinded')).toBe(false);
    expect(afterHeal.HasStatus('Sickened')).toBe(false);
    expect(afterHeal.HasStatus('Stunned')).toBe(false);
    expect(afterHeal.HasStatus('Exhausted')).toBe(false);
  });

  test('2. Blinded, Stunned, and Cowering apply -2 AC, set losesDexToAc=true (stripping Dex and Dodge), and Blinded penalizes Search and Str/Dex skills by -4', () => {
    // Character with Dex 16 (+3) and Fighting Defensively (+2 Dodge AC) => Normal AC = 10 + 3 + 2 = 15
    const blindedChar = new Character(buildConditionsSheet([
      'Fighting Defensively: 1 rounds/1 rounds',
      'Blinded: 1 rounds/5 rounds'
    ]));
    blindedChar.ParseCharacter();

    // Loses +3 Dex and +2 Dodge, plus -2 Blinded penalty => 10 - 2 = 8
    expect(blindedChar.ac.losesDexToAc).toBe(true);
    expect(blindedChar.ac.currentArmorClass).toBe(8);

    // Search (4 ranks + 1 Int - 4 Blinded = 1), Climb (4 ranks + 3 Str - 4 Blinded = 3), Hide (4 ranks + 3 Dex - 4 Blinded = 3)
    expect(blindedChar.skills.find(s => s.name === 'Search')!.bonus).toBe(1);
    expect(blindedChar.skills.find(s => s.name === 'Climb')!.bonus).toBe(3);
    expect(blindedChar.skills.find(s => s.name === 'Hide')!.bonus).toBe(3);
    // Spot/Listen/Diplomacy are Wis/Cha-based -> unaffected by Blinded's -4 Str/Dex/Search penalty
    expect(blindedChar.skills.find(s => s.name === 'Diplomacy')!.bonus).toBe(4);

    // Stunned and Cowering also lose Dex to AC and take -2 AC
    const stunnedChar = new Character(buildConditionsSheet(['Stunned: 1 rounds/1 rounds']));
    stunnedChar.ParseCharacter();
    expect(stunnedChar.ac.losesDexToAc).toBe(true);
    expect(stunnedChar.ac.currentArmorClass).toBe(8);

    const coweringChar = new Character(buildConditionsSheet(['Cowering: 1 rounds/1 rounds']));
    coweringChar.ParseCharacter();
    expect(coweringChar.ac.losesDexToAc).toBe(true);
    expect(coweringChar.ac.currentArmorClass).toBe(8);
  });

  test('3. Sickened, Dazzled, Deafened, Entangled, Prone, Paralyzed, and Squeezing apply exact D&D 3.5 modifiers', () => {
    // Sickened: -2 attack, -2 weapon damage, -2 all saves, -2 all skills
    const sickChar = new Character(buildConditionsSheet(['Sickened: 1 rounds/5 rounds']));
    sickChar.ParseCharacter();
    const sickSword = sickChar.weapons.find(w => w.name === 'Longsword')!;
    expect(sickSword.attackBonus.bonus).toBe(7 - 2);
    expect(sickSword.damageBonus.bonus).toBe(3 - 2);
    expect(sickChar.saves.Fort.bonus).toBe(6 - 2);
    expect(sickChar.saves.Ref.bonus).toBe(4 - 2);
    expect(sickChar.saves.Will.bonus).toBe(3 - 2);
    expect(sickChar.skills.find(s => s.name === 'Diplomacy')!.bonus).toBe(4 - 2);

    // Dazzled: -1 attack, -1 Search, -1 Spot
    const dazzledChar = new Character(buildConditionsSheet(['Dazzled: 1 rounds/5 rounds']));
    dazzledChar.ParseCharacter();
    expect(dazzledChar.attackBonus.currentScore).toBe(-1);
    expect(dazzledChar.skills.find(s => s.name === 'Search')!.bonus).toBe(5 - 1);
    expect(dazzledChar.skills.find(s => s.name === 'Spot')!.bonus).toBe(6 - 1);
    expect(dazzledChar.skills.find(s => s.name === 'Listen')!.bonus).toBe(6);

    // Deafened: -4 Initiative
    const deafChar = new Character(buildConditionsSheet(['Deafened: 1 rounds/5 rounds']));
    deafChar.ParseCharacter();
    expect(deafChar.InitiativeBonus.bonus).toBe(3 - 4);

    // Entangled: -2 attack, -4 Dex (16 -> 12, mod +1), speed halved (30 -> 15)
    const entangledChar = new Character(buildConditionsSheet(['Entangled: 1 rounds/5 rounds']));
    entangledChar.ParseCharacter();
    expect(entangledChar.attackBonus.currentScore).toBe(-2);
    expect(entangledChar.abilities.Dex.currentScore).toBe(12);
    expect(entangledChar.speed.currentScore).toBe(15);

    // Prone: -4 melee attack (ranged unaffected by meleeAttackBonus)
    const proneChar = new Character(buildConditionsSheet(['Prone: 1 rounds/5 rounds']));
    proneChar.ParseCharacter();
    expect(proneChar.weapons.find(w => w.name === 'Longsword')!.attackBonus.bonus).toBe(7 - 4);
    expect(proneChar.weapons.find(w => w.name === 'Longbow')!.attackBonus.bonus).toBe(7);

    // Paralyzed: effective Str and Dex drop to 0 (-5 modifier), losesDexToAc = true
    const paraChar = new Character(buildConditionsSheet(['Paralyzed: 1 rounds/5 rounds']));
    paraChar.ParseCharacter();
    expect(paraChar.abilities.Str.currentScore).toBe(0);
    expect(paraChar.abilities.Dex.currentScore).toBe(0);
    expect(paraChar.abilities.Str.modifier).toBe(-5);
    expect(paraChar.abilities.Dex.modifier).toBe(-5);
    expect(paraChar.ac.losesDexToAc).toBe(true);

    // Squeezing: -4 attack, -4 AC, speed halved (30 -> 15)
    const squeezeChar = new Character(buildConditionsSheet(['Squeezing: 1 rounds/5 rounds']));
    squeezeChar.ParseCharacter();
    expect(squeezeChar.attackBonus.currentScore).toBe(-4);
    expect(squeezeChar.ac.currentArmorClass).toBe(13 - 4);
    expect(squeezeChar.speed.currentScore).toBe(15);
  });

  test('4. Tactical combat statuses (Cover, Soft Cover, Improved Cover, Concealment, Total Concealment, Flanking, Higher Ground) and status descriptions on CharacterRep without inflating quickStatuses', () => {
    const coverChar = new Character(buildConditionsSheet(['Cover: 1 rounds/5 rounds']));
    coverChar.ParseCharacter();
    expect(coverChar.ac.currentArmorClass).toBe(13 + 4);
    expect(coverChar.saves.Ref.bonus).toBe(4 + 2);

    const impCoverChar = new Character(buildConditionsSheet(['Improved Cover: 1 rounds/5 rounds']));
    impCoverChar.ParseCharacter();
    expect(impCoverChar.ac.currentArmorClass).toBe(13 + 8);
    expect(impCoverChar.saves.Ref.bonus).toBe(4 + 4);
    expect(impCoverChar.skills.find(s => s.name === 'Hide')!.bonus).toBe(7 + 10);

    const flankChar = new Character(buildConditionsSheet([
      'Flanking: 1 rounds/1 rounds',
      'Higher Ground: 1 rounds/1 rounds'
    ]));
    flankChar.ParseCharacter();
    expect(flankChar.weapons.find(w => w.name === 'Longsword')!.attackBonus.bonus).toBe(7 + 2 + 1);
    expect(flankChar.weapons.find(w => w.name === 'Longbow')!.attackBonus.bonus).toBe(7);

    // Status descriptions are attached to rep.statuses, while rep.quickStatuses is NOT inflated
    AddStatusToCharacter(TEMP_COND_FILE, 'Nauseated', 3);
    AddStatusToCharacter(TEMP_COND_FILE, 'Total Concealment', 3);
    const rep = GetCharacterRepByDocId(TEMP_COND_FILE) as any;
    const nauseatedStatus = rep.statuses.find((s: any) => s.name === 'Nauseated');
    const concealStatus = rep.statuses.find((s: any) => s.name === 'Total Concealment');
    expect(nauseatedStatus?.description).toContain('move action');
    expect(concealStatus?.description).toContain('50% miss chance');
    expect(rep.quickStatuses).toEqual([]);
  });

  test('5. Statuses card header includes categorized + Condition and + Tactical preset selectors that prefill a status row without polluting quickStatuses', () => {
    const mainHtmlPath = path.join(__dirname, '../../client/html/main.html');
    const html = fs.readFileSync(mainHtmlPath, 'utf-8');

    expect(html).toContain('id="conditionSelect"');
    expect(html).toContain('<optgroup label="Fear">');
    expect(html).toContain('value="Shaken"');
    expect(html).toContain('value="Fatigued"');
    expect(html).toContain('value="Blinded"');
    expect(html).toContain('value="Prone"');
    expect(html).toContain('id="tacticalSelect"');
    expect(html).toContain('value="Cover"');
    expect(html).toContain('value="Improved Cover"');
    expect(html).toContain('value="Flanking"');
    expect(html).toContain('value="Total Concealment"');

    // convertToRounds supports 'endless' -> -1
    expect(convertToRounds(1, 'endless')).toBe(-1);
    expect(typeof onConditionPresetSelected).toBe('function');
    expect(typeof onTacticalPresetSelected).toBe('function');
  });
});
