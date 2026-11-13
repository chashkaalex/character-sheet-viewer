import * as fs from 'fs';
import * as path from 'path';
import {
  advanceRound,
  consumeActionCost,
  endCombat,
  enterCombat,
  getRoundState,
  resetRound,
  toggleActionSlot,
  triggerOffTurnImmediate,
  validateActionCost
} from '../../client/ts/round_actions';
import { Character } from '../../server/character/character';
import { getCharacterRep } from '../../server/character/character_rep';

describe('Round Action Economy & Soft Enforcement', () => {
  const docId = 'test_round_actions_doc';

  beforeEach(() => {
    endCombat(docId);
  });

  it('bypasses restrictions and does not consume slots when out of combat', () => {
    const initial = getRoundState(docId);
    expect(initial.inCombat).toBe(false);
    expect(initial.currentInitiative).toBeNull();

    expect(validateActionCost('standard', initial).ok).toBe(true);
    const after = consumeActionCost(docId, 'Total Defense', 'standard');
    expect(after.standardUsed).toBe(false);
    expect(validateActionCost('standard', after).ok).toBe(true);
  });

  it('enters combat with initiative and exits cleanly on endCombat', () => {
    const combatState = enterCombat(docId, 19);
    expect(combatState.inCombat).toBe(true);
    expect(combatState.currentInitiative).toBe(19);

    const exited = endCombat(docId);
    expect(exited.inCombat).toBe(false);
    expect(exited.currentInitiative).toBeNull();
  });

  it('enforces standard, move, swift, and move-to-standard downgrade in combat', () => {
    enterCombat(docId, 14);

    // Use Move
    let state = consumeActionCost(docId, 'Move 30 ft', 'move', { isMovement: true });
    expect(state.moveUsed).toBe(true);
    expect(state.standardUsed).toBe(false);

    // Second Move is allowed by downgrading unused Standard
    expect(validateActionCost('move', state, { isMovement: true }).ok).toBe(true);
    state = consumeActionCost(docId, 'Move 15 ft', 'move', { isMovement: true });
    expect(state.standardUsed).toBe(true);

    // Third Move or Standard now warns
    expect(validateActionCost('move', state, { isMovement: true }).ok).toBe(false);
    expect(validateActionCost('standard', state).ok).toBe(false);

    // Swift is still available
    expect(validateActionCost('swift', state).ok).toBe(true);
    state = consumeActionCost(docId, 'Absolute Steel Stance', 'swift');
    expect(state.swiftUsed).toBe(true);
    expect(validateActionCost('swift', state).ok).toBe(false);
  });

  it('allows sequential attacks in a Full Attack without re-prompting, and allows 5-foot step with Full Attack', () => {
    enterCombat(docId, 12);

    // Take 5-foot step first (legal with Full Attack in D&D 3.5)
    let state = consumeActionCost(docId, '5-Foot Step', '5-foot-step');
    expect(state.fiveFootStepUsed).toBe(true);

    // Start Full Attack
    expect(validateActionCost('full-round', state, { isFullAttackFollowUp: false }).ok).toBe(true);
    state = consumeActionCost(docId, 'Unarmed (#1)', 'full-round', {
      isFullAttack: true,
      attackId: 'normalAtkValue_0'
    });
    expect(state.standardUsed).toBe(true);
    expect(state.moveUsed).toBe(true);
    expect(state.fullAttackInProgress).toBe(true);
    expect(state.rolledAttackIds).toContain('normalAtkValue_0');

    // Follow-up attack in the same Full Attack is allowed without warning
    expect(validateActionCost('full-round', state, { isFullAttackFollowUp: state.fullAttackInProgress }).ok).toBe(true);
    state = consumeActionCost(docId, 'Unarmed (#2)', 'full-round', {
      isFullAttack: true,
      isFullAttackFollowUp: true,
      attackId: 'normalAtkValue_1'
    });
    expect(state.rolledAttackIds).toEqual(['normalAtkValue_0', 'normalAtkValue_1']);

    // Casting a separate Standard spell in the same round warns
    expect(validateActionCost('standard', state).ok).toBe(false);
  });

  it('prevents 5-Foot Step after moving and prevents moving after 5-Foot Step', () => {
    enterCombat(docId, 10);

    const movedState = consumeActionCost(docId, 'Charge', 'full-round', { isMovement: true });
    expect(movedState.movedThisRound).toBe(true);
    const fiveFtCheck = validateActionCost('5-foot-step', movedState);
    expect(fiveFtCheck.ok).toBe(false);

    resetRound(docId);
    const steppedState = consumeActionCost(docId, '5-Foot Step', '5-foot-step');
    expect(validateActionCost('move', steppedState, { isMovement: true }).ok).toBe(false);
    expect(validateActionCost('full-round', steppedState, { isMovement: true }).ok).toBe(false);
  });

  it('carries off-turn Immediate action into next round Swift slot on advanceRound(1)', () => {
    enterCombat(docId, 15);
    consumeActionCost(docId, 'Total Defense', 'standard');
    triggerOffTurnImmediate(docId);
    expect(getRoundState(docId).nextRoundSwiftUsed).toBe(true);

    const nextRound = advanceRound(docId, 1);
    expect(nextRound.standardUsed).toBe(false);
    expect(nextRound.swiftUsed).toBe(true);
    expect(nextRound.nextRoundSwiftUsed).toBe(false);

    triggerOffTurnImmediate(docId);
    const twoRoundsLater = advanceRound(docId, 2);
    expect(twoRoundsLater.swiftUsed).toBe(false);
  });

  it('allows manual slot toggling', () => {
    enterCombat(docId, 11);
    let state = toggleActionSlot(docId, 'standard');
    expect(state.standardUsed).toBe(true);
    state = toggleActionSlot(docId, 'standard');
    expect(state.standardUsed).toBe(false);
  });

  it('exposes actionType metadata in CharacterRep', () => {
    const filePath = path.join(__dirname, 'test_character_sheets', 'naethan_test.txt');
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const char = new Character(lines, filePath);
    const rep = getCharacterRep(char);

    expect(rep.actionsMetadata?.['Move']?.actionType).toBe('move');
    expect(rep.actionsMetadata?.['5-Foot Step']?.actionType).toBe('5-foot-step');
    expect(rep.actionsMetadata?.['Total Defense']?.actionType).toBe('standard');
    expect(rep.actionsMetadata?.['Charge']?.actionType).toBe('full-round');
    expect(rep.actionsMetadata?.['Fighting Defensively']?.actionType).toBe('free');
    expect(rep.actionsMetadata?.['Delay']?.actionType).toBe('none');
  });
});
