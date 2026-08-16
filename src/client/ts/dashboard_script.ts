import { characterRep } from './state';
import { onCharacterRepresentation, addTooltip, UpdateValueAndTooltip } from './character_script';

let showFullAttack = false;

/**
 * Converts duration from various time units to rounds
 * @param {number} duration - The duration value
 * @param {string} unit - The time unit ('rounds', 'minutes', or 'hours')
 * @returns {number} - Duration in rounds
 */
export function convertToRounds(duration, unit) {
  switch (unit) {
    case 'rounds':
      return duration;
    case 'minutes':
      return duration * 6; // 1 minute = 6 rounds
    case 'hours':
      return duration * 360; // 1 hour = 60 minutes = 360 rounds
    default:
      return duration; // Default to rounds if unknown unit
  }
}

export function NewStatus() {
  console.log('NewStatus for ' + characterRep.name);
  const statusesList = document.getElementById('statusesList');
  const emptyStatus = document.getElementById('emptyStatus') as HTMLElement;
  const clone = emptyStatus.cloneNode(true) as HTMLElement;
  clone.id = ''; // Clear the ID to avoid duplicates
  statusesList.insertBefore(clone, emptyStatus);

  (clone.querySelector('.status-name-input') as HTMLElement).style.display = 'inline-block';
  (clone.querySelector('.timed-controls') as HTMLElement).style.display = 'inline-flex';
  (clone.querySelector('.status-confirm-btn') as HTMLElement).style.display = 'inline-block';
  (clone.querySelector('.status-remove-btn') as HTMLElement).style.display = 'inline-block'; // Show remove for cancelling

  // Disable add button to prevent multiple new statuses
  (document.getElementById('addButton') as HTMLButtonElement).disabled = true;
}

export function AddStatus(button) {
  console.log('AddStatus for ' + characterRep.name);
  const statusDiv = button.closest('.status-item');
  const inputElem = statusDiv.querySelector('.status-name-input');

  if (inputElem.value.trim() === '') {
    alert('Please enter a valid status.');
    return; // Exit if the input is empty
  }

  const statusName = inputElem.value.trim();

  // Check if a status with this name already exists
  if (characterRep.statuses) {
    const existingStatus = characterRep.statuses.find(status =>
      status.name.toLowerCase() === statusName.toLowerCase()
    );

    if (existingStatus) {
      alert(`A status with the name "${statusName}" already exists.`);
      return; // Exit if duplicate found
    }
  }

  // Get the duration value and unit
  const durationInput = statusDiv.querySelector('.status-duration-input');
  const unitSelect = statusDiv.querySelector('.status-unit-select');
  const durationValue = durationInput ? parseInt(durationInput.value) || 1 : 1;
  const unit = unitSelect ? unitSelect.value : 'rounds';

  // Convert duration to rounds
  const durationInRounds = convertToRounds(durationValue, unit);

  // Call server function to add status
  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error adding status:', error);
      alert('Error adding status: ' + error.message);
    })
    .AddStatusToCharacter(characterRep.docId, statusName, durationInRounds);

  (document.getElementById('addButton') as HTMLButtonElement).disabled = false;
}

export function RemoveStatus(button, statusName) {
  const statusDiv = button.closest('.status-item');
  const confirmButton = statusDiv.querySelector('.status-confirm-btn');

  // If the confirm button exists and is visible, it's an unconfirmed row, so re-enable the add button.
  // If there's no confirm button, it means the status was already added, so we don't need to re-enable the add button.
  if (confirmButton && confirmButton.style.display !== 'none') {
    (document.getElementById('addButton') as HTMLButtonElement).disabled = false;
    statusDiv.remove();
    console.log('RemoveStatus for unconfirmed status');
    return;
  }

  // If we have a status name, call the server to remove it
  if (statusName) {
    google.script.run
      .withSuccessHandler(onCharacterRepresentation)
      .withFailureHandler(function (error) {
        console.error('Error removing status:', error);
        alert('Error removing status: ' + error.message);
      })
      .RemoveStatusFromCharacter(characterRep.docId, statusName);
  } else {
    // Fallback for cases where statusName is not provided
    statusDiv.remove();
    console.log('RemoveStatus for ' + characterRep.name);
  }
}

export function ClearAllStatuses() {
  if (!confirm('Are you sure you want to clear all active statuses?')) {
    return;
  }
  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error clearing statuses:', error);
      alert('Error clearing statuses: ' + error.message);
    })
    .RemoveAllStatusesFromCharacter(characterRep.docId);
}

