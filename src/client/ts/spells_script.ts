/**
 * Import type definitions from common types
 * @typedef {import('../../server/types').SpellSlotData} SpellSlotData
 */

import { characterRep } from './state';
import { onCharacterRepresentation } from './character_script';

export function renderSpellsUI() {
  const container = document.getElementById('spellsDynamicContainer');
  container.innerHTML = '';

  if (!characterRep || !characterRep.spellCasting || !characterRep.spellCasting.classSpellCastingData) {
    container.innerHTML = '<div>No spellcasting available.</div>';
    return;
  }

  const spellCastingData = characterRep.spellCasting.classSpellCastingData;

  // Display each spellcasting class
  spellCastingData.forEach(casterClassData => {
    const classDiv = document.createElement('div');
    classDiv.className = 'spellcasting-class';

    let classTitle = `${casterClassData.className} (Level ${casterClassData.level})`;
    if (casterClassData.domains && casterClassData.domains.length > 0) {
      classTitle += ` - Domains: ${casterClassData.domains.join(', ')}`;
    }

    classDiv.innerHTML = `
            <h3>${classTitle}</h3>
            <div class="spell-slots-container">
                ${renderSpellSlots(casterClassData.spellSlots, casterClassData.preparedSpells, casterClassData.className, casterClassData.preparation)}
            </div>
        `;

    container.appendChild(classDiv);
  });
}

