/**
 * Client-side D&D 3.5 round action tracking and soft enforcement.
 * Persisted in localStorage per character docId; only enforces when in Combat.
 */

export type ActionCostType =
  | 'standard'
  | 'move'
  | 'full-round'
  | 'swift'
  | 'immediate'
  | '5-foot-step'
  | 'free'
  | 'none';

export interface RoundActionHistoryEntry {
  label: string;
  cost: ActionCostType;
}

export interface RoundActionState {
  inCombat: boolean;
  currentInitiative: number | null;
  standardUsed: boolean;
  moveUsed: boolean;
  swiftUsed: boolean;
  nextRoundSwiftUsed: boolean;
  fiveFootStepUsed: boolean;
  movedThisRound: boolean;
  fullAttackInProgress: boolean;
  rolledAttackIds: string[];
  history: RoundActionHistoryEntry[];
}

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

export interface ActionCostOptions {
  isMovement?: boolean;
  isFullAttack?: boolean;
  isFullAttackFollowUp?: boolean;
  attackId?: string;
}

const STORAGE_PREFIX = 'csv_round_state_';
const memoryFallback = new Map<string, RoundActionState>();

export function createDefaultRoundState(inCombat = false, currentInitiative: number | null = null): RoundActionState {
  return {
    inCombat,
    currentInitiative,
    standardUsed: false,
    moveUsed: false,
    swiftUsed: false,
    nextRoundSwiftUsed: false,
    fiveFootStepUsed: false,
    movedThisRound: false,
    fullAttackInProgress: false,
    rolledAttackIds: [],
    history: []
  };
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return null;
}

export function getRoundState(docId: string): RoundActionState {
  if (!docId) return createDefaultRoundState();

  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_PREFIX + docId);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...createDefaultRoundState(), ...parsed };
      }
    } catch {
      // Fall back to default state on parse errors
    }
  } else if (memoryFallback.has(docId)) {
    return { ...createDefaultRoundState(), ...memoryFallback.get(docId)! };
  }

  return createDefaultRoundState();
}

export function saveRoundState(docId: string, state: RoundActionState): void {
  if (!docId) return;
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_PREFIX + docId, JSON.stringify(state));
    } catch {
      // Ignore quota/storage errors
    }
  }
  memoryFallback.set(docId, state);
}

function clearTurnSlots(state: RoundActionState, roundsElapsed = 1): RoundActionState {
  const carrySwift = roundsElapsed === 1 ? state.nextRoundSwiftUsed : false;
  return {
    ...state,
    standardUsed: false,
    moveUsed: false,
    swiftUsed: carrySwift,
    nextRoundSwiftUsed: false,
    fiveFootStepUsed: false,
    movedThisRound: false,
    fullAttackInProgress: false,
    rolledAttackIds: [],
    history: []
  };
}

export function enterCombat(docId: string, initiative: number | null = null): RoundActionState {
  const fresh = createDefaultRoundState(true, initiative);
  saveRoundState(docId, fresh);
  renderRoundActionsUI(docId);
  return fresh;
}

export function endCombat(docId: string): RoundActionState {
  const fresh = createDefaultRoundState(false, null);
  saveRoundState(docId, fresh);
  renderRoundActionsUI(docId);
  return fresh;
}

export function validateActionCost(
  cost: ActionCostType,
  state: RoundActionState,
  options: ActionCostOptions = {}
): ValidationResult {
  if (!state.inCombat) {
    return { ok: true, reasons: [] };
  }

  const reasons: string[] = [];

  switch (cost) {
    case 'free':
    case 'none':
      break;
    case 'standard':
      if (state.standardUsed) {
        reasons.push('Standard action already used this round.');
      }
      break;
    case 'move':
      if (state.moveUsed && state.standardUsed) {
        reasons.push('Both Move and Standard actions are already used this round.');
      }
      if (options.isMovement && state.fiveFootStepUsed) {
        reasons.push('You already took a 5-Foot Step this round and cannot also move.');
      }
      break;
    case 'full-round':
      if (!options.isFullAttackFollowUp) {
        if (state.standardUsed || state.moveUsed) {
          reasons.push('Full-round action requires both Standard and Move actions.');
        }
        if (options.isMovement && state.fiveFootStepUsed) {
          reasons.push('You already took a 5-Foot Step this round and cannot also move.');
        }
      }
      break;
    case 'swift':
      if (state.swiftUsed) {
        reasons.push('Swift action already used this round.');
      }
      break;
    case 'immediate':
      if (state.swiftUsed) {
        reasons.push('Swift/Immediate action already used this round.');
      }
      break;
    case '5-foot-step':
      if (state.fiveFootStepUsed) {
        reasons.push('5-Foot Step already used this round.');
      }
      if (state.movedThisRound) {
        reasons.push('You already moved this round and cannot take a 5-Foot Step.');
      }
      break;
  }

  return { ok: reasons.length === 0, reasons };
}

export function checkActionCostWithPrompt(
  docId: string,
  cost: ActionCostType,
  options: ActionCostOptions = {}
): boolean {
  const state = getRoundState(docId);
  const validation = validateActionCost(cost, state, options);
  if (validation.ok) return true;

  const message = `${validation.reasons.join('\n')}\n\nProceed anyway?`;
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm(message);
  }
  return true;
}