export function PromprForPositiveInteger(message) {
  const amount = prompt(message, '1');

  // Check if user cancelled or entered invalid input
  if (amount === null || amount === '') {
    return { error: true, message: 'User cancelled' };
  }
  const result = parseInt(amount);
  if (Number.isNaN(result) || result <= 0) {
    alert('Please enter a valid positive integer.');
    return { error: true, message: 'invalid input' };
  }

  return { error: false, result: result };
}

/**
 * Inflicts damage on the character
 * Prompts user for damage amount and calls server function
 */
export function inflict() {
  // Prompt user for damage amount
  const promptResult = PromprForPositiveInteger(`How much damage to inflict on ${characterRep.name}?`);

  if (promptResult.error) {
    alert(promptResult.message);
    return;
  }
  const damageAmount = promptResult.result;

  console.log(`Inflicting ${damageAmount} damage to ${characterRep.name}`);

  // Call server-side function to inflict damage
  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error calling server function:', error);
      alert('Error inflicting damage: ' + error.message);
    })
    .UpdateHp(characterRep.docId, damageAmount, 'inflict');
}

export function cure() {
  const promptResult = PromprForPositiveInteger(`How much damage to cure on ${characterRep.name}?`);
  if (promptResult.error) {
    alert(promptResult.message);
    return;
  }
  const damageAmount = promptResult.result;

  console.log(`Curing ${damageAmount} damage to ${characterRep.name}`);

  // Call server-side function to inflict damage
  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error calling server function:', error);
      alert('Error curing damage: ' + error.message);
    })
    .UpdateHp(characterRep.docId, damageAmount, 'cure');
}

export function refreshCharacterData() {
  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error refreshing character data:', error);
    })
    .GetCharacterRepByDocId(characterRep.docId);

  // Update initiative, AC, attack bonus, and damage bonus
  document.getElementById('initBonus').innerHTML = characterRep.initBonus || '-';
  document.getElementById('acValue').innerHTML = characterRep.ac.currentScore || '-';

  console.log('Character data refreshed successfully');
}

/**
 * Handles the time passed button click
 */
export function onTimePassed() {
  const amountInput = document.querySelector('.time-amount-input');
  const unitSelect = document.querySelector('.time-unit-select');

  const amount = amountInput ? parseInt((amountInput as HTMLInputElement).value) || 1 : 1;
  const unit = unitSelect ? (unitSelect as HTMLSelectElement).value : 'rounds';

  // Convert to rounds before sending to server
  const roundsElapsed = convertToRounds(amount, unit);

  console.log(`Time passing: ${amount} ${unit} (${roundsElapsed} rounds)`);

  // Call server function to handle time elapsed
  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error processing time elapsed:', error);
      alert('Error processing time elapsed: ' + error.message);
    })
    .OnRoundsElapsed(characterRep.docId, roundsElapsed);

  // Reset the input fields to default values
  if (amountInput) {
    (amountInput as HTMLInputElement).value = '1';
  }
  if (unitSelect) {
    (unitSelect as HTMLSelectElement).value = 'rounds';
  }
}

/**
 * Populates the weapon dropdown with available weapons
 */
export function populateWeaponDropdown() {
  const weaponSelect = document.getElementById('weaponSelect');
  const weapons = characterRep.weapons || [];

  // Clear existing options
  weaponSelect.innerHTML = '';

  if (weapons.length === 0) {
    weaponSelect.innerHTML = '<option value="">No weapons available</option>';
    return;
  }

  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a weapon...';
  weaponSelect.appendChild(defaultOption);

  // Add weapon options
  weapons.forEach((weapon, index) => {
    if (weapon && weapon.name) {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = weapon.name;
      weaponSelect.appendChild(option);
    }
  });

  // Select first weapon by default if available
  if (weapons.length > 0) {
    // If the first weapon is "Unarmed" and there are other weapons, select the first regular weapon
    if (weapons[0].name === 'Unarmed' && weapons.length > 1) {
      (weaponSelect as HTMLSelectElement).value = '1';
    } else {
      (weaponSelect as HTMLSelectElement).value = '0';
    }
    onWeaponChange();
  }
}

/**
 * Populates the off-hand weapon dropdown with melee weapons, excluding the main-hand selection.
 */