export function renderSpellSlots(spellSlots, preparedSpells = {}, className = '', preparation = 'Prepared') {
  let html = '';

  const levelsToRender: (number | string)[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  if (preparedSpells['songs']) {
    levelsToRender.push('songs');
  }

  for (const level of levelsToRender) {
    // @ts-ignore - TS thinks level is exclusively number, but we added 'songs' strings to it
    const expectedSlots = spellSlots[level] || 0;
    const levelPreparedSpells = preparedSpells[level] || [];
    const preparedSpellsCount = levelPreparedSpells.length;

    // Check for domain spells (only for clerics and levels > 0)
    const domainKey = `${level} - domain`;
    const isNumericLevel = typeof level === 'number';
    const domainSpells = (className === 'Cleric' && isNumericLevel && level > 0) ? (preparedSpells[domainKey] || []) : [];
    const hasDomainSlot = className === 'Cleric' && isNumericLevel && level > 0;
    const expectedDomainSlots = hasDomainSlot ? 1 : 0;
    const preparedDomainSpellsCount = domainSpells.length;

    const slotsToRender = preparedSpellsCount;
    let showDiscrepancyAlert = false;
    let discrepancyMsg = '';

    // Discrepancy logic for normal slots
    if (String(level) !== 'songs' && (expectedSlots > 0 || slotsToRender > 0) && slotsToRender !== expectedSlots) {
      showDiscrepancyAlert = true;
      const slotType = preparation === 'Spontaneous' ? 'spontaneous slots' : 'prepared spells';
      discrepancyMsg = `⚠ Discrepancy! Level ${level} has ${slotsToRender} ${slotType}, but ${expectedSlots} spell slots!`;
    }

    // Domain discrepancy logic
    if (hasDomainSlot && preparedDomainSpellsCount !== expectedDomainSlots) {
      showDiscrepancyAlert = true;
      discrepancyMsg += discrepancyMsg ? '<br>' : '';
      discrepancyMsg += `⚠ Discrepancy! Level ${level} has ${preparedDomainSpellsCount} prepared domain spells, but 1 was expected!`;
    }

    const shouldRenderLevel = slotsToRender > 0 || expectedSlots > 0 || preparedDomainSpellsCount > 0;

    if (shouldRenderLevel) {
      const levelHeader = String(level) === 'songs'
        ? `Songs (${slotsToRender} uses)`
        : `Level ${level} Spells (${expectedSlots} slot${expectedSlots !== 1 ? 's' : ''}${hasDomainSlot ? ' + 1 domain' : ''})`;

      html += `
                <div class="spell-level-slots">
                    <h4>${levelHeader}</h4>`;

      if (showDiscrepancyAlert) {
        html += `
                    <div class="discrepancy-alert" style="color: darkorange; font-size: 0.9em; margin-bottom: 5px; font-weight: bold;">
                        ${discrepancyMsg}
                    </div>`;
      }

      html += `
                    <div class="spell-slot-grid">
                        ${Array(slotsToRender).fill(0).map((_, index) => {
        const spellData = levelPreparedSpells[index];
        const isEmpty = !spellData || spellData.isEmpty;

        // Handle both old format (string) and new format (object with spell and used properties)
        let spellName = '';
        let isUsed = false;

        if (spellData) {
          if (typeof spellData === 'string') {
            spellName = spellData;
          } else if (typeof spellData === 'object' && spellData.spell) {
            spellName = spellData.spell;
            isUsed = spellData.used || false;
          }
        }

        let isSpontaneousEmpty = false;
        if (preparation === 'Spontaneous' && typeof spellName === 'string') {
          if (spellName.toLowerCase().startsWith('spontaneous')) {
            if (!isUsed) {
              isSpontaneousEmpty = true;
            }
          }
        }

        const slotClass = (isEmpty || isSpontaneousEmpty) ? 'empty' : 'filled';
        const usedClass = isUsed ? 'used' : '';
        const displayText = (isEmpty || isSpontaneousEmpty) ? '' : spellName;

        return `<div class="spell-slot ${slotClass} ${usedClass}" data-level="${level}" data-slot="${index}" data-spell="${spellName}" data-used="${isUsed}" data-class="${className}" data-preparation="${preparation}" title="${spellName || 'Empty slot'}">${displayText}</div>`;
      }).join('')}
                        ${hasDomainSlot ? (() => {
          let domainHtml = '';
          const domainSlotsToRender = Math.max(1, preparedDomainSpellsCount);

          for (let d = 0; d < domainSlotsToRender; d++) {
            const domainSpellData = domainSpells[d];
            const isEmpty = !domainSpellData || domainSpellData.isEmpty;

            // Handle both old format (string) and new format (object with spell and used properties)
            let domainSpellName = '';
            let domainIsUsed = false;

            if (domainSpellData) {
              if (typeof domainSpellData === 'string') {
                domainSpellName = domainSpellData;
              } else if (typeof domainSpellData === 'object' && domainSpellData.spell) {
                domainSpellName = domainSpellData.spell;
                domainIsUsed = domainSpellData.used || false;
              }
            }

            const domainSlotClass = isEmpty ? 'empty' : 'filled';
            const domainUsedClass = domainIsUsed ? 'used' : '';
            const domainDisplayText = isEmpty ? '' : domainSpellName;

            domainHtml += `
                               <div class="spell-slot-separator"></div>
                               <div class="spell-slot domain-slot ${domainSlotClass} ${domainUsedClass}" data-level="${level}" data-slot="${d}" data-spell="${domainSpellName}" data-used="${domainIsUsed}" data-class="${className}" data-preparation="${preparation}" title="${domainSpellName || 'Empty domain slot'}">${domainDisplayText}</div>
                           `;
          }
          return domainHtml;
        })() : ''}
                    </div>
                </div>
            `;
    }
  }

  return html || '<div>No spell slots available at all.</div>';
}

export function PrepareSpellsUI() {
  renderSpellsUI();
  initializeSpellSlotHandlers();
}

/**
 * @typedef {Object} UISlotData
 * @property {number} level - The level of the spell
 * @property {number} slot - The slot number
 * @property {string} spell - The spell name
 * @property {boolean} isUsed - Whether the spell is used
 * @property {boolean} isEmpty - Whether the slot is empty
 * @property {boolean} isDomain - Whether the slot is a domain slot
 * @property {string} casterClass - The name of the caster class
 * @property {string} preparation - The spell preparation type (Prepared/Spontaneous)
 */


/**
 * @param {UISlotData} uiSlotData - The UI slot data
 * @returns {SpellSlotData} - The slot data
 */
export function slotDataFromUISlotData(uiSlotData) {
  /**
     * @type {SpellSlotData}
     */
  const slotData = {
    casterClassName: uiSlotData.casterClass,
    spellLevel: String(uiSlotData.level) + (uiSlotData.isDomain ? ' - domain' : ''),
    spellName: uiSlotData.spell,
    isUsed: uiSlotData.isUsed,
    isEmpty: uiSlotData.isEmpty,
    slotIndex: uiSlotData.slot
  };
  return slotData;
}

export function initializeSpellSlotHandlers() {
  // Add click handlers to all spell slots
  document.addEventListener('click', function (event) {
    if (!(event.target instanceof HTMLElement)) return;
    const target = event.target;
    if (target.classList.contains('spell-slot')) {
      event.preventDefault();
      event.stopPropagation();

      /**
             * @type {UISlotData}
             */
      const uiSlotData = {
        level: parseInt(target.dataset.level),
        slot: parseInt(target.dataset.slot),
        spell: target.dataset.spell || '',
        isUsed: target.dataset.used === 'true',
        isEmpty: target.classList.contains('empty'),
        isDomain: target.classList.contains('domain-slot'),
        casterClass: target.dataset.class || '',
        preparation: target.dataset.preparation || 'Prepared'
      };

      showSpellPopup(target, uiSlotData);
    }
  });

  // Close popup when clicking outside
  document.addEventListener('click', function (event) {
    if (!(event.target instanceof HTMLElement)) return;
    if (!event.target.closest('.spell-popup') && !event.target.classList.contains('spell-slot')) {
      hideSpellPopup();
    }
  });
}

/**
 * @param {HTMLElement} targetElement - The target element that was clicked
 * @param {UISlotData} uiSlotData - The slot data
*/
export function showSpellPopup(targetElement, uiSlotData) {
  // Hide any existing popup
  hideSpellPopup();

  // Store slot data globally for access in prepareSpell/castSpell
  const slotData: any = {
    casterClassName: uiSlotData.casterClass,
    spellLevel: String(uiSlotData.level) + (uiSlotData.isDomain ? ' - domain' : ''),
    slotIndex: uiSlotData.slot
  };

  // If it's a cast menu, also store the spell name
  if (!uiSlotData.isEmpty) {
    slotData.spellName = uiSlotData.spell;
  }

  window.currentSlotData = slotData;
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'spell-popup-overlay show';
  document.body.appendChild(overlay);

  // Create popup
  const popup = document.createElement('div');
  popup.className = 'spell-popup show';

  if (uiSlotData.isEmpty) {
    if (uiSlotData.preparation === 'Spontaneous') {
      // Empty slot for Spontaneous caster - show spontaneous cast menu
      popup.innerHTML = createSpontaneousCastMenu(uiSlotData);
    } else {
      // Empty slot for Prepared caster - show prepare menu
      popup.innerHTML = createPrepareMenu(uiSlotData);
    }
  } else {
    // Filled slot - show cast menu
    popup.innerHTML = createCastMenu(uiSlotData);
  }

  document.body.appendChild(popup);

  // Position popup near the clicked element
  positionPopup(popup, targetElement);

  // Add event listeners
  setupPopupEventListeners(popup, uiSlotData);
}

export function createPrepareMenu(slotData) {
  const maxLevel = slotData.level;
  const className = getCurrentSpellcastingClass();

  return `
        <h3>Prepare Spell - Level ${slotData.level}${slotData.isDomain ? ' Domain' : ''}</h3>
        <div class="spell-info">
            <strong>Slot:</strong> Level ${slotData.level}${slotData.isDomain ? ' Domain' : ''} - Slot ${slotData.slot}
        </div>
        
        <div class="level-filters">
            <h4>Filter by Level:</h4>
            <div class="filter-checkboxes">
                ${Array.from({ length: maxLevel + 1 }, (_, i) => {
    // Skip level 0 for domain slots
    if (slotData.isDomain && i === 0) {
      return '';
    }
    return `
                        <label class="filter-checkbox">
                            <input type="checkbox" value="${i}" ${i === maxLevel ? 'checked' : ''}>
                            Level ${i}
                        </label>
                    `;
  }).join('')}
            </div>
        </div>
        
        <div class="spell-dropdown">
            <select id="spellSelect">
                <option value="">Select a spell...</option>
                ${generateSpellOptions(className, slotData.level, slotData.isDomain, [slotData.level])}
            </select>
        </div>
        
        <div class="spell-actions">
            <button class="spell-button cancel" onclick="window.hideSpellPopup()">Cancel</button>
            <button class="spell-button prepare disabled" onclick="window.prepareSpell()" disabled>Prepare</button>
        </div>
    `;
}

export function createSpontaneousCastMenu(slotData) {
  const maxLevel = isNaN(slotData.level) ? 0 : slotData.level; // fallback for non-numeric levels like 'songs'
  const className = getCurrentSpellcastingClass();

  const isSong = slotData.level === 'songs';
  const titleText = isSong ? 'Cast Song' : `Cast Spell - Level ${slotData.level}${slotData.isDomain ? ' Domain' : ''}`;
  const slotText = isSong ? `Use ${slotData.slot + 1}` : `Level ${slotData.level}${slotData.isDomain ? ' Domain' : ''} - Slot ${slotData.slot}`;
  const typeText = isSong ? 'Bardic Song' : 'Spontaneous';

  return `
        <h3>${titleText}</h3>
        <div class="spell-info">
            <strong>Slot:</strong> ${slotText}
            <br><strong>Type:</strong> ${typeText}
        </div>
        
        <div class="level-filters" ${isSong ? 'style="display:none;"' : ''}>
            <h4>Filter by Level:</h4>
            <div class="filter-checkboxes">
                ${Array.from({ length: maxLevel + 1 }, (_, i) => {
    // Skip level 0 for domain slots
    if (slotData.isDomain && i === 0) {
      return '';
    }
    return `
                        <label class="filter-checkbox">
                            <input type="checkbox" value="${i}" ${i === maxLevel ? 'checked' : ''}>
                            Level ${i}
                        </label>
                    `;
  }).join('')}
            </div>
        </div>
        
        <div class="spell-dropdown">
            <select id="spellSelect">
                <option value="">Select a spell...</option>
                ${generateSpellOptions(className, slotData.level, slotData.isDomain, [slotData.level])}
            </select>
        </div>
        
        <div class="spell-actions">
            <button class="spell-button cancel" onclick="window.hideSpellPopup()">Cancel</button>
            <button class="spell-button cast disabled" onclick="window.castSpell()" disabled>Cast</button>
        </div>
    `;
}

export function createCastMenu(slotData) {
  const isUsed = slotData.isUsed || false;
  const castButtonDisabled = isUsed ? 'disabled' : '';
  const castButtonClass = isUsed ? 'spell-button cast disabled' : 'spell-button cast';

  return `
        <h3>Cast Spell</h3>
        <div class="spell-info">
            <strong>Spell:</strong> ${slotData.spell}
            <br><strong>Level:</strong> ${slotData.level}${slotData.isDomain ? ' Domain' : ''}
            <br><strong>Slot:</strong> ${slotData.slot}
            ${isUsed ? '<br><strong>Status:</strong> <span style="color: var(--text-muted); text-decoration: line-through;">Used</span>' : ''}
        </div>
        
        <div class="spell-actions">
            <button class="spell-button cancel" onclick="window.hideSpellPopup()">Cancel</button>
            <button class="${castButtonClass}" onclick="window.castSpell()" ${castButtonDisabled}>Cast</button>
        </div>
    `;
}

export function generateSpellOptions(className, maxLevel, isDomain, selectedLevels = null) {
  if (!characterRep || !characterRep.spellCasting || !characterRep.spellCasting.classSpellCastingData) {
    return '<option value="">No spells available</option>';
  }

  const casterClassData = characterRep.spellCasting.classSpellCastingData.find(c => c.className === className);
  if (!casterClassData || !casterClassData.availableSpells) {
    return '<option value="">No spells available</option>';
  }

  // If no selectedLevels provided, show all levels from maxLevel down to 0
  if (!selectedLevels) {
    selectedLevels = Array.from({ length: maxLevel + 1 }, (_, i) => i);
  }

  const options = [];

  // Generate options from highest to lowest level, but only for selected levels
  for (let level = maxLevel; level >= 0; level--) {
    if (!selectedLevels.includes(level)) {
      continue; // Skip this level if not selected
    }

    // For domain slots, only show domain spells (level > 0) and skip level 0
    if (isDomain && level === 0) {
      continue; // Skip level 0 for domain slots
    }

    const levelKey = isDomain && level > 0 ? `${level} - domain` : level;
    const spells = casterClassData.availableSpells[levelKey] || [];

    if (spells.length > 0) {
      if (!isDomain) {
        const levelLabel = `Level ${level}`;
        options.push(`<optgroup label="${levelLabel}">`);
      }

      spells.sort().forEach(spell => {
        options.push(`<option value="${spell}" data-level="${level}" data-domain="${isDomain}">${spell}</option>`);
      });

      if (!isDomain) {
        options.push('</optgroup>');
      }
    }
  }

  return options.join('');
}

export function setupPopupEventListeners(popup, slotData) {
  // Level filter checkboxes
  const checkboxes = popup.querySelectorAll('.filter-checkbox input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function () {
      updateSpellDropdown(popup, slotData);
    });
  });

  // Spell dropdown change
  const spellSelect = popup.querySelector('#spellSelect');
  if (spellSelect) {
    spellSelect.addEventListener('change', function () {
      updatePrepareButton(popup, this.value);
      updateCastButton(popup, this.value);
    });
  }
}

