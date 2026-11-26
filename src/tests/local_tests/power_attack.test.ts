import * as fs from 'fs';
import * as path from 'path';
import { Character, CharacterError } from '../../server/character/character';
import {
  GetCharacterByDocId,
  GetCharacterRepByDocId,
  OnRoundsElapsed,
  OnUseNumberAction
} from '../../server/character/character_manipulation';

const TEMP_PA_FILE = path.join(__dirname, 'test_character_sheets', 'power_attack_temp.txt');

function buildPowerAttackSheet(): string[] {
  return [
    'PowerAttacker',
    '(Human Fighter 6)',
    'Init: +2; Senses: Listen +0, Spot +0;',
    'BAb: +6; Grapple: +9; Hp: 55/55; Speed: 30 ft.',
    'Attack: +9 Greatsword.',
    'AC: 14, Touch 12, Flat-footed 12.',
    'Saves: Fort +7; Ref +4; Will +2.',
    'Str: 16 (+3)',
    'Dex: 14 (+2)',
    'Con: 14 (+2)',
    'Int: 10 (+0)',
    'Wis: 10 (+0)',
    'Cha: 10 (+0)',
    'Statuses:',
    'Feats:',
    'Power Attack',
    'Special Abilities:',
    'Racial Traits:',
    'Bonus Abilities:',
    'Flaws, Traits, Quirks:',
    'Skills:',
    'Climb (Str): 4',
    'Battle Gear:',
    'Greatsword',
    'Longsword (2H)',
    'Longsword',
    'Dagger',
    'Longbow',
    'Possessions:',
    'Personal Information'
  ];
}

describe('Phase 4, Step 4.1: Interactive Power Attack & Variable Combat Actions', () => {
  beforeEach(() => {
    fs.writeFileSync(TEMP_PA_FILE, buildPowerAttackSheet().join('\n'), 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_PA_FILE)) {
      fs.unlinkSync(TEMP_PA_FILE);
    }
  });

  test('1. Power Attack feat grants Power Attack NumberAction with max equal to character BAB', () => {
    const rep = GetCharacterRepByDocId(TEMP_PA_FILE) as any;
    expect(rep.error).toBeFalsy();
    expect(rep.actions).toContain('Power Attack');

    const meta = rep.actionsMetadata?.['Power Attack'];
    expect(meta).toBeDefined();
    expect(meta.acceptsNumber).toBe(true);
    expect(meta.minNumber).toBe(1);
    expect(meta.maxNumber).toBe(6); // Fighter 6 BAB = 6
    expect(meta.category).toBe('feat');
  });

  test('2. Activating Power Attack with N=4 scales damage by 2x for 2H weapons, 1x for 1H and Unarmed, 0x for Light, and leaves Ranged unaffected', () => {
    const baseChar = GetCharacterByDocId(TEMP_PA_FILE) as Character;
    const getBaseWpn = (name: string) => baseChar.weapons.find(w => w.name === name)!;

    // Base stats before Power Attack (BAB +6, Str +3 => 1.5x Str = +4 for 2H, +3 for 1H/Light/Unarmed; Dex +2 for Longbow)
    expect(getBaseWpn('Greatsword').attackBonus.bonus).toBe(9);
    expect(getBaseWpn('Greatsword').damageBonus.bonus).toBe(4);
    expect(getBaseWpn('Longsword (2H)').attackBonus.bonus).toBe(9);
    expect(getBaseWpn('Longsword (2H)').damageBonus.bonus).toBe(4);
    expect(getBaseWpn('Longsword').attackBonus.bonus).toBe(9);
    expect(getBaseWpn('Longsword').damageBonus.bonus).toBe(3);
    expect(getBaseWpn('Unarmed').attackBonus.bonus).toBe(9);
    expect(getBaseWpn('Unarmed').damageBonus.bonus).toBe(3);
    expect(getBaseWpn('Dagger').attackBonus.bonus).toBe(9);
    expect(getBaseWpn('Dagger').damageBonus.bonus).toBe(3);
    expect(getBaseWpn('Longbow').attackBonus.bonus).toBe(8);
    expect(getBaseWpn('Longbow').damageBonus.bonus).toBe(0);

    // Activate Power Attack with penalty = 4
    const useRes = OnUseNumberAction(TEMP_PA_FILE, 'Power Attack', 4);
    expect(useRes instanceof CharacterError).toBe(false);

    const paChar = GetCharacterByDocId(TEMP_PA_FILE) as Character;
    expect(paChar.HasStatus('Power Attack -4')).toBe(true);
    const getPaWpn = (name: string) => paChar.weapons.find(w => w.name === name)!;

    // Two-Handed (Greatsword) & One-Handed wielded in two hands (Longsword (2H)): -4 attack, +8 damage
    expect(getPaWpn('Greatsword').attackBonus.bonus).toBe(9 - 4);
    expect(getPaWpn('Greatsword').damageBonus.bonus).toBe(4 + 8);
    expect(getPaWpn('Longsword (2H)').attackBonus.bonus).toBe(9 - 4);
    expect(getPaWpn('Longsword (2H)').damageBonus.bonus).toBe(4 + 8);

    // One-Handed (Longsword) & Unarmed Strike: -4 attack, +4 damage
    expect(getPaWpn('Longsword').attackBonus.bonus).toBe(9 - 4);
    expect(getPaWpn('Longsword').damageBonus.bonus).toBe(3 + 4);
    expect(getPaWpn('Unarmed').attackBonus.bonus).toBe(9 - 4);
    expect(getPaWpn('Unarmed').damageBonus.bonus).toBe(3 + 4);

    // Light weapon (Dagger): takes -4 melee attack penalty, but +0 damage bonus!
    expect(getPaWpn('Dagger').attackBonus.bonus).toBe(9 - 4);
    expect(getPaWpn('Dagger').damageBonus.bonus).toBe(3 + 0);

    // Ranged weapon (Longbow): completely unaffected (+0 attack, +0 damage)
    expect(getPaWpn('Longbow').attackBonus.bonus).toBe(8);
    expect(getPaWpn('Longbow').damageBonus.bonus).toBe(0);

    // Expires after 1 round
    OnRoundsElapsed(TEMP_PA_FILE, 1);
    const afterChar = GetCharacterByDocId(TEMP_PA_FILE) as Character;
    expect(afterChar.HasStatus('Power Attack -4')).toBe(false);
    expect(afterChar.weapons.find(w => w.name === 'Greatsword')!.damageBonus.bonus).toBe(4);
  });

  test('3. Rejects Power Attack values exceeding character BAB or less than 1', () => {
    const tooHigh = OnUseNumberAction(TEMP_PA_FILE, 'Power Attack', 7);
    expect(tooHigh instanceof CharacterError).toBe(true);
    if (tooHigh instanceof CharacterError) {
      expect(tooHigh.errorMessage).toContain('exceeds maximum allowed of 6');
    }

    const tooLow = OnUseNumberAction(TEMP_PA_FILE, 'Power Attack', 0);
    expect(tooLow instanceof CharacterError).toBe(true);
  });
});
