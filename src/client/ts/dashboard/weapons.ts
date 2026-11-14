import { characterRep } from '../state';
import { addTooltip } from '../character_script';
import { checkActionCostWithPrompt, consumeActionCost, getRoundState } from '../round_actions';
import { updateAttacksOfOpportunityDisplay } from './combat';

let showFullAttack = false;
let showSneakAttack = false;
let showTwf: boolean | null = null;
let lastTwfDocId: string | null = null;
let selectedWeaponName: string | null = null;
let selectedWeaponDocId: string | null = null;

export function selectDefaultWeaponIndex(
  weapons: Array<{ name?: string; isPreferred?: boolean }>,
  isMonk = false
): number {
  if (!weapons || weapons.length === 0) return -1;
  const preferredIdx = weapons.findIndex(w => Boolean(w && w.isPreferred));
  if (preferredIdx !== -1) {
    return preferredIdx;
  }
  if (isMonk) {
    const unarmedIdx = weapons.findIndex(w => w?.name === 'Unarmed');
    if (unarmedIdx !== -1) return unarmedIdx;
  }
  if (weapons[0]?.name === 'Unarmed' && weapons.length > 1) {
    return 1;
  }
  return 0;
}

/**
 * Populates the weapon dropdown with available weapons.
 */
export function populateWeaponDropdown() {
  const weaponSelect = document.getElementById('weaponSelect');
  const weapons = characterRep.weapons || [];

  weaponSelect.innerHTML = '';

  if (weapons.length === 0) {
    weaponSelect.innerHTML = '<option value="">No weapons available</option>';
    return;
  }

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a weapon...';
  weaponSelect.appendChild(defaultOption);

  weapons.forEach((weapon, index) => {
    if (weapon && weapon.name) {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = weapon.name;
      weaponSelect.appendChild(option);
    }
  });

  if (characterRep?.docId !== selectedWeaponDocId) {
    selectedWeaponDocId = characterRep?.docId || null;
    selectedWeaponName = null;
  }

  let targetIdx = -1;
  if (selectedWeaponName) {
    targetIdx = weapons.findIndex(w => w && w.name === selectedWeaponName);
  }
  if (targetIdx === -1) {
    targetIdx = selectDefaultWeaponIndex(weapons, Boolean(characterRep?.isMonk));
  }

  if (targetIdx !== -1) {
    (weaponSelect as HTMLSelectElement).value = String(targetIdx);
    onWeaponChange();
  }
}

function populateOffHandDropdown() {
  const offHandSelect = document.getElementById('offHandSelect') as HTMLSelectElement;
  const mainSelect = document.getElementById('weaponSelect') as HTMLSelectElement;
  if (!offHandSelect || !characterRep.twf) return;

  const mainIndex = mainSelect.value;
  offHandSelect.innerHTML = '';

  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'None';
  offHandSelect.appendChild(noneOption);

  const validOffIndices = new Set(
    characterRep.twf.combinations
      .filter(c => String(c.mainWeaponIndex) === mainIndex)
      .map(c => c.offWeaponIndex)
  );

  const weapons = characterRep.weapons || [];
  weapons.forEach((weapon, index) => {
    if (validOffIndices.has(index) && weapon && weapon.name) {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = weapon.name;
      offHandSelect.appendChild(option);
    }
  });
}

export function onFullAttackToggle(checkbox: HTMLInputElement) {
  showFullAttack = checkbox.checked;
  updateWeaponStatsDisplay();
}

export function onSneakAttackToggle(checkbox: HTMLInputElement) {
  showSneakAttack = checkbox.checked;
  updateWeaponStatsDisplay();
}

function hasTwfCombinations(): boolean {
  return Boolean(characterRep && characterRep.twf && characterRep.twf.combinations && characterRep.twf.combinations.length > 0);
}

function isTwfEnabled(): boolean {
  if (!hasTwfCombinations()) return false;
  if (characterRep?.docId !== lastTwfDocId) {
    lastTwfDocId = characterRep?.docId || null;
    showTwf = Boolean(characterRep?.twf?.hasTWF);
  } else if (showTwf === null) {
    showTwf = Boolean(characterRep?.twf?.hasTWF);
  }
  return showTwf;
}

export function onTwfToggle(checkbox: HTMLInputElement) {
  showTwf = checkbox.checked;
  if (!showTwf) {
    const offHandSelect = document.getElementById('offHandSelect') as HTMLSelectElement | null;
    if (offHandSelect) {
      offHandSelect.value = '';
    }
  }
  updateWeaponStatsDisplay();
}

