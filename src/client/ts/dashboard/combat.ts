import { characterRep } from '../state';
import { addTooltip } from '../character_script';
import {

  endCombat,
  enterCombat,
  getRemainingAoo,
  getRoundState,
  renderRoundActionsUI,
  resetRound,
  saveRoundState,
  toggleActionSlot,
  triggerOffTurnImmediate
} from '../round_actions';

export function updateAttacksOfOpportunityDisplay() {
  const el = document.getElementById('attacksOfOpportunity');
  if (!el || !characterRep?.attacksOfOpportunity) return;

  const aooProp = characterRep.attacksOfOpportunity;
  const maxAoo = Math.max(0, Number(aooProp.currentScore ?? aooProp.bonus ?? 1));
  const docId = characterRep.docId;
  const inCombat = Boolean(docId && getRoundState(docId).inCombat);
  const remaining = docId ? getRemainingAoo(docId, maxAoo) : maxAoo;

  el.textContent = inCombat ? `${remaining}/${maxAoo}` : `${maxAoo}`;


  const weaponSelect = document.getElementById('weaponSelect') as HTMLSelectElement | null;
  const mainIdx = weaponSelect ? parseInt(weaponSelect.value, 10) : NaN;
  const mainWeapon = !isNaN(mainIdx) && characterRep.weapons ? characterRep.weapons[mainIdx] : null;
  const baseTooltip = aooProp.string || '';

  if (mainWeapon) {
    if (mainWeapon.rangeType === 'Ranged') {
      addTooltip('attacksOfOpportunity', `${baseTooltip}\nNo AoO available with ranged weapon (${mainWeapon.name}).`);
    } else {
      const aooTooltip = `${baseTooltip}\nAoO Attack (${mainWeapon.name}): ${mainWeapon.atkValue} (${mainWeapon.dmgValue})`;
      addTooltip('attacksOfOpportunity', aooTooltip, mainWeapon.rolzAtkRollMessage);
    }
  } else {
    addTooltip('attacksOfOpportunity', baseTooltip);
  }
}


export function toggleActionSlotHandler(slot: 'standard' | 'move' | 'swift' | '5-foot-step') {
  if (!characterRep?.docId) return;
  toggleActionSlot(characterRep.docId, slot);
}

export function resetRoundActions() {
  if (!characterRep?.docId) return;
  resetRound(characterRep.docId);
  updateAttacksOfOpportunityDisplay();
}

export function triggerOffTurnImmediateHandler() {
  if (!characterRep?.docId) return;
  triggerOffTurnImmediate(characterRep.docId);
}

export function startCombatMode() {
  if (!characterRep?.docId) return;
  const input = window.prompt('Enter Initiative score (leave blank for none):', '');
  if (input === null) return;
  const parsed = input.trim() === '' ? null : parseInt(input.trim(), 10);
  enterCombat(characterRep.docId, parsed !== null && !isNaN(parsed) ? parsed : null);
  updateAttacksOfOpportunityDisplay();
}

export function endCombatMode() {
  if (!characterRep?.docId) return;
  endCombat(characterRep.docId);
  updateAttacksOfOpportunityDisplay();
}

export function toggleCombatMode() {
  if (!characterRep?.docId) return;
  const state = getRoundState(characterRep.docId);
  if (state.inCombat) {
    endCombat(characterRep.docId);
    updateAttacksOfOpportunityDisplay();
  } else {
    startCombatMode();
  }
}

export function onCurrentInitClick() {
  if (!characterRep?.docId) return;
  const state = getRoundState(characterRep.docId);
  if (!state.inCombat) {
    startCombatMode();
    return;
  }
  const currentStr = state.currentInitiative !== null ? String(state.currentInitiative) : '';
  const input = window.prompt('Edit Initiative score (or type "end" to exit Combat):', currentStr);
  if (input === null) return;
  if (input.trim().toLowerCase() === 'end') {
    endCombat(characterRep.docId);
    updateAttacksOfOpportunityDisplay();
    return;
  }
  const parsed = input.trim() === '' ? null : parseInt(input.trim(), 10);
  const next = { ...state, currentInitiative: parsed !== null && !isNaN(parsed) ? parsed : state.currentInitiative };
  saveRoundState(characterRep.docId, next);
  renderRoundActionsUI(characterRep.docId);
}

