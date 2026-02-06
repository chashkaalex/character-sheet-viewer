
/**
 * @fileoverview Spell management functionality
 * @see {@link ../../common/common_types.js} for shared type definitions
 */

/**
 * Import type definitions from common types
 * @typedef {import('../../common/common_types.js').SlotData} SlotData
 */

function renderSpellsUI() {
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
                ${renderSpellSlots(casterClassData.spellSlots, casterClassData.preparedSpells, casterClassData.className)}
            </div>
        `;

    container.appendChild(classDiv);
  });
}

function renderSpellSlots(spellSlots, preparedSpells = {}, className = '') {
  let html = '';

  for (let level = 0; level <= 9; level++) {
    const slots = spellSlots[level] || 0;

    if (slots > 0) {
      // Get prepared spells for this level
      const levelPreparedSpells = preparedSpells[level] || [];

      // Check for domain spells (only for clerics and levels > 0)
      const domainKey = `${level} - domain`;
      const domainSpells = (className === 'Cleric' && level > 0) ? (preparedSpells[domainKey] || []) : [];
      const hasDomainSlot = className === 'Cleric' && level > 0;

      html += `
                <div class="spell-level-slots">
                    <h4>Level ${level} Spells (${slots} slot${slots !== 1 ? 's' : ''}${hasDomainSlot ? ' + 1 domain' : ''})</h4>
                    <div class="spell-slot-grid">
                        ${Array(slots).fill(0).map((_, index) => {
    const spellData = levelPreparedSpells[index];
    const isEmpty = !spellData;

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

    const slotClass = isEmpty ? 'empty' : 'filled';
    const usedClass = isUsed ? 'used' : '';
    const displayText = isEmpty ? '' : spellName;

    return `<div class="spell-slot ${slotClass} ${usedClass}" data-level="${level}" data-slot="${index}" data-spell="${spellName}" data-used="${isUsed}" data-class="${className}" title="${spellName || 'Empty slot'}">${displayText}</div>`;
  }).join('')}
                        ${hasDomainSlot ? (() => {
    const domainSpellData = domainSpells[0];
    const isEmpty = !domainSpellData;

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

    return `
                            <div class="spell-slot-separator"></div>
                            <div class="spell-slot domain-slot ${domainSlotClass} ${domainUsedClass}" data-level="${level}" data-slot="domain" data-spell="${domainSpellName}" data-used="${domainIsUsed}" data-class="${className}" title="${domainSpellName || 'Empty domain slot'}">${domainDisplayText}</div>
                        `;
  })() : ''}
                    </div>
                </div>
            `;
    }
  }

  return html || '<div>No spell slots available at all.</div>';
}

function PrepareSpellsUI() {
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
 */


/**
 * @param {UISlotData} uiSlotData - The UI slot data
 * @returns {SlotData} - The slot data
 */
function slotDataFromUISlotData(uiSlotData) {
  /**
     * @type {SlotData}
     */
  const slotData = {
    casterClassName: uiSlotData.casterClass,
    spellLevel: uiSlotData.level
  };
  return slotData;
}

function initializeSpellSlotHandlers() {
  // Add click handlers to all spell slots
  document.addEventListener('click', function (event) {
    if (event.target.classList.contains('spell-slot')) {
      event.preventDefault();
      event.stopPropagation();

      /**
             * @type {UISlotData}
             */
      const uiSlotData = {
        level: parseInt(event.target.dataset.level),
        slot: event.target.dataset.slot,
        spell: event.target.dataset.spell || '',
        isUsed: event.target.dataset.used === 'true',
        isEmpty: event.target.classList.contains('empty'),
        isDomain: event.target.classList.contains('domain-slot'),
        casterClass: event.target.dataset.class || ''
      };

      showSpellPopup(event.target, uiSlotData);
    }
  });

  // Close popup when clicking outside
  document.addEventListener('click', function (event) {
    if (!event.target.closest('.spell-popup') && !event.target.classList.contains('spell-slot')) {
      hideSpellPopup();
    }
  });
}

/**
 * @param {HTMLElement} targetElement - The target element that was clicked
 * @param {UISlotData} slotData - The slot data
*/
function showSpellPopup(targetElement, uiSlotData) {
  // Hide any existing popup
  hideSpellPopup();

  // Store slot data globally for access in prepareSpell/castSpell
  const slotData = {
    casterClassName: uiSlotData.casterClass,
    spellLevel: uiSlotData.level + (uiSlotData.isDomain ? ' - domain' : '')
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
    // Empty slot - show prepare menu
    popup.innerHTML = createPrepareMenu(uiSlotData);
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

function createPrepareMenu(slotData) {
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
            <button class="spell-button cancel" onclick="hideSpellPopup()">Cancel</button>
            <button class="spell-button prepare disabled" onclick="prepareSpell()" disabled>Prepare</button>
        </div>
    `;
}

function createCastMenu(slotData) {
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
            <button class="spell-button cancel" onclick="hideSpellPopup()">Cancel</button>
            <button class="${castButtonClass}" onclick="castSpell()" ${castButtonDisabled}>Cast</button>
        </div>
    `;
}

function generateSpellOptions(className, maxLevel, isDomain, selectedLevels = null) {
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
      const levelLabel = isDomain && level > 0 ? `Level ${level} Domain` : `Level ${level}`;
      options.push(`<optgroup label="${levelLabel}">`);

      spells.sort().forEach(spell => {
        options.push(`<option value="${spell}" data-level="${level}" data-domain="${isDomain}">${spell}</option>`);
      });

      options.push('</optgroup>');
    }
  }

  return options.join('');
}

function setupPopupEventListeners(popup, slotData) {
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
    });
  }
}

function updateSpellDropdown(popup, slotData) {
  const checkboxes = popup.querySelectorAll('.filter-checkbox input[type="checkbox"]:checked');
  const selectedLevels = Array.from(checkboxes).map(cb => parseInt(cb.value));

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
}

function updatePrepareButton(popup, selectedSpell) {
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

function getCurrentSpellcastingClass() {
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

function positionPopup(popup, targetElement) {
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

function hideSpellPopup() {
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
function prepareSpell() {
  // Get the current popup and extract slot data
  const popup = document.querySelector('.spell-popup');
  if (!popup) {
    console.error('No popup found');
    return;
  }

  // Get the selected spell from the dropdown
  const spellSelect = popup.querySelector('#spellSelect');
  const selectedSpell = spellSelect ? spellSelect.value : '';

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

function castSpell() {
  // Get the stored slot data (includes spellName for cast menus)
  const slotData = window.currentSlotData;

  if (!slotData) {
    console.error('No slot data available');
    return;
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