function populateOffHandDropdown() {
  const offHandSelect = document.getElementById('offHandSelect') as HTMLSelectElement;
  const mainSelect = document.getElementById('weaponSelect') as HTMLSelectElement;
  if (!offHandSelect || !characterRep.twf) return;

  const mainIndex = mainSelect.value;
  offHandSelect.innerHTML = '';

  // Add "None" option
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'None';
  offHandSelect.appendChild(noneOption);

  // Add weapons that appear as valid off-hand in at least one TWF combination
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

/**
 * Toggles the full attack representation display.
 */
export function onFullAttackToggle(checkbox: HTMLInputElement) {
  showFullAttack = checkbox.checked;
  updateWeaponStatsDisplay();
}

/**
 * Renders weapon stats into a stats element (shared between main-hand and off-hand).
 */
function renderWeaponStats(
  statsElement: HTMLElement,
  atkValue: string, dmgValue: string, critValue: string,
  atkTooltip: string, dmgTooltip: string,
  idPrefix: string,
  atkRolzRollMessage?: string,
  dmgRolzRollMessage?: string
) {
  statsElement.innerHTML = `
    <div class="weapon-stat-item">
      <label>Attack:</label>
      <span id="${idPrefix}AtkValue">${atkValue}</span>
    </div>
    <div class="weapon-stat-item">
      <label>Damage:</label>
      <span id="${idPrefix}DmgValue">${dmgValue}</span>
    </div>
    <div class="weapon-stat-item">
      <label>Crit:</label>
      <span id="${idPrefix}CritValue">${critValue}</span>
    </div>
    ${idPrefix === 'weapon' ? `
      <label class="full-attack-toggle">
        <input type="checkbox" id="fullAttackToggle" onchange="onFullAttackToggle(this)" ${showFullAttack ? 'checked' : ''}>
        show full
      </label>
    ` : ''}
  `;

  addTooltip(document.getElementById(`${idPrefix}AtkValue`), atkTooltip, atkRolzRollMessage);
  addTooltip(document.getElementById(`${idPrefix}DmgValue`), dmgTooltip, dmgRolzRollMessage);
}

/**
 * Dynamically updates the weapon display based on selections and showFullAttack state.
 */
function updateWeaponStatsDisplay() {
  const mainSelect = document.getElementById('weaponSelect') as HTMLSelectElement;
  const offHandSelect = document.getElementById('offHandSelect') as HTMLSelectElement;
  const mainStats = document.getElementById('weaponCombinedStats');
  const offHandStats = document.getElementById('offHandStats');
  const offHandRow = document.getElementById('offHandRow');

  if (!mainSelect || !mainStats) return;

  const mainIdx = parseInt(mainSelect.value);
  if (isNaN(mainIdx) || !characterRep.weapons || !characterRep.weapons[mainIdx]) {
    mainStats.innerHTML = '-';
    if (offHandStats) offHandStats.innerHTML = '-';
    if (offHandRow) offHandRow.style.display = 'none';
    return;
  }

  const mainWeapon = characterRep.weapons[mainIdx];
  const offHandIdx = offHandSelect ? parseInt(offHandSelect.value) : NaN;
  const isTwfActive = !isNaN(offHandIdx) && characterRep.weapons && characterRep.weapons[offHandIdx];

  // 1. Show/hide off-hand row based on TWF and full attack settings
  if (offHandRow) {
    if (characterRep.twf && characterRep.twf.hasTWF) {
      if (showFullAttack && isTwfActive) {
        offHandRow.style.display = 'none';
      } else {
        offHandRow.style.display = '';
      }
    } else {
      offHandRow.style.display = 'none';
    }
  }

  // 2. Render weapon stats based on showFullAttack
  if (showFullAttack) {
    if (isTwfActive) {
      // Unified TWF Full Attack Display
      const offWeapon = characterRep.weapons[offHandIdx];
      const combo = characterRep.twf.combinations.find(
        (c: any) => c.mainWeaponIndex === mainIdx && c.offWeaponIndex === offHandIdx
      );

      const mhSequence = mainWeapon.fullAttack?.twfMain?.[offHandIdx] || { attacks: [], summaryString: '-' };
      const ohSequence = offWeapon.fullAttack?.twfOff?.[mainIdx] || { attacks: [], summaryString: '-' };

      const mhSpans = mhSequence.attacks.map((a: any, idx: number) => `<span id="mhAtkValue_${idx}" class="multi-atk-span">${a.atkValue}</span>`).join('/');
      const ohSpans = ohSequence.attacks.map((a: any, idx: number) => `<span id="ohAtkValue_${idx}" class="multi-atk-span">${a.atkValue}</span>`).join('/');

      mainStats.innerHTML = `
        <div class="weapon-twf-full-container">
          <div class="weapon-row-full main-hand-full">
            <span class="weapon-hand-label">MH ${mainWeapon.name}:</span>
            <div class="weapon-stat-item">
              <label>Attack:</label>
              <span class="weapon-atk-value-multi">${mhSpans}</span>
            </div>
            <div class="weapon-stat-item">
              <label>Damage:</label>
              <span id="mhDmgValue">${mainWeapon.dmgValue}</span>
            </div>
            <div class="weapon-stat-item">
              <label>Crit:</label>
              <span id="mhCritValue">${mainWeapon.critValue}</span>
            </div>
          </div>
          <div class="weapon-row-full off-hand-full">
            <span class="weapon-hand-label">OH ${offWeapon.name}:</span>
            <div class="weapon-stat-item">
              <label>Attack:</label>
              <span class="weapon-atk-value-multi">${ohSpans}</span>
            </div>
            <div class="weapon-stat-item">
              <label>Damage:</label>
              <span id="ohDmgValue">${combo ? combo.offDmgValue : offWeapon.dmgValue}</span>
            </div>
            <div class="weapon-stat-item">
              <label>Crit:</label>
              <span id="ohCritValue">${offWeapon.critValue}</span>
            </div>
          </div>
          <label class="full-attack-toggle">
            <input type="checkbox" id="fullAttackToggle" onchange="onFullAttackToggle(this)" checked>
            show full
          </label>
        </div>
      `;

      // Apply tooltips for MH
      mhSequence.attacks.forEach((a: any, idx: number) => {
        addTooltip(document.getElementById(`mhAtkValue_${idx}`), a.tooltip, a.rolzAtkRollMessage);
      });
      addTooltip(document.getElementById('mhDmgValue'), mainWeapon.damageBonus.string, mhSequence.attacks[0]?.rolzDmgRollMessage);

      // Apply tooltips for OH
      ohSequence.attacks.forEach((a: any, idx: number) => {
        addTooltip(document.getElementById(`ohAtkValue_${idx}`), a.tooltip, a.rolzAtkRollMessage);
      });
      addTooltip(document.getElementById('ohDmgValue'), combo ? combo.offDamageString : offWeapon.damageBonus.string, ohSequence.attacks[0]?.rolzDmgRollMessage);

    } else {
      // Normal/Single Weapon Full Attack Display
      const sequence = mainWeapon.fullAttack?.normal || { attacks: [], summaryString: '-' };
      const spans = sequence.attacks.map((a: any, idx: number) => `<span id="normalAtkValue_${idx}" class="multi-atk-span">${a.atkValue}</span>`).join('/');

      mainStats.innerHTML = `
        <div class="weapon-stat-item">
          <label>Attack:</label>
          <span class="weapon-atk-value-multi">${spans}</span>
        </div>
        <div class="weapon-stat-item">
          <label>Damage:</label>
          <span id="weaponDmgValue">${mainWeapon.dmgValue}</span>
        </div>
        <div class="weapon-stat-item">
          <label>Crit:</label>
          <span id="weaponCritValue">${mainWeapon.critValue}</span>
        </div>
        <label class="full-attack-toggle">
          <input type="checkbox" id="fullAttackToggle" onchange="onFullAttackToggle(this)" checked>
          show full
        </label>
      `;

      sequence.attacks.forEach((a: any, idx: number) => {
        addTooltip(document.getElementById(`normalAtkValue_${idx}`), a.tooltip, a.rolzAtkRollMessage);
      });
      addTooltip(document.getElementById('weaponDmgValue'), mainWeapon.damageBonus.string, sequence.attacks[0]?.rolzDmgRollMessage);
    }
  } else {
    // Single Attack Display (Normal / TWF separate)
    if (isTwfActive) {
      // Show main-hand stats
      const offWeapon = characterRep.weapons[offHandIdx];
      const combo = characterRep.twf.combinations.find(
        (c: any) => c.mainWeaponIndex === mainIdx && c.offWeaponIndex === offHandIdx
      );

      if (combo) {
        renderWeaponStats(
          mainStats,
          combo.mainAtkValue, mainWeapon.dmgValue, mainWeapon.critValue,
          combo.mainAttackString, mainWeapon.damageBonus.string,
          'weapon',
          `#d20${combo.mainAttackBonus >= 0 ? '+' : ''}${combo.mainAttackBonus} #${mainWeapon.name} Attack (MH)`,
          mainWeapon.rolzDmgRollMessage
        );
        if (offHandStats && offWeapon) {
          renderWeaponStats(
            offHandStats,
            combo.offAtkValue, combo.offDmgValue, offWeapon.critValue,
            combo.offAttackString, combo.offDamageString,
            'offHand',
            `#d20${combo.offAttackBonus >= 0 ? '+' : ''}${combo.offAttackBonus} #${offWeapon.name} Attack (OH)`,
            `#${combo.offDmgValue.replace(/\s+/g, '').replace(/[+-]0$/, '')} #${offWeapon.name} Damage (OH)`
          );
        }
      }
    } else {
      // Normal single weapon stats
      renderWeaponStats(
        mainStats,
        mainWeapon.atkValue, mainWeapon.dmgValue, mainWeapon.critValue,
        mainWeapon.attackBonus.string, mainWeapon.damageBonus.string,
        'weapon',
        mainWeapon.rolzAtkRollMessage,
        mainWeapon.rolzDmgRollMessage
      );
      if (offHandStats) offHandStats.innerHTML = '-';
    }
  }
}

/**
 * Handles weapon selection change and updates the displayed stats in a unified string
 */
export function onWeaponChange() {
  const mainSelect = document.getElementById('weaponSelect') as HTMLSelectElement;
  if (!mainSelect) return;

  // Update off-hand dropdown choices
  if (characterRep.twf && characterRep.twf.hasTWF) {
    populateOffHandDropdown();
  }

  updateWeaponStatsDisplay();
}

/**
 * Handles off-hand weapon selection change.
 */
export function onOffHandChange() {
  updateWeaponStatsDisplay();
}

/**
 * Populates the special attack dropdown with available special attacks
 */
export function populateSpecialAttackDropdown() {
  const specialAttackSelect = document.getElementById('specialAttackSelect');
  const specialAttacks = characterRep.specialAttacks || {};

  console.log('Populating special attack dropdown with attacks:', specialAttacks);

  // Clear existing options
  specialAttackSelect.innerHTML = '';

  const attackNames = Object.keys(specialAttacks);
  if (attackNames.length === 0) {
    specialAttackSelect.innerHTML = '<option value="">No special attacks available</option>';
    return;
  }

  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a special attack...';
  specialAttackSelect.appendChild(defaultOption);

  // Add special attack options
  attackNames.forEach(attackName => {
    const option = document.createElement('option');
    option.value = attackName;
    option.textContent = attackName;
    specialAttackSelect.appendChild(option);
  });

  // Select first special attack by default if available
  if (attackNames.length > 0) {
    (specialAttackSelect as HTMLSelectElement).value = attackNames[0];
    onWeaponChange(); // should this be onSpecialAttackChange? keeping original logic
    onSpecialAttackChange();
  }
}

/**
 * Handles special attack selection change and updates the displayed bonus
 */
export function onSpecialAttackChange() {
  const specialAttackSelect = document.getElementById('specialAttackSelect');
  const selectedAttack = (specialAttackSelect as HTMLSelectElement).value;

  console.log('Special attack changed to:', selectedAttack);

  if (selectedAttack === '' || !characterRep.specialAttacks || !characterRep.specialAttacks[selectedAttack]) {
    document.getElementById('specialAttackBonus').innerHTML = '-';
    return;
  }

  const selectedSpecialAttack = characterRep.specialAttacks[selectedAttack];

  // Update bonus
  UpdateValueAndTooltip('specialAttackBonus', selectedSpecialAttack);
}

/**
 * Party Modal Functions
 */
export function showPartyModal() {
  if (!characterRep || !characterRep.partyName) return;

  console.log(`Quick Statuses for ${characterRep.partyName}:`, characterRep.quickStatuses);

  const titleEl = document.getElementById('partyModalTitle');
  if (characterRep.partiesDocId) {
    titleEl.innerHTML = `<a href="https://docs.google.com/document/d/${characterRep.partiesDocId}/edit" target="_blank" style="color: inherit; text-decoration: underline;">${characterRep.partyName}</a>`;
  } else {
    titleEl.innerText = characterRep.partyName;
  }

  const list = document.getElementById('partyModalList');
  list.innerHTML = '';

  // Add all party members
  if (characterRep.partyMembers && characterRep.partyMembers.length > 0) {
    characterRep.partyMembers.forEach(member => {
      const li = document.createElement('li');
      li.style.padding = '8px 0';
      li.style.borderBottom = '1px solid #eee';

      // Highlight current character's line
      if (member === characterRep.name) {
        li.style.fontWeight = 'bold';
        li.innerHTML = `${member} (You)`;
      } else {
        li.innerText = member;
      }
      list.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.innerText = 'No members discovered.';
    list.appendChild(li);
  }

  document.getElementById('partyModal').style.display = 'block';
}

export function closePartyModal() {
  document.getElementById('partyModal').style.display = 'none';
}

// Close the modal when clicking outside of it
window.addEventListener('click', function (event) {
  const modal = document.getElementById('partyModal');
  if (event.target == modal) {
    modal.style.display = 'none';
  }
});