export function updateSpellDropdown(popup, slotData) {
  const checkboxes = popup.querySelectorAll('.filter-checkbox input[type="checkbox"]:checked');
  const selectedLevels = Array.from(checkboxes).map(cb => parseInt((cb as HTMLInputElement).value));

  const spellSelect = popup.querySelector('#spellSelect');
  if (!spellSelect) return;

  // Clear existing options except the first one
  spellSelect.innerHTML = '<option value="">Select a spell...</option>';

  const className = getCurrentSpellcastingClass();
  if (!characterRep || !characterRep.spellCasting || !characterRep.spellCasting.classSpellCastingData) {
    return;
  }

  const casterClassData = characterRep.spellCasting.classSpellCastingData.find(c => c.className === className);
  if (!casterClassData || !casterClassData.availableSpells) {
    return;
  }

  spellSelect.innerHTML = '<option value="">Select a spell...</option>' + generateSpellOptions(className, slotData.level, slotData.isDomain, selectedLevels);
  updatePrepareButton(popup, '');
  updateCastButton(popup, '');
}

export function updatePrepareButton(popup, selectedSpell) {
  const prepareButton = popup.querySelector('.spell-button.prepare');
  if (prepareButton) {
    const isDisabled = !selectedSpell;
    prepareButton.disabled = isDisabled;

    if (isDisabled) {
      prepareButton.classList.add('disabled');
      prepareButton.style.opacity = '0.5';
    } else {
      prepareButton.classList.remove('disabled');
      prepareButton.style.opacity = '1';
    }
  }
}