function renderWeaponTogglesHtml(): string {
  const hasSneak = Boolean(characterRep && characterRep.sneakAttack && characterRep.sneakAttack.dice > 0);
  const sneakTitle = hasSneak ? ` title="Sneak Attack: ${characterRep.sneakAttack.string}"` : '';
  return `
    <label class="full-attack-toggle">
      <input type="checkbox" id="fullAttackToggle" onchange="onFullAttackToggle(this)" ${showFullAttack ? 'checked' : ''}>
      show full
    </label>
    ${showFullAttack ? '<button type="button" class="roll-all-attacks-btn" onclick="rollAllFullAttacks()" title="Roll all remaining attacks in this Full Attack sequence">🎲 Roll All</button>' : ''}
    ${hasSneak ? `
      <label class="full-attack-toggle"${sneakTitle}>
        <input type="checkbox" id="sneakAttackToggle" onchange="onSneakAttackToggle(this)" ${showSneakAttack ? 'checked' : ''}>
        sneak attack
      </label>
    ` : ''}
  `;
}

function renderWeaponStats(
  statsElement: HTMLElement,
  atkValue: string, dmgValue: string, critValue: string,
  atkTooltip: string, dmgTooltip: string,
  idPrefix: string,
  atkRolzRollMessage?: string,
  dmgRolzRollMessage?: string,
  warningText?: string | null
) {
  statsElement.innerHTML = `
    <div class="weapon-stat-item">
      <label>Attack:</label>
      <span id="${idPrefix}AtkValue">${atkValue}</span>
    </div>
    <div class="weapon-stat-item">
      <label>Damage:</label>
      <span id="${idPrefix}DmgValue">${dmgValue}</span>
      ${warningText ? `<span id="${idPrefix}WarningBadge" class="weapon-warning-badge" style="cursor:help; margin-left:4px;" title="${warningText}">⚠️</span>` : ''}
    </div>
    <div class="weapon-stat-item">
      <label>Crit:</label>
      <span id="${idPrefix}CritValue">${critValue}</span>
    </div>
    ${idPrefix === 'weapon' ? renderWeaponTogglesHtml() : ''}
  `;

  const atkEl = document.getElementById(`${idPrefix}AtkValue`);
  if (atkEl) {
    atkEl.dataset.attackMode = 'standard';
    atkEl.dataset.attackLabel = 'Weapon Attack';
  }
  addTooltip(atkEl, atkTooltip, atkRolzRollMessage);
  addTooltip(document.getElementById(`${idPrefix}DmgValue`), dmgTooltip, dmgRolzRollMessage);
  if (warningText) {
    addTooltip(document.getElementById(`${idPrefix}WarningBadge`), warningText);
  }
}

