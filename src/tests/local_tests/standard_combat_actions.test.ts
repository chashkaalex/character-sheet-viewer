import * as fs from 'fs';
import * as path from 'path';

// Mock browser globals for testing client-side scripts under Node
(global as any).window = {
  addEventListener: () => { },
  document: {
    addEventListener: () => { },
    getElementById: () => null
  }
};
(global as any).document = (global as any).window.document;

import '../../server/character/character';
import { ActionsData, STANDARD_COMBAT_ACTIONS } from '../../server/character/actions/actions_effects';
import {
  GetCharacterByDocId,
  GetCharacterRepByDocId,
  OnUseAction,
  OnRoundsElapsed
} from '../../server/character/character_manipulation';
import { CharacterError } from '../../server/character/character';

describe('Standard Combat Actions', () => {
  const SHEETS_DIR = path.join(__dirname, 'test_character_sheets');
  const SOURCE_NAETHAN_PATH = path.join(SHEETS_DIR, 'naethan_test.txt');
  const TEMP_DIR = path.join(SHEETS_DIR, 'temp');
  const TEMP_LOW_TUMBLE_PATH = path.join(TEMP_DIR, 'temp_std_combat_low_tumble.txt');
  const TEMP_HIGH_TUMBLE_PATH = path.join(TEMP_DIR, 'temp_std_combat_high_tumble.txt');

  beforeEach(() => {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    const baseSheet = fs.readFileSync(SOURCE_NAETHAN_PATH, 'utf8');
    const lowTumbleSheet = baseSheet.replace('Tumble (Dex): 6', 'Tumble (Dex): 2');
    const highTumbleWithCombatCasting = baseSheet
      .replace('Feats:\r\n', 'Feats:\r\nCombat Casting,\r\n')
      .replace('Feats:\n', 'Feats:\nCombat Casting,\n')
      .replace('Tumble (Dex): 6', 'Tumble (Dex): 6\nConcentration (Con): 4');

    fs.writeFileSync(TEMP_LOW_TUMBLE_PATH, lowTumbleSheet, 'utf8');
    fs.writeFileSync(TEMP_HIGH_TUMBLE_PATH, highTumbleWithCombatCasting, 'utf8');
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_LOW_TUMBLE_PATH)) {
      fs.unlinkSync(TEMP_LOW_TUMBLE_PATH);
    }
    if (fs.existsSync(TEMP_HIGH_TUMBLE_PATH)) {
      fs.unlinkSync(TEMP_HIGH_TUMBLE_PATH);
    }
  });

  it('registers all standard combat actions under general category by default', () => {
    const rep = GetCharacterRepByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(rep instanceof CharacterError).toBe(false);
    if (rep instanceof CharacterError) return;

    STANDARD_COMBAT_ACTIONS.forEach(actionName => {
      expect(ActionsData[actionName]).toBeDefined();
      expect(ActionsData[actionName].category).toBe('general');
      expect(rep.actions).toContain(actionName);
      expect(rep.categorizedActions?.general).toContain(actionName);
      expect(rep.actionsMetadata?.[actionName]?.category).toBe('general');
    });
  });

  it('applies Fighting Defensively (-4 attack, +2 dodge AC without 5 Tumble ranks, +3 with 5+ Tumble ranks)', () => {
    const baseLow = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(baseLow instanceof CharacterError).toBe(false);
    if (baseLow instanceof CharacterError) return;

    const useLow = OnUseAction(TEMP_LOW_TUMBLE_PATH, 'Fighting Defensively');
    expect(useLow instanceof CharacterError).toBe(false);
    const afterLow = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(afterLow instanceof CharacterError).toBe(false);
    if (afterLow instanceof CharacterError) return;

    expect(afterLow.bab.currentScore).toBe(baseLow.bab.currentScore);
    expect(afterLow.attackBonus.currentScore).toBe(baseLow.attackBonus.currentScore - 4);
    expect(afterLow.ac.currentScore).toBe(baseLow.ac.currentScore + 2);
    expect(afterLow.ac.touchArmorClass).toBe(baseLow.ac.touchArmorClass + 2);
    expect(afterLow.ac.flatFootedArmorClass).toBe(baseLow.ac.flatFootedArmorClass);

    const baseHigh = GetCharacterByDocId(TEMP_HIGH_TUMBLE_PATH);
    expect(baseHigh instanceof CharacterError).toBe(false);
    if (baseHigh instanceof CharacterError) return;

    const useHigh = OnUseAction(TEMP_HIGH_TUMBLE_PATH, 'Fighting Defensively');
    expect(useHigh instanceof CharacterError).toBe(false);
    const afterHigh = GetCharacterByDocId(TEMP_HIGH_TUMBLE_PATH);
    expect(afterHigh instanceof CharacterError).toBe(false);
    if (afterHigh instanceof CharacterError) return;

    expect(afterHigh.bab.currentScore).toBe(baseHigh.bab.currentScore);
    expect(afterHigh.attackBonus.currentScore).toBe(baseHigh.attackBonus.currentScore - 4);
    expect(afterHigh.ac.currentScore).toBe(baseHigh.ac.currentScore + 3);
    expect(afterHigh.ac.touchArmorClass).toBe(baseHigh.ac.touchArmorClass + 3);
  });

  it('applies Total Defense (+4 dodge AC without 5 Tumble ranks, +6 with 5+ Tumble ranks)', () => {
    const baseLow = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(baseLow instanceof CharacterError).toBe(false);
    if (baseLow instanceof CharacterError) return;

    const useLow = OnUseAction(TEMP_LOW_TUMBLE_PATH, 'Total Defense');
    expect(useLow instanceof CharacterError).toBe(false);
    const afterLow = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(afterLow instanceof CharacterError).toBe(false);
    if (afterLow instanceof CharacterError) return;

    expect(afterLow.ac.currentScore).toBe(baseLow.ac.currentScore + 4);
    expect(afterLow.ac.touchArmorClass).toBe(baseLow.ac.touchArmorClass + 4);
    expect(afterLow.ac.flatFootedArmorClass).toBe(baseLow.ac.flatFootedArmorClass);

    const baseHigh = GetCharacterByDocId(TEMP_HIGH_TUMBLE_PATH);
    expect(baseHigh instanceof CharacterError).toBe(false);
    if (baseHigh instanceof CharacterError) return;

    const useHigh = OnUseAction(TEMP_HIGH_TUMBLE_PATH, 'Total Defense');
    expect(useHigh instanceof CharacterError).toBe(false);
    const afterHigh = GetCharacterByDocId(TEMP_HIGH_TUMBLE_PATH);
    expect(afterHigh instanceof CharacterError).toBe(false);
    if (afterHigh instanceof CharacterError) return;

    expect(afterHigh.ac.currentScore).toBe(baseHigh.ac.currentScore + 6);
    expect(afterHigh.ac.touchArmorClass).toBe(baseHigh.ac.touchArmorClass + 6);
  });

  it('applies Charge (+2 attack, -2 AC including Touch and Flat-Footed)', () => {
    const base = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(base instanceof CharacterError).toBe(false);
    if (base instanceof CharacterError) return;

    const useRes = OnUseAction(TEMP_LOW_TUMBLE_PATH, 'Charge');
    expect(useRes instanceof CharacterError).toBe(false);
    const after = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(after instanceof CharacterError).toBe(false);
    if (after instanceof CharacterError) return;

    expect(after.bab.currentScore).toBe(base.bab.currentScore);
    expect(after.meleeAttackBonus.currentScore).toBe(base.meleeAttackBonus.currentScore + 2);
    expect(after.ac.currentScore).toBe(base.ac.currentScore - 2);
    expect(after.ac.touchArmorClass).toBe(base.ac.touchArmorClass - 2);
    expect(after.ac.flatFootedArmorClass).toBe(base.ac.flatFootedArmorClass - 2);
    expect(after.speed.currentScore).toBe(base.speed.currentScore * 2);
  });

  it('activates Casting Defensively and triggers +4 Concentration with Combat Casting feat', () => {
    const base = GetCharacterByDocId(TEMP_HIGH_TUMBLE_PATH);
    expect(base instanceof CharacterError).toBe(false);
    if (base instanceof CharacterError) return;

    const baseConc = base.skills.find(s => s.name === 'Concentration')?.currentScore;
    expect(baseConc).toBeDefined();

    const useRes = OnUseAction(TEMP_HIGH_TUMBLE_PATH, 'Casting Defensively');
    expect(useRes instanceof CharacterError).toBe(false);
    const after = GetCharacterByDocId(TEMP_HIGH_TUMBLE_PATH);
    expect(after instanceof CharacterError).toBe(false);
    if (after instanceof CharacterError) return;

    const afterConc = after.skills.find(s => s.name === 'Concentration')?.currentScore;
    expect(afterConc).toBe(baseConc! + 4);
  });

  it('doubles speed for Withdraw and multiplies speed for Run (3x in heavy armor, 4x otherwise, +1x with Run feat)', () => {
    const baseNaethan = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(baseNaethan instanceof CharacterError).toBe(false);
    if (baseNaethan instanceof CharacterError) return;
    const baseSpeed = baseNaethan.speed.currentScore;

    // Withdraw -> 2x speed for 1 round
    const withdrawRes = OnUseAction(TEMP_LOW_TUMBLE_PATH, 'Withdraw');
    expect(withdrawRes instanceof CharacterError).toBe(false);
    const afterWithdraw = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(afterWithdraw instanceof CharacterError).toBe(false);
    if (afterWithdraw instanceof CharacterError) return;
    expect(afterWithdraw.speed.currentScore).toBe(baseSpeed * 2);

    OnRoundsElapsed(TEMP_LOW_TUMBLE_PATH, 1);
    const afterWithdrawExpire = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(afterWithdrawExpire instanceof CharacterError).toBe(false);
    if (afterWithdrawExpire instanceof CharacterError) return;
    expect(afterWithdrawExpire.speed.currentScore).toBe(baseSpeed);

    // Run in heavy armor (Naethan wears Full Plate) -> 3x speed
    const runHeavyRes = OnUseAction(TEMP_LOW_TUMBLE_PATH, 'Run');
    expect(runHeavyRes instanceof CharacterError).toBe(false);
    const afterRunHeavy = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(afterRunHeavy instanceof CharacterError).toBe(false);
    if (afterRunHeavy instanceof CharacterError) return;
    expect(afterRunHeavy.speed.currentScore).toBe(baseSpeed * 3);
    OnRoundsElapsed(TEMP_LOW_TUMBLE_PATH, 1);

    // Run without heavy armor -> 4x speed
    const noHeavySheet = fs.readFileSync(TEMP_LOW_TUMBLE_PATH, 'utf8').replace(/Full Plate/gi, 'Chain Shirt');
    fs.writeFileSync(TEMP_LOW_TUMBLE_PATH, noHeavySheet, 'utf8');
    const baseLight = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(baseLight instanceof CharacterError).toBe(false);
    if (baseLight instanceof CharacterError) return;

    const runLightRes = OnUseAction(TEMP_LOW_TUMBLE_PATH, 'Run');
    expect(runLightRes instanceof CharacterError).toBe(false);
    const afterRunLight = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(afterRunLight instanceof CharacterError).toBe(false);
    if (afterRunLight instanceof CharacterError) return;
    expect(afterRunLight.speed.currentScore).toBe(baseLight.speed.currentScore * 4);
    OnRoundsElapsed(TEMP_LOW_TUMBLE_PATH, 1);

    // Run with Run feat (and no heavy armor) -> 5x speed
    const withRunFeatSheet = fs.readFileSync(SOURCE_NAETHAN_PATH, 'utf8')
      .replace(/Full Plate/gi, 'Chain Shirt')
      .replace('Combat Expertise,', 'Run,\nCombat Expertise,');
    fs.writeFileSync(TEMP_LOW_TUMBLE_PATH, withRunFeatSheet, 'utf8');
    const charWithRunFeat = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(charWithRunFeat instanceof CharacterError).toBe(false);
    if (charWithRunFeat instanceof CharacterError) return;
    expect(charWithRunFeat.HasFeat('Run')).toBe(true);

    const runFeatRes = OnUseAction(TEMP_LOW_TUMBLE_PATH, 'Run');
    expect(runFeatRes instanceof CharacterError).toBe(false);
    const afterRunFeat = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
    expect(afterRunFeat instanceof CharacterError).toBe(false);
    if (afterRunFeat instanceof CharacterError) return;
    expect(afterRunFeat.speed.currentScore).toBe(baseLight.speed.currentScore * 5);
  });

  it('activates informational standard combat actions and expires all 1-round statuses on next round', () => {
    const actionsToCheck: Array<{ action: string; status: string }> = [
      { action: '5-Foot Step', status: 'Moved 5 feet' },
      { action: 'Run', status: 'Run' },
      { action: 'Withdraw', status: 'Withdraw' },
      { action: 'Aid Another', status: 'Aid Another' },
      { action: 'Ready Action', status: 'Ready Action' },
      { action: 'Delay', status: 'Delay' }
    ];

    for (const { action, status } of actionsToCheck) {
      const useRes = OnUseAction(TEMP_LOW_TUMBLE_PATH, action);
      expect(useRes instanceof CharacterError).toBe(false);
      if (useRes instanceof CharacterError) return;

      const charActive = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
      expect(charActive instanceof CharacterError).toBe(false);
      if (charActive instanceof CharacterError) return;
      expect(charActive.HasStatus(status)).toBe(true);

      const elapsedRes = OnRoundsElapsed(TEMP_LOW_TUMBLE_PATH, 1);
      expect(elapsedRes instanceof CharacterError).toBe(false);
      if (elapsedRes instanceof CharacterError) return;

      const charAfter = GetCharacterByDocId(TEMP_LOW_TUMBLE_PATH);
      expect(charAfter instanceof CharacterError).toBe(false);
      if (charAfter instanceof CharacterError) return;
      expect(charAfter.HasStatus(status)).toBe(false);
    }
  });
});