export function updateCastButton(popup, selectedSpell) {
  const castButton = popup.querySelector('.spell-button.cast');
  if (castButton) {
    const isDisabled = !selectedSpell;
    castButton.disabled = isDisabled;

    if (isDisabled) {
      castButton.classList.add('disabled');
    } else {
      castButton.classList.remove('disabled');
    }
  }
}

export function getCurrentSpellcastingClass() {
  // Get the class name from the current slot data if available
  if (window.currentSlotData && window.currentSlotData.casterClassName) {
    return window.currentSlotData.casterClassName;
  }

  // Fallback to first available spellcasting class
  if (characterRep && characterRep.spellCasting && characterRep.spellCasting.classSpellCastingData) {
    return characterRep.spellCasting.classSpellCastingData[0]?.className || 'Cleric';
  }
  return 'Cleric';
}

export function positionPopup(popup, targetElement) {
  const rect = targetElement.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();

  // Position popup to the right of the target element, or to the left if not enough space
  let left = rect.right + 10;
  if (left + popupRect.width > window.innerWidth) {
    left = rect.left - popupRect.width - 10;
  }

  // Position vertically centered with the target element
  let top = rect.top + (rect.height - popupRect.height) / 2;
  if (top < 10) top = 10;
  if (top + popupRect.height > window.innerHeight - 10) {
    top = window.innerHeight - popupRect.height - 10;
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

export function hideSpellPopup() {
  const overlay = document.querySelector('.spell-popup-overlay');
  const popup = document.querySelector('.spell-popup');

  if (overlay) overlay.remove();
  if (popup) popup.remove();

  // Clear stored slot data
  window.currentSlotData = null;
}

/**
 * Prepares a spell for a character
 */
export function prepareSpell() {
  // Get the current popup and extract slot data
  const popup = document.querySelector('.spell-popup');
  if (!popup) {
    console.error('No popup found');
    return;
  }

  // Get the selected spell from the dropdown
  const spellSelect = popup.querySelector('#spellSelect');
  const selectedSpell = (spellSelect instanceof HTMLSelectElement) ? spellSelect.value : '';

  if (!selectedSpell) {
    console.error('No spell selected');
    return;
  }

  // Get the stored slot data
  const slotData = window.currentSlotData;

  if (!slotData) {
    console.error('No slot data available');
    return;
  }

  console.log('Preparing spell:', selectedSpell, 'for slot:', slotData);

  // Call server function to prepare the spell
  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error preparing spell:', error);
      alert('Error preparing spell: ' + error.message);
    })
    .OnPrepareSpell(characterRep.docId, slotData, selectedSpell);

  hideSpellPopup();
}

export function castSpell() {
  // Get the stored slot data (includes spellName for cast menus)
  const slotData = window.currentSlotData;

  if (!slotData) {
    console.error('No slot data available');
    return;
  }

  // Get the selected spell if it's a dropdown (Spontaneous cast)
  const popup = document.querySelector('.spell-popup');
  if (popup) {
    const spellSelect = popup.querySelector('#spellSelect');
    if (spellSelect && spellSelect instanceof HTMLSelectElement) {
      slotData.spellName = spellSelect.value;
    }
  }

  if (!slotData.spellName) {
    console.error('No spell name in slot data');
    return;
  }

  console.log('Casting spell:', slotData.spellName, 'for slot:', slotData);

  // Call server function to cast the spell
  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error casting spell:', error);
      alert('Error casting spell: ' + error.message);
    })
    .OnCastSpell(characterRep.docId, slotData);

  hideSpellPopup();
}