function updateWeaponStatsDisplay() {
  const mainSelect = document.getElementById('weaponSelect') as HTMLSelectElement;
  const offHandSelect = document.getElementById('offHandSelect') as HTMLSelectElement;
  const offHandRow = document.getElementById('offHandRow');
  const mainStats = document.getElementById('weaponCombinedStats');
  const offHandStats = document.getElementById('offHandStats');

  if (!mainSelect || !mainStats) return;

  const mainIdx = parseInt(mainSelect.value, 10);
  const offHandIdx = offHandSelect ? parseInt(offHandSelect.value, 10) : NaN;

  if (isNaN(mainIdx) || !characterRep.weapons || !characterRep.weapons[mainIdx]) {
    mainStats.innerHTML = '-';
    if (offHandRow) offHandRow.style.display = 'none';
    const twfToggleRow = document.getElementById('twfToggleRow');
    if (twfToggleRow) {
      twfToggleRow.style.display = 'none';
      twfToggleRow.innerHTML = '';
    }
    return;
  }

  const mainWeapon = characterRep.weapons[mainIdx];
  const twfEnabled = isTwfEnabled();
  const isTwfActive = twfEnabled && !isNaN(offHandIdx) && characterRep.weapons && characterRep.weapons[offHandIdx];

  const mainDmgValue = (showSneakAttack && mainWeapon.sneakDmgValue) ? mainWeapon.sneakDmgValue : mainWeapon.dmgValue;
  const mainDmgTooltip = (showSneakAttack && mainWeapon.sneakDamageString) ? mainWeapon.sneakDamageString : mainWeapon.damageBonus.string;
  const mainDmgRolz = (showSneakAttack && mainWeapon.sneakRolzDmgRollMessage) ? mainWeapon.sneakRolzDmgRollMessage : mainWeapon.rolzDmgRollMessage;

  const twfToggleRow = document.getElementById('twfToggleRow');
  if (twfToggleRow) {
    if (hasTwfCombinations()) {
      const twfTitle = characterRep?.twf?.hasTWF
        ? 'Two-Weapon Fighting feat'
        : 'Two-Weapon Fighting without feat (-4/-8 light off-hand, -6/-10 one-handed off-hand)';
      twfToggleRow.style.display = '';
      twfToggleRow.innerHTML = `
        <label class="full-attack-toggle" title="${twfTitle}">
          <input type="checkbox" id="twfToggle" onchange="onTwfToggle(this)" ${twfEnabled ? 'checked' : ''}>
          use second
        </label>
      `;
    } else {
      twfToggleRow.style.display = 'none';
      twfToggleRow.innerHTML = '';
    }
  }

  // 1. Show/hide off-hand row based on TWF and full attack settings
  if (offHandRow) {
    if (twfEnabled) {
      if (showFullAttack && isTwfActive) {
        offHandRow.style.display = 'none';
      } else {
        const hasValidOffHand = Array.from(offHandSelect?.options || []).some(opt => opt.value !== '');
        offHandRow.style.display = hasValidOffHand ? 'flex' : 'none';
      }
    } else {
      offHandRow.style.display = 'none';
    }
  }

  // 2. Render stats based on showFullAttack and isTwfActive
  if (showFullAttack) {
    if (isTwfActive) {
      const offWeapon = characterRep.weapons[offHandIdx];
      const offDmgValue = (showSneakAttack && offWeapon.sneakDmgValue) ? offWeapon.sneakDmgValue : offWeapon.dmgValue;
      const offDmgTooltip = (showSneakAttack && offWeapon.sneakDamageString) ? offWeapon.sneakDamageString : offWeapon.damageBonus.string;
      const offDmgRolz = (showSneakAttack && offWeapon.sneakRolzDmgRollMessage) ? offWeapon.sneakRolzDmgRollMessage : offWeapon.rolzDmgRollMessage;

      const combo = characterRep.twf.combinations.find(
        c => c.mainWeaponIndex === mainIdx && c.offWeaponIndex === offHandIdx
      );

      if (combo && combo.fullAttack) {
        const mainAttacksHtml = combo.fullAttack.mainAttacks.map((atk, i) =>
          `<span id="twfMainAtk${i}" class="multi-atk-span" title="Click to roll">${atk.atkValue}</span>`
        ).join(' / ');

        const offAttacksHtml = combo.fullAttack.offAttacks.map((atk, i) =>
          `<span id="twfOffAtk${i}" class="multi-atk-span" title="Click to roll">${atk.atkValue}</span>`
        ).join(' / ');

        const sneakTag = showSneakAttack && mainWeapon.sneakDmgValue ? ' (Sneak)' : '';

        mainStats.innerHTML = `
          <div class="weapon-stat-item">
            <label>TWF Full (${mainWeapon.name} / ${offWeapon.name})${sneakTag}:</label>
          </div>
          <div class="weapon-stat-item">
            <label>Main:</label>
            <span class="multi-atk-group">${mainAttacksHtml}</span>
            <span id="twfFullMainDmg" class="multi-dmg-val">(${mainDmgValue})</span>
            ${mainWeapon.additionalDamageWarning ? `<span id="twfMainWarningBadge" class="weapon-warning-badge" style="cursor:help; margin-left:4px;" title="${mainWeapon.additionalDamageWarning}">⚠️</span>` : ''}
          </div>
          <div class="weapon-stat-item">
            <label>Off:</label>
            <span class="multi-atk-group">${offAttacksHtml}</span>
            <span id="twfFullOffDmg" class="multi-dmg-val">(${offDmgValue})</span>
            ${offWeapon.additionalDamageWarning ? `<span id="twfOffWarningBadge" class="weapon-warning-badge" style="cursor:help; margin-left:4px;" title="${offWeapon.additionalDamageWarning}">⚠️</span>` : ''}
          </div>
          ${renderWeaponTogglesHtml()}
        `;

        combo.fullAttack.mainAttacks.forEach((atk, i) => {
          const el = document.getElementById(`twfMainAtk${i}`);
          if (el) {
            el.dataset.attackMode = 'full-round';
            el.dataset.attackLabel = `${mainWeapon.name} (MH #${i + 1})`;
            if (characterRep?.docId && getRoundState(characterRep.docId).rolledAttackIds.includes(el.id)) {
              el.classList.add('attack-rolled');
            }
          }
          addTooltip(el, atk.atkString, atk.rolzAtkRollMessage);
        });
        combo.fullAttack.offAttacks.forEach((atk, i) => {
          const el = document.getElementById(`twfOffAtk${i}`);
          if (el) {
            el.dataset.attackMode = 'full-round';
            el.dataset.attackLabel = `${offWeapon.name} (OH #${i + 1})`;
            if (characterRep?.docId && getRoundState(characterRep.docId).rolledAttackIds.includes(el.id)) {
              el.classList.add('attack-rolled');
            }
          }
          addTooltip(el, atk.atkString, atk.rolzAtkRollMessage);
        });
        addTooltip(document.getElementById('twfFullMainDmg'), mainDmgTooltip, mainDmgRolz);
        addTooltip(document.getElementById('twfFullOffDmg'), offDmgTooltip, offDmgRolz);
        if (mainWeapon.additionalDamageWarning) {
          addTooltip(document.getElementById('twfMainWarningBadge'), mainWeapon.additionalDamageWarning);
        }
        if (offWeapon.additionalDamageWarning) {
          addTooltip(document.getElementById('twfOffWarningBadge'), offWeapon.additionalDamageWarning);
        }
        return;
      }
    }

    if (mainWeapon.fullAttack && mainWeapon.fullAttack.attacks && mainWeapon.fullAttack.attacks.length > 0) {
      const attacksHtml = mainWeapon.fullAttack.attacks.map((atk, i) =>
        `<span id="weaponFullAtk${i}" class="multi-atk-span" title="Click to roll">${atk.atkValue}</span>`
      ).join(' / ');

      mainStats.innerHTML = `
        <div class="weapon-stat-item">
          <label>Attack:</label>
          <span class="multi-atk-group">${attacksHtml}</span>
        </div>
        <div class="weapon-stat-item">
          <label>Damage:</label>
          <span id="weaponDmgValue">${mainDmgValue}</span>
          ${mainWeapon.additionalDamageWarning ? `<span id="weaponWarningBadge" class="weapon-warning-badge" style="cursor:help; margin-left:4px;" title="${mainWeapon.additionalDamageWarning}">⚠️</span>` : ''}
        </div>
        <div class="weapon-stat-item">
          <label>Crit:</label>
          <span id="weaponCritValue">${mainWeapon.critValue}</span>
        </div>
        ${renderWeaponTogglesHtml()}
      `;

      mainWeapon.fullAttack.attacks.forEach((atk, i) => {
        const el = document.getElementById(`weaponFullAtk${i}`);
        if (el) {
          el.dataset.attackMode = 'full-round';
          el.dataset.attackLabel = `${mainWeapon.name} (#${i + 1})`;
          if (characterRep?.docId && getRoundState(characterRep.docId).rolledAttackIds.includes(el.id)) {
            el.classList.add('attack-rolled');
          }
        }
        addTooltip(el, atk.atkString, atk.rolzAtkRollMessage);
      });
      addTooltip(document.getElementById('weaponDmgValue'), mainDmgTooltip, mainDmgRolz);
      if (mainWeapon.additionalDamageWarning) {
        addTooltip(document.getElementById('weaponWarningBadge'), mainWeapon.additionalDamageWarning);
      }
    } else {
      renderWeaponStats(
        mainStats,
        mainWeapon.atkValue, mainDmgValue, mainWeapon.critValue,
        mainWeapon.attackBonus.string, mainDmgTooltip,
        'weapon',
        mainWeapon.rolzAtkRollMessage,
        mainDmgRolz,
        mainWeapon.additionalDamageWarning
      );
    }
  } else {
    if (isTwfActive) {
      const offWeapon = characterRep.weapons[offHandIdx];
      const offDmgValue = (showSneakAttack && offWeapon.sneakDmgValue) ? offWeapon.sneakDmgValue : offWeapon.dmgValue;
      const offDmgTooltip = (showSneakAttack && offWeapon.sneakDamageString) ? offWeapon.sneakDamageString : offWeapon.damageBonus.string;
      const offDmgRolz = (showSneakAttack && offWeapon.sneakRolzDmgRollMessage) ? offWeapon.sneakRolzDmgRollMessage : offWeapon.rolzDmgRollMessage;

      const combo = characterRep.twf.combinations.find(
        c => c.mainWeaponIndex === mainIdx && c.offWeaponIndex === offHandIdx
      );

      if (combo) {
        const mainAtkStr = (combo.mainAttackBonus >= 0 ? '+' : '') + combo.mainAttackBonus;
        const offAtkStr = (combo.offAttackBonus >= 0 ? '+' : '') + combo.offAttackBonus;

        renderWeaponStats(
          mainStats,
          mainAtkStr, mainDmgValue, mainWeapon.critValue,
          combo.mainAttackString, mainDmgTooltip,
          'weapon',
          `#d20${combo.mainAttackBonus >= 0 ? '+' : ''}${combo.mainAttackBonus} #${mainWeapon.name} Attack (MH)`,
          mainDmgRolz,
          mainWeapon.additionalDamageWarning
        );

        if (offHandStats) {
          renderWeaponStats(
            offHandStats,
            offAtkStr, offDmgValue, offWeapon.critValue,
            combo.offAttackString, offDmgTooltip,
            'offHand',
            `#d20${combo.offAttackBonus >= 0 ? '+' : ''}${combo.offAttackBonus} #${offWeapon.name} Attack (OH)`,
            offDmgRolz,
            offWeapon.additionalDamageWarning
          );
        }
      }
    } else {
      renderWeaponStats(
        mainStats,
        mainWeapon.atkValue, mainDmgValue, mainWeapon.critValue,
        mainWeapon.attackBonus.string, mainDmgTooltip,
        'weapon',
        mainWeapon.rolzAtkRollMessage,
        mainDmgRolz,
        mainWeapon.additionalDamageWarning
      );
      if (offHandStats) offHandStats.innerHTML = '-';
    }
  }
}

