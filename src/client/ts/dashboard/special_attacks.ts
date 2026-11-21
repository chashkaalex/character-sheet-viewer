import { characterRep } from '../state';
import { UpdateValueAndTooltip } from '../character_script';

let activeSpecialAttackName: string | null = null;
let selectedSpecialDocId: string | null = null;

const FAV_SPECIAL_ATTACK_PREFIX = 'csv_fav_special_attack_';

export function getFavoriteSpecialAttack(docId: string): string | null {
  if (!docId) return null;
  if (characterRep?.docId === docId && characterRep.pinnedSpecialAttack !== undefined) {
    return characterRep.pinnedSpecialAttack;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(FAV_SPECIAL_ATTACK_PREFIX + docId);
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export function setFavoriteSpecialAttack(docId: string, attackName: string | null): void {
  if (!docId) return;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (attackName) {
        window.localStorage.setItem(FAV_SPECIAL_ATTACK_PREFIX + docId, attackName);
      } else {
        window.localStorage.removeItem(FAV_SPECIAL_ATTACK_PREFIX + docId);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Populates the special attack dropdown with available special attacks.
 */
export function populateSpecialAttackDropdown() {
  const specialAttackSelect = document.getElementById('specialAttackSelect');
  const specialAttacks = characterRep.specialAttacks || {};

  console.log('Populating special attack dropdown with attacks:', specialAttacks);

  specialAttackSelect.innerHTML = '';

  const attackNames = Object.keys(specialAttacks);
  if (attackNames.length === 0) {
    specialAttackSelect.innerHTML = '<option value="">No special attacks available</option>';
    updateSpecialAttackPinButton('');
    return;
  }

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select...';
  specialAttackSelect.appendChild(defaultOption);

  attackNames.forEach(attackName => {
    const option = document.createElement('option');
    option.value = attackName;
    option.textContent = attackName;
    specialAttackSelect.appendChild(option);
  });

  if (characterRep?.docId !== selectedSpecialDocId) {
    selectedSpecialDocId = characterRep?.docId || null;
    activeSpecialAttackName = null;
  }
  if (characterRep?.docId && characterRep.pinnedSpecialAttack !== undefined) {
    setFavoriteSpecialAttack(characterRep.docId, characterRep.pinnedSpecialAttack ?? null);
  }

  if (attackNames.length > 0) {
    const pinned = characterRep?.docId ? getFavoriteSpecialAttack(characterRep.docId) : null;
    let targetAttack = attackNames[0];
    if (activeSpecialAttackName && attackNames.includes(activeSpecialAttackName)) {
      targetAttack = activeSpecialAttackName;
    } else if (pinned && attackNames.includes(pinned)) {
      targetAttack = pinned;
    }
    (specialAttackSelect as HTMLSelectElement).value = targetAttack;
    onSpecialAttackChange();
  }
}

function updateSpecialAttackPinButton(selectedAttack: string) {
  const pinBtn = document.getElementById('pinSpecialAttackBtn');
  if (!pinBtn) return;
  const pinned = characterRep?.docId ? getFavoriteSpecialAttack(characterRep.docId) : null;
  const isPinned = Boolean(selectedAttack && pinned === selectedAttack);
  pinBtn.textContent = isPinned ? '\u2605' : '\u2606';
  pinBtn.classList.toggle('pinned', isPinned);
  pinBtn.title = isPinned ? 'Unpin default Special Attack' : 'Pin as default Special Attack';
}

export function toggleFavoriteSpecialAttack() {
  if (!characterRep?.docId) return;
  const specialAttackSelect = document.getElementById('specialAttackSelect') as HTMLSelectElement | null;
  const selectedAttack = specialAttackSelect ? specialAttackSelect.value : '';
  if (!selectedAttack) return;

  const currentPinned = getFavoriteSpecialAttack(characterRep.docId);
  const nextPinned = currentPinned === selectedAttack ? null : selectedAttack;
  characterRep.pinnedSpecialAttack = nextPinned;
  setFavoriteSpecialAttack(characterRep.docId, nextPinned);
  updateSpecialAttackPinButton(selectedAttack);

  if (typeof google !== 'undefined' && google?.script?.run) {
    google.script.run
      .withFailureHandler((err: any) => console.error('Failed to persist favorite special attack:', err))
      .SetPinnedSpecialAttack(characterRep.docId, nextPinned);
  }
}

function syncSpecialAttackSelectWidth(select: HTMLSelectElement | null): void {
  if (!select || typeof document === 'undefined' || !document.body) return;
  const selectedOption = select.options?.[select.selectedIndex];
  const label = selectedOption?.textContent || '';
  if (!label) {
    select.style.width = '';
    return;
  }

  const probe = document.createElement('span');
  probe.style.visibility = 'hidden';
  probe.style.position = 'absolute';
  probe.style.whiteSpace = 'pre';
  if (typeof getComputedStyle === 'function') {
    const cs = getComputedStyle(select);
    probe.style.font = cs.font || `${cs.fontSize} ${cs.fontFamily}`;
    probe.style.fontSize = cs.fontSize;
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.letterSpacing = cs.letterSpacing;
  }
  probe.textContent = label;
  document.body.appendChild(probe);
  const textWidth = probe.getBoundingClientRect ? probe.getBoundingClientRect().width : probe.offsetWidth;
  document.body.removeChild(probe);

  if (textWidth > 0) {
    select.style.width = `${Math.ceil(textWidth + 68)}px`;
  }
}

/**
 * Handles special attack selection change and updates the displayed bonus.
 */
export function onSpecialAttackChange() {
  const specialAttackSelect = document.getElementById('specialAttackSelect') as HTMLSelectElement | null;
  if (!specialAttackSelect) return;
  const selectedAttack = specialAttackSelect.value;
  activeSpecialAttackName = selectedAttack || null;
  updateSpecialAttackPinButton(selectedAttack);
  syncSpecialAttackSelectWidth(specialAttackSelect);

  console.log('Special attack changed to:', selectedAttack);

  if (selectedAttack === '' || !characterRep.specialAttacks || !characterRep.specialAttacks[selectedAttack]) {
    document.getElementById('specialAttackBonus').innerHTML = '-';
    return;
  }

  const selectedSpecialAttack = characterRep.specialAttacks[selectedAttack];
  UpdateValueAndTooltip('specialAttackBonus', selectedSpecialAttack);
}

