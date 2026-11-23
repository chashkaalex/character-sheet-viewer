import * as fs from 'fs';
import * as path from 'path';
import { Character, CharacterError } from '../../server/character/character';
import {
  AddStatusToCharacter,
  RemoveStatusFromCharacter,
  OnCastSpell,
  OnRoundsElapsed
} from '../../server/character/character_manipulation';
import { GetSpellData, SpellTarget } from '../../server/character/spells';
import { adapter } from '../../server/character/adapter_selector';
import { CharacterRep } from '../../server/character/character_rep';
import { resolveIncomingWeaponTargetedStatus } from '../../client/ts/party_sync_listener';

const TEMP_DIR = path.join(__dirname, 'test_character_sheets', 'temp');
const TEMP_BESS_KEEN = path.join(TEMP_DIR, 'temp_bess_keen_edge.txt');
const SOURCE_BESS = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');

function buildKeenEdgeTestSheet(overrides: {
  statuses?: string[];
  feats?: string[];
  battleGear?: string[];
} = {}): string[] {
  return [
    'KeenEdgeTester',
    '(Human Fighter 6)',
    'Init: +2; Senses: Listen +0, Spot +0;',
    'BAb: +6/+1; Grapple: +9; Hp: 55/55; Speed: 30 ft.',
    'Attack: +9 Longsword.',
    'AC: 12, Touch 12, Flat-footed 10.',
    'Saves: Fort +5; Ref +4; Will +2.',
    'Str: 16 (+3)',
    'Dex: 14 (+2)',
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
    'Battle Gear:',
    ...(overrides.battleGear || [
      'Longsword (1d8/19-20x2, 4 lb.)',
      'Scimitar (1d6/18-20x2, 4 lb.)',
      'Greataxe (1d12/x3, 12 lb.)'
    ]),
    'Possessions:',
    'Personal Information'
  ];
}