export function consumeActionCost(
  docId: string,
  label: string,
  cost: ActionCostType,
  options: ActionCostOptions = {}
): RoundActionState {
  const state = getRoundState(docId);
  if (!state.inCombat) {
    return state;
  }

  const next: RoundActionState = {
    ...state,
    rolledAttackIds: [...state.rolledAttackIds],
    history: [...state.history]
  };

  switch (cost) {
    case 'standard':
      next.standardUsed = true;
      break;
    case 'move':
      if (!next.moveUsed) {
        next.moveUsed = true;
      } else {
        next.standardUsed = true;
      }
      if (options.isMovement) {
        next.movedThisRound = true;
      }
      break;
    case 'full-round':
      next.standardUsed = true;
      next.moveUsed = true;
      if (options.isMovement) {
        next.movedThisRound = true;
      }
      if (options.isFullAttack) {
        next.fullAttackInProgress = true;
      }
      break;
    case 'swift':
    case 'immediate':
      next.swiftUsed = true;
      break;
    case '5-foot-step':
      next.fiveFootStepUsed = true;
      break;
    case 'free':
    case 'none':
      break;
  }

  if (options.attackId && !next.rolledAttackIds.includes(options.attackId)) {
    next.rolledAttackIds.push(options.attackId);
  }

  if (cost !== 'free' && cost !== 'none' && !options.isFullAttackFollowUp) {
    next.history.push({ label, cost });
  }

  saveRoundState(docId, next);
  renderRoundActionsUI(docId);
  return next;
}

export function advanceRound(docId: string, roundsElapsed: number): RoundActionState {
  const state = getRoundState(docId);
  if (!state.inCombat || roundsElapsed < 1) {
    return state;
  }
  const next = clearTurnSlots(state, roundsElapsed);
  saveRoundState(docId, next);
  renderRoundActionsUI(docId);
  return next;
}

export function toggleActionSlot(
  docId: string,
  slot: 'standard' | 'move' | 'swift' | '5-foot-step'
): RoundActionState {
  const state = getRoundState(docId);
  if (!state.inCombat) return state;

  const next = { ...state };
  if (slot === 'standard') next.standardUsed = !next.standardUsed;
  if (slot === 'move') next.moveUsed = !next.moveUsed;
  if (slot === 'swift') next.swiftUsed = !next.swiftUsed;
  if (slot === '5-foot-step') next.fiveFootStepUsed = !next.fiveFootStepUsed;

  saveRoundState(docId, next);
  renderRoundActionsUI(docId);
  return next;
}

export function triggerOffTurnImmediate(docId: string): RoundActionState {
  const state = getRoundState(docId);
  if (!state.inCombat) return state;

  const next: RoundActionState = {
    ...state,
    nextRoundSwiftUsed: !state.nextRoundSwiftUsed
  };
  saveRoundState(docId, next);
  renderRoundActionsUI(docId);
  return next;
}

export function resetRound(docId: string): RoundActionState {
  const state = getRoundState(docId);
  if (!state.inCombat) return state;

  const next = clearTurnSlots({ ...state, nextRoundSwiftUsed: false }, 1);
  saveRoundState(docId, next);
  renderRoundActionsUI(docId);
  return next;
}

export function renderRoundActionsUI(docId: string): void {
  if (typeof document === 'undefined') return;

  const state = getRoundState(docId);

  const currentInitEl = document.getElementById('currentInit');
  if (currentInitEl) {
    if (state.inCombat) {
      currentInitEl.textContent = state.currentInitiative !== null ? String(state.currentInitiative) : 'In Combat';
      currentInitEl.classList.add('in-combat');
      currentInitEl.title = 'Click to edit initiative or end combat';
    } else {
      currentInitEl.textContent = '-';
      currentInitEl.classList.remove('in-combat');
      currentInitEl.title = 'Roll Initiative or click to enter Combat';
    }
  }

  const combatBtn = document.getElementById('combatToggleButton');
  if (combatBtn) {
    combatBtn.textContent = state.inCombat ? 'End Combat' : 'Start Combat';
    combatBtn.classList.toggle('in-combat', state.inCombat);
    combatBtn.title = state.inCombat
      ? 'Exit Combat and clear round restrictions'
      : 'Enter Combat and enable round action tracking';
  }

  const bar = document.getElementById('roundActionsBar');
  if (!bar) return;

  if (!state.inCombat) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }

  bar.style.display = 'flex';

  const slotBtn = (
    label: string,
    slot: 'standard' | 'move' | 'swift' | '5-foot-step',
    used: boolean
  ) =>
    `<button type="button" class="round-slot-pill ${used ? 'spent' : 'available'}" onclick="toggleActionSlot('${slot}')" title="Click to toggle ${label}">${label}</button>`;

  const historyTitle = state.history.length > 0
    ? state.history.map(h => `${h.label} (${h.cost})`).join(', ')
    : 'No actions spent yet this round';

  bar.innerHTML = `
    <div class="round-actions-active" title="${historyTitle}">
      <div class="round-slots-group">
        ${slotBtn('Standard', 'standard', state.standardUsed)}
        ${slotBtn('Move', 'move', state.moveUsed)}
        ${slotBtn('Swift', 'swift', state.swiftUsed)}
        ${slotBtn('5-ft Step', '5-foot-step', state.fiveFootStepUsed)}
      </div>
      <div class="round-controls-group">
        <button type="button" class="round-btn-small ${state.nextRoundSwiftUsed ? 'spent' : ''}" onclick="triggerOffTurnImmediate()" title="Mark next round's Swift action as spent by an off-turn Immediate action">Immediate (Next)</button>
        <button type="button" class="round-btn-small" onclick="resetRoundActions()" title="Reset this round's action slots">Reset Turn</button>
      </div>
    </div>
  `;

  // Sync visual state of any rendered full-attack spans
  state.rolledAttackIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('attack-rolled');
    }
  });
}