/**
 * Handles weapon selection change and updates the displayed stats in a unified string.
 */
export function onWeaponChange() {
  const mainSelect = document.getElementById('weaponSelect') as HTMLSelectElement;
  if (!mainSelect) return;

  const idx = parseInt(mainSelect.value, 10);
  if (!isNaN(idx) && characterRep?.weapons?.[idx]?.name) {
    selectedWeaponName = characterRep.weapons[idx].name;
  }

  if (hasTwfCombinations()) {
    populateOffHandDropdown();
  }
  updateAttacksOfOpportunityDisplay();

  updateWeaponStatsDisplay();
}

export function onOffHandChange() {
  updateWeaponStatsDisplay();
}

export function rollAllFullAttacks() {
  if (!characterRep?.docId) return;
  if (!characterRep.rolzRoomId) {
    alert('Rolz Room ID is not configured in your character sheet.');
    return;
  }

  const allSpans = Array.from(document.querySelectorAll('.multi-atk-span')) as HTMLElement[];
  const unrolled = allSpans.filter(el => el.dataset.rolzRollMessage && !el.classList.contains('attack-rolled'));
  const targets = unrolled.length > 0 ? unrolled : allSpans.filter(el => el.dataset.rolzRollMessage);

  if (targets.length === 0) {
    alert('No attack rolls available.');
    return;
  }

  const isFollowUp = getRoundState(characterRep.docId).fullAttackInProgress;
  if (!checkActionCostWithPrompt(characterRep.docId, 'full-round', { isFullAttackFollowUp: isFollowUp })) {
    return;
  }

  const results: string[] = [];
  const rollNext = (idx: number) => {
    if (idx >= targets.length) {
      alert(`🎲 Full Attack Results\n────────────────────────\n${results.join('\n')}`);
      return;
    }
    const el = targets[idx];
    const rollMsg = el.dataset.rolzRollMessage!;
    const label = el.dataset.attackLabel || `Attack ${idx + 1}`;

    // @ts-ignore
    google.script.run
      .withSuccessHandler((responseStr: string) => {
        try {
          const res = JSON.parse(responseStr);
          const item = res.message?.content?.items?.[0];
          if (item) {
            results.push(`• ${label}: ${item.result} ${item.details || ''}`.trim());
          } else {
            results.push(`• ${label}: (no result)`);
          }
        } catch {
          results.push(`• ${label}: (parse error)`);
        }
        const followUp = getRoundState(characterRep.docId).fullAttackInProgress;
        consumeActionCost(characterRep.docId, label, 'full-round', {
          isFullAttack: true,
          isFullAttackFollowUp: followUp,
          attackId: el.id
        });
        rollNext(idx + 1);
      })
      .withFailureHandler((err: any) => {
        alert(`Error rolling ${label}: ${err.message}`);
      })
      .PostRollToRolz(characterRep.rolzRoomId, rollMsg, characterRep.name);
  };

  rollNext(0);
}