describe('Step 1.3b: Parameterized Weapon-Targeted Spells & Statuses (Keen Edge)', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    const baseBess = fs.readFileSync(SOURCE_BESS, 'utf8');
    // Add Keen Edge to Bess's Level 3 Spells Known
    const bessWithKeenEdge = baseBess.replace(
      'Haste -  Move and act more quickly',
      'Keen Edge – Doubles normal weapon\'s threat range.\nHaste -  Move and act more quickly'
    );
    fs.writeFileSync(TEMP_BESS_KEEN, bessWithKeenEdge, 'utf8');
    if ((adapter as any).pushedPartyStatuses) {
      (adapter as any).pushedPartyStatuses = [];
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_BESS_KEEN)) {
      fs.unlinkSync(TEMP_BESS_KEEN);
    }
  });

  test('1. Keen Edge spell is registered with Close range, OneCreature target, requiresWeaponSelection, and 10 min/level duration', () => {
    const keenData = GetSpellData('Keen Edge');
    expect(keenData).not.toBeNull();
    expect(keenData!.range).toBe('Close');
    expect(keenData!.target).toBe(SpellTarget.OneCreature);
    expect(keenData!.requiresWeaponSelection).toBe(true);
    // 10 min/level = level * 10 * 10 rounds = level * 100 rounds
    expect(keenData!.calculateDuration({ level: { currentScore: 5 } } as any)).toBe(500);
  });

  test('2. Parameterized status "Keen Edge (<Weapon>)" doubles ONLY the selected weapon\'s threat range and does not stack with Keen or Improved Critical', () => {
    const char = new Character(buildKeenEdgeTestSheet({
      statuses: ['Keen Edge (Scimitar): 1 rounds/500 rounds'],
      feats: ['Improved Critical (Longsword)'],
      battleGear: [
        'Longsword (1d8/19-20x2, 4 lb.)',
        'Scimitar (1d6/18-20x2, 4 lb.)',
        'Keen Rapier +1 (1d6/18-20x2, 2 lb.)',
        'Greataxe (1d12/x3, 12 lb.)'
      ]
    }));
    char.ParseCharacter();

    const scimitar = char.weapons.find(w => w.baseName === 'Scimitar')!;
    const longsword = char.weapons.find(w => w.baseName === 'Longsword')!;
    const rapier = char.weapons.find(w => w.baseName === 'Rapier')!;
    const greataxe = char.weapons.find(w => w.baseName === 'Greataxe')!;

    // Scimitar targeted by Keen Edge (Scimitar): 18-20/x2 -> 15-20X2
    expect(scimitar.critValue).toBe('15-20X2');
    // Greataxe NOT targeted by Keen Edge: stays X3
    expect(greataxe.critValue).toBe('X3');
    // Longsword has Improved Critical: 17-20X2
    expect(longsword.critValue).toBe('17-20X2');

    // Now also apply Keen Edge to Longsword (which has Improved Critical) and Keen Rapier +1 -> must NOT stack!
    const charNonStack = new Character(buildKeenEdgeTestSheet({
      statuses: [
        'Keen Edge (Longsword): 1 rounds/500 rounds',
        'Keen Edge (Keen Rapier +1): 1 rounds/500 rounds'
      ],
      feats: ['Improved Critical (Longsword)'],
      battleGear: [
        'Longsword (1d8/19-20x2, 4 lb.)',
        'Keen Rapier +1 (1d6/18-20x2, 2 lb.)'
      ]
    }));
    charNonStack.ParseCharacter();
    expect(charNonStack.weapons.find(w => w.baseName === 'Longsword')!.critValue).toBe('17-20X2');
    expect(charNonStack.weapons.find(w => w.baseName === 'Rapier')!.critValue).toBe('15-20X2');
  });

  test('3. Casting Keen Edge on Self with targetWeapon applies "Keen Edge (<Weapon>)" and reverts when status expires or is removed', () => {
    // Bess casts Keen Edge (level 3 spontaneous) on Self targeting her "Short Sword (Green Dragon Bone)"
    const castResult = OnCastSpell(TEMP_BESS_KEEN, {
      casterClassName: 'Bard',
      spellLevel: '3',
      spellName: 'Keen Edge',
      slotIndex: 0,
      isUsed: false,
      isEmpty: true,
      targets: ['Self'],
      targetWeapon: 'Short Sword (Green Dragon Bone)'
    });

    expect(castResult instanceof CharacterError).toBe(false);
    const rep = castResult as CharacterRep;

    // Duration for Bess (Bard 13) = 13 * 10 * 10 = 1300 rounds
    const keenStatus = rep.statuses.find(s => s.name === 'Keen Edge (Short Sword (Green Dragon Bone))');
    expect(keenStatus).toBeDefined();
    expect(keenStatus!.duration).toBe(1300);

    // Bess's Short Sword (base 19-20/x2) now has critValue 17-20X2, while her Light Coil Crossbow (base 19-20/x2) remains 19-20X2
    const shortSword = rep.weapons.find(w => w.name === 'Short Sword (Green Dragon Bone)')!;
    const crossbow = rep.weapons.find(w => w.name.includes('Light Coil Crossbow'))!;
    expect(shortSword.critValue).toBe('17-20X2');
    expect(crossbow.critValue).toBe('19-20X2');

    // Removing the status restores Short Sword critValue to 19-20X2
    const afterRemove = RemoveStatusFromCharacter(TEMP_BESS_KEEN, 'Keen Edge (Short Sword (Green Dragon Bone))') as CharacterRep;
    expect(afterRemove.statuses.some(s => s.name.startsWith('Keen Edge'))).toBe(false);
    expect(afterRemove.weapons.find(w => w.name === 'Short Sword (Green Dragon Bone)')!.critValue).toBe('19-20X2');
  });

  test('4. Casting Keen Edge on a remote party member pushes "Keen Edge" and recipient weapon selection resolves to "Keen Edge (<Selected Weapon>)"', () => {
    // Bess casts Keen Edge targeting Dein
    const castResult = OnCastSpell(TEMP_BESS_KEEN, {
      casterClassName: 'Bard',
      spellLevel: '3',
      spellName: 'Keen Edge',
      slotIndex: 0,
      isUsed: false,
      isEmpty: true,
      targets: ['Dein']
    });
    expect(castResult instanceof CharacterError).toBe(false);

    const pushed = (adapter as any).pushedPartyStatuses;
    expect(pushed).toHaveLength(1);
    expect(pushed[0]).toEqual(expect.objectContaining({
      targetMember: 'Dein',
      payload: expect.objectContaining({
        statusName: 'Keen Edge',
        duration: 1300
      })
    }));

    // When Dein receives "Keen Edge" and selects "Frost Waraxe +1 (Dwarvencraft)", it resolves to "Keen Edge (Frost Waraxe +1 (Dwarvencraft))"
    const resolvedStatus = resolveIncomingWeaponTargetedStatus('Keen Edge', 'Frost Waraxe +1 (Dwarvencraft)');
    expect(resolvedStatus).toBe('Keen Edge (Frost Waraxe +1 (Dwarvencraft))');

    // Applying that status to Bess's temp file (or any character) and expiring via OnRoundsElapsed works cleanly
    AddStatusToCharacter(TEMP_BESS_KEEN, 'Keen Edge (Short Sword (Green Dragon Bone))', 10);
    const afterExpire = OnRoundsElapsed(TEMP_BESS_KEEN, 10) as CharacterRep;
    expect(afterExpire.statuses.some(s => s.name.startsWith('Keen Edge'))).toBe(false);
  });
});
