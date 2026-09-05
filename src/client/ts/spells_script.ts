import { characterRep } from './state';
import { onCharacterRepresentation } from './character_script';
import { SpellSlotData } from '../../server/character/common_types';

let currentSlotData: SpellSlotData | null = null;

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
            <div class="spellcasting-class-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-color); padding-bottom: 8px; margin-bottom: 15px;">
                <h3 style="margin: 0; border: none; padding: 0; font-size: 1.3em; color: var(--primary-color);">${classTitle}</h3>
                <button class="replenish-button" style="margin: 0; padding: 6px 12px; font-size: 0.9em;" onclick="replenishClassSpellSlots(this, '${casterClassData.className}')">Replenish Slots</button>
            </div>
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
      discrepancyMsg = `⚠ Discrepancy! Level ${level}: ${slotsToRender} parsed ${slotType} vs ${expectedSlots} calculated slots!`;
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
        let isValid = true;

        if (spellData) {
          if (typeof spellData === 'string') {
            spellName = spellData;
          } else if (typeof spellData === 'object') {
            spellName = spellData.spell || '';
            isUsed = spellData.used || false;
            if (spellData.isValid === false) {
              isValid = false;
            }
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

        const invalidClass = (!isEmpty && !isSpontaneousEmpty && !isValid) ? 'invalid' : '';
        const slotClass = (isEmpty || isSpontaneousEmpty) ? 'empty' : 'filled';
        const usedClass = isUsed ? 'used' : '';
        const displayText = (isEmpty || isSpontaneousEmpty) ? '' : spellName;

        return `<div class="spell-slot ${slotClass} ${usedClass} ${invalidClass}" data-level="${level}" data-slot="${index}" data-spell="${spellName}" data-used="${isUsed}" data-valid="${isValid}" data-class="${className}" data-preparation="${preparation}" title="${spellName || 'Empty slot'}">${displayText}</div>`;
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
            let domainIsValid = true;

            if (domainSpellData) {
              if (typeof domainSpellData === 'string') {
                domainSpellName = domainSpellData;
              } else if (typeof domainSpellData === 'object') {
                domainSpellName = domainSpellData.spell || '';
                domainIsUsed = domainSpellData.used || false;
                if (domainSpellData.isValid === false) {
                  domainIsValid = false;
                }
              }
            }

            const domainInvalidClass = (!isEmpty && !domainIsValid) ? 'invalid' : '';
            const domainSlotClass = isEmpty ? 'empty' : 'filled';
            const domainUsedClass = domainIsUsed ? 'used' : '';
            const domainDisplayText = isEmpty ? '' : domainSpellName;

            domainHtml += `
                               <div class="spell-slot-separator"></div>
                               <div class="spell-slot domain-slot ${domainSlotClass} ${domainUsedClass} ${domainInvalidClass}" data-level="${level}" data-slot="${d}" data-spell="${domainSpellName}" data-used="${domainIsUsed}" data-valid="${domainIsValid}" data-class="${className}" data-preparation="${preparation}" title="${domainSpellName || 'Empty domain slot'}">${domainDisplayText}</div>
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
  renderGeneralActionsUI();
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
      const rawLevel = target.dataset.level;
      const uiSlotData = {
        level: (rawLevel === 'songs' || rawLevel === 'actions') ? rawLevel : parseInt(rawLevel || '0'),
        slot: parseInt(target.dataset.slot || '0'),
        spell: target.dataset.spell || '',
        isUsed: target.dataset.used === 'true',
        isValid: target.dataset.valid !== 'false',
        isEmpty: target.classList.contains('empty'),
        isDomain: target.classList.contains('domain-slot'),
        casterClass: target.dataset.class || '',
        preparation: target.dataset.preparation || 'Prepared'
      };

      const metadata = (characterRep as any).actionsMetadata && (characterRep as any).actionsMetadata[uiSlotData.spell];
      if (metadata && metadata.acceptsNumber) {
        showNumberActionPopup(target, uiSlotData.spell, metadata);
        return;
      }

      if (uiSlotData.spell === 'Move') {
        showMovePopup(target);
        return;
      }

      showSpellPopup(target, uiSlotData);
    }
  });

  // Close popup when clicking outside
  document.addEventListener('click', function (event) {
    if (!(event.target instanceof HTMLElement)) return;
    if (!event.target.closest('.spell-popup') && !event.target.closest('#movePopup') && !event.target.classList.contains('spell-slot')) {
      hideSpellPopup();
      hideMovePopup();
    }
  });
}

/**
 * Retrieves range and target for a spell from loaded characterRep.spellCasting data.
 */
export function getSpellInfo(className: string, spellName: string): { range: string | null; target: string | null } {
  if (!characterRep || !characterRep.spellCasting || !characterRep.spellCasting.classSpellCastingData) {
    return { range: null, target: null };
  }
  const casterClassData = characterRep.spellCasting.classSpellCastingData.find((c: any) => c.className === className);
  if (!casterClassData) {
    return { range: null, target: null };
  }

  // Check preparedSpells
  if (casterClassData.preparedSpells) {
    for (const lvl of Object.keys(casterClassData.preparedSpells)) {
      const spellEntry = casterClassData.preparedSpells[lvl]?.find((s: any) => s.spell === spellName);
      if (spellEntry && (spellEntry.range || spellEntry.target)) {
        return { range: spellEntry.range || null, target: spellEntry.target || null };
      }
    }
  }

  // Check knownSpells
  if (casterClassData.knownSpells) {
    for (const lvl of Object.keys(casterClassData.knownSpells)) {
      const spellEntry = casterClassData.knownSpells[lvl]?.find((s: any) => (typeof s === 'string' ? s : s.spellName) === spellName);
      if (spellEntry && (spellEntry.range || spellEntry.target)) {
        return { range: spellEntry.range || null, target: spellEntry.target || null };
      }
    }
  }

  return { range: null, target: null };
}

/**
 * Renders target selection options based on SpellTarget enum.
 */
export function renderTargetSelector(targetType: string | null): string {
  if (!targetType) return '';

  const partyMembers: string[] = (characterRep?.partyMembers || []) as string[];
  const selfNickname = characterRep?.partyNickname || characterRep?.name || 'Self';
  const otherMembers = partyMembers.filter(m => m !== selfNickname && m !== 'Self' && m !== characterRep?.name);

  if (targetType === 'Self') {
    return `
      <div class="spell-targets-container" data-target-type="Self">
        <label class="spell-targets-title">Target:</label>
        <div class="spell-targets-list">
          <label class="spell-target-option disabled">
            <input type="checkbox" name="spellTarget" value="Self" checked disabled>
            Self
          </label>
        </div>
      </div>
    `;
  }

  if (targetType === 'OneCreature' || targetType === 'OneAlly') {
    return `
      <div class="spell-targets-container" data-target-type="${targetType}">
        <label class="spell-targets-title">Target (Select 1):</label>
        <div class="spell-targets-list">
          <label class="spell-target-option">
            <input type="radio" name="spellTarget" value="Self">
            Self
          </label>
          ${otherMembers.map(m => `
            <label class="spell-target-option">
              <input type="radio" name="spellTarget" value="${m}">
              ${m}
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (targetType === 'MultipleCreatures' || targetType === 'Party') {
    return `
      <div class="spell-targets-container" data-target-type="${targetType}">
        <label class="spell-targets-title">Targets:</label>
        <div class="spell-targets-list">
          <label class="spell-target-option">
            <input type="checkbox" name="spellTarget" value="Self">
            Self
          </label>
          ${otherMembers.map(m => `
            <label class="spell-target-option">
              <input type="checkbox" name="spellTarget" value="${m}">
              ${m}
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Area, Object, Special
  return `
    <div class="spell-targets-container" data-target-type="${targetType}">
      <div class="spell-target-note"><strong>Target:</strong> ${targetType}</div>
    </div>
  `;
}

/**
 * Validates whether current target selection satisfies the spell's target requirements.
 */
export function isTargetSelectionValid(popup: HTMLElement, targetType?: string | null): boolean {
  if (!targetType) {
    const container = popup.querySelector('.spell-targets-container') as HTMLElement | null;
    targetType = container?.dataset.targetType || null;
  }

  if (!targetType || targetType === 'Self' || targetType === 'Area' || targetType === 'Object' || targetType === 'Special') {
    return true;
  }

  if (targetType === 'OneCreature' || targetType === 'OneAlly') {
    const checked = popup.querySelector('input[name="spellTarget"]:checked');
    return !!checked;
  }

  if (targetType === 'MultipleCreatures' || targetType === 'Party') {
    const checked = popup.querySelectorAll('input[name="spellTarget"]:checked');
    return checked.length > 0;
  }

  return true;
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

  // If it's a cast menu, also store the spell name, range, and target
  if (!uiSlotData.isEmpty) {
    const spellInfo = getSpellInfo(uiSlotData.casterClass, uiSlotData.spell);
    uiSlotData.range = spellInfo.range;
    uiSlotData.target = spellInfo.target;
    slotData.spellName = uiSlotData.spell;
    slotData.isValid = uiSlotData.isValid;
    slotData.range = spellInfo.range;
    slotData.target = spellInfo.target;
  }

  currentSlotData = slotData;
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
            <div id="spontaneousSpellDetails" style="display:none; margin-top: 4px;">
              <strong>Range:</strong> <span id="spontaneousRangeText">-</span>
              <br><strong>Target:</strong> <span id="spontaneousTargetText">-</span>
            </div>
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

        <div id="spellTargetContainer"></div>
        
        <div class="spell-actions">
            <button class="spell-button cancel" onclick="window.hideSpellPopup()">Cancel</button>
            <button class="spell-button cast disabled" onclick="window.castSpell()" disabled>Cast</button>
        </div>
    `;
}

export function createCastMenu(slotData) {
  const isUsed = slotData.isUsed || false;
  const isValid = slotData.isValid !== false;

  if (slotData.casterClassName === 'Actions' || slotData.casterClass === 'Actions') {
    let statusText = '';
    if (isUsed) {
      statusText = '<br><strong>Status:</strong> <span style="color: var(--text-muted); text-decoration: line-through;">Active</span>';
    }

    const actionDisabled = (isUsed || !isValid) ? 'disabled' : '';
    const actionClass = (isUsed || !isValid) ? 'spell-button cast disabled' : 'spell-button cast';

    return `
          <h3>Use Action</h3>
          <div class="spell-info">
              <strong>Action:</strong> ${slotData.spell}
              ${statusText}
          </div>
          
          <div class="spell-actions">
              <button class="spell-button cancel" onclick="window.hideSpellPopup()">Cancel</button>
              <button class="${actionClass}" onclick="window.useAction()" ${actionDisabled}>Use</button>
          </div>
      `;
  }

  let statusText = '';
  if (isUsed) {
    statusText = '<br><strong>Status:</strong> <span style="color: var(--text-muted); text-decoration: line-through;">Used</span>';
  } else if (!isValid) {
    statusText = '<br><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">Invalid</span>';
  }

  const range = slotData.range || 'N/A';
  const target = slotData.target || 'N/A';
  const targetHtml = renderTargetSelector(slotData.target);
  const targetInitiallyValid = (!slotData.target || slotData.target === 'Self' || slotData.target === 'Area' || slotData.target === 'Object' || slotData.target === 'Special');

  const castButtonDisabled = (isUsed || !isValid || !targetInitiallyValid) ? 'disabled' : '';
  const castButtonClass = (isUsed || !isValid || !targetInitiallyValid) ? 'spell-button cast disabled' : 'spell-button cast';

  return `
        <h3>Cast Spell</h3>
        <div class="spell-info">
            <strong>Spell:</strong> ${slotData.spell}
            <br><strong>Level:</strong> ${slotData.level}${slotData.isDomain ? ' Domain' : ''}
            <br><strong>Slot:</strong> ${slotData.slot}
            <br><strong>Range:</strong> ${range}
            <br><strong>Target:</strong> ${target}
            ${statusText}
        </div>

        ${targetHtml}
        
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
  if (!casterClassData || !casterClassData.knownSpells) {
    return '<option value="">No spells available</option>';
  }

  if (maxLevel === 'songs') {
    const spells = casterClassData.knownSpells['songs'] || [];
    const sortedSpells = [...spells].sort((a, b) => {
      const nameA = typeof a === 'string' ? a : a.spellName;
      const nameB = typeof b === 'string' ? b : b.spellName;
      return nameA.localeCompare(nameB);
    });

    const songOptions = sortedSpells.map(entry => {
      let spellName = '';
      let isValid = true;
      if (typeof entry === 'string') {
        spellName = entry;
      } else {
        spellName = entry.spellName;
        isValid = entry.isValid !== false;
      }
      const style = isValid ? '' : ' style="color: #dc3545; font-weight: bold;"';
      const label = isValid ? spellName : `${spellName} (Invalid)`;
      return `<option value="${spellName}" data-level="songs" data-domain="${isDomain}"${style}>${label}</option>`;
    });
    return songOptions.join('');
  }

  // If no selectedLevels provided, show all levels from maxLevel down to 0
  if (!selectedLevels) {
    selectedLevels = Array.from({ length: (maxLevel as number) + 1 }, (_, i) => i);
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
    const spells = casterClassData.knownSpells[levelKey] || [];

    if (spells.length > 0) {
      if (!isDomain) {
        const levelLabel = `Level ${level}`;
        options.push(`<optgroup label="${levelLabel}">`);
      }

      const sortedSpells = [...spells].sort((a, b) => {
        const nameA = typeof a === 'string' ? a : a.spellName;
        const nameB = typeof b === 'string' ? b : b.spellName;
        return nameA.localeCompare(nameB);
      });

      sortedSpells.forEach(entry => {
        let spellName = '';
        let isValid = true;
        if (typeof entry === 'string') {
          spellName = entry;
        } else {
          spellName = entry.spellName;
          isValid = entry.isValid !== false;
        }
        const style = isValid ? '' : ' style="color: #dc3545; font-weight: bold;"';
        const label = isValid ? spellName : `${spellName} (Invalid)`;
        options.push(`<option value="${spellName}" data-level="${level}" data-domain="${isDomain}"${style}>${label}</option>`);
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
  if (spellSelect && spellSelect instanceof HTMLSelectElement) {
    spellSelect.addEventListener('change', function () {
      const className = getCurrentSpellcastingClass();
      const spellName = this.value;
      updatePrepareButton(popup, spellName);

      const info = getSpellInfo(className, spellName);
      const details = popup.querySelector('#spontaneousSpellDetails') as HTMLElement | null;
      const rangeText = popup.querySelector('#spontaneousRangeText');
      const targetText = popup.querySelector('#spontaneousTargetText');
      const targetContainer = popup.querySelector('#spellTargetContainer') as HTMLElement | null;

      if (spellName && details && rangeText && targetText && targetContainer) {
        details.style.display = 'block';
        rangeText.textContent = info.range || 'N/A';
        targetText.textContent = info.target || 'N/A';
        targetContainer.innerHTML = renderTargetSelector(info.target);
        targetContainer.dataset.targetType = info.target || '';
      } else if (details && targetContainer) {
        details.style.display = 'none';
        targetContainer.innerHTML = '';
        targetContainer.dataset.targetType = '';
      }
      updateCastButton(popup, spellName, info.target);
    });
  }

  // Target radio / checkbox changes
  popup.addEventListener('change', function (event: Event) {
    const target = event.target as HTMLElement;
    if (target && target.matches('input[name="spellTarget"]')) {
      updateCastButton(popup);
    }
  });
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
  if (!casterClassData || !casterClassData.knownSpells) {
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

export function updateCastButton(popup: HTMLElement, selectedSpell?: string, targetType?: string | null) {
  const castButton = popup.querySelector('.spell-button.cast') as HTMLButtonElement | null;
  if (!castButton) return;

  let spell = selectedSpell;
  if (spell === undefined) {
    const spellSelect = popup.querySelector('#spellSelect') as HTMLSelectElement | null;
    spell = spellSelect ? spellSelect.value : (currentSlotData?.spellName || '');
  }

  let tType = targetType;
  if (tType === undefined) {
    const targetContainer = popup.querySelector('.spell-targets-container') as HTMLElement | null;
    tType = targetContainer?.dataset.targetType || currentSlotData?.target || null;
  }

  const hasSpell = !!spell;
  const targetValid = isTargetSelectionValid(popup, tType);
  const isUsed = currentSlotData?.isUsed || false;
  const isValid = currentSlotData?.isValid !== false;

  const isDisabled = !hasSpell || !targetValid || isUsed || !isValid;
  castButton.disabled = isDisabled;

  if (isDisabled) {
    castButton.classList.add('disabled');
  } else {
    castButton.classList.remove('disabled');
  }
}

export function getCurrentSpellcastingClass() {
  // Get the class name from the current slot data if available
  if (currentSlotData && currentSlotData.casterClassName) {
    return currentSlotData.casterClassName;
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
  currentSlotData = null;
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
  const slotData = currentSlotData;

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
  const slotData = currentSlotData;

  if (!slotData) {
    console.error('No slot data available');
    return;
  }

  // Get the selected spell if it's a dropdown (Spontaneous cast)
  const popup = document.querySelector('.spell-popup') as HTMLElement | null;
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

  // Extract selected targets
  const checkedInputs = popup ? popup.querySelectorAll('input[name="spellTarget"]:checked') : [];
  const selectedTargets: string[] = [];
  checkedInputs.forEach((input: any) => {
    selectedTargets.push(input.value);
  });

  // If target is Self (disabled checkbox)
  if (selectedTargets.length === 0 && popup) {
    const disabledSelf = popup.querySelector('input[name="spellTarget"][value="Self"][disabled]');
    if (disabledSelf) {
      selectedTargets.push('Self');
    }
  }

  slotData.targets = selectedTargets;

  console.log('Casting spell:', slotData.spellName, 'for slot:', slotData, 'targets:', slotData.targets);

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

/**
 * Replenishes spell slots for a specific caster class of the loaded character.
 */
export function replenishClassSpellSlots(buttonElement: HTMLButtonElement, className: string) {
  if (!characterRep || !characterRep.docId) {
    console.error('No character loaded');
    return;
  }

  console.log('Replenishing spell slots for class:', className, 'on button:', buttonElement);

  if (buttonElement) {
    buttonElement.disabled = true;
    buttonElement.style.opacity = '0.5';
  }

  google.script.run
    .withSuccessHandler(function (updatedRep) {
      if (buttonElement) {
        buttonElement.disabled = false;
        buttonElement.style.opacity = '1';
      }
      onCharacterRepresentation(updatedRep);
    })
    .withFailureHandler(function (error) {
      if (buttonElement) {
        buttonElement.disabled = false;
        buttonElement.style.opacity = '1';
      }
      console.error('Error replenishing spell slots:', error);
      alert('Error replenishing spell slots: ' + error.message);
    })
    .OnReplenishClassSpellSlots(characterRep.docId, className);
}

/**
 * Renders the general actions UI grid.
 */
export function renderGeneralActionsUI() {
  const container = document.getElementById('generalActionsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!characterRep || !characterRep.actions || characterRep.actions.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  const classDiv = document.createElement('div');
  classDiv.className = 'spellcasting-class';

  let html = `
    <div class="spellcasting-class-header" style="border-bottom: 2px solid var(--border-color); padding-bottom: 8px; margin-bottom: 15px;">
        <h3 style="margin: 0; border: none; padding: 0; font-size: 1.3em; color: var(--primary-color);">General Actions</h3>
    </div>
    <div class="spell-slots-container">
      <div class="spell-level-slots">
        <div class="spell-slot-grid">
  `;

  characterRep.actions.forEach((actionName, index) => {
    const metadata = (characterRep as any).actionsMetadata && (characterRep as any).actionsMetadata[actionName];
    const statusName = (metadata && metadata.statusName) || actionName;
    const isActive = characterRep.statuses && characterRep.statuses.some((s: any) => s.name === statusName);
    const slotClass = 'filled';
    const usedClass = isActive ? 'used' : '';

    html += `<div class="spell-slot ${slotClass} ${usedClass}" data-level="actions" data-slot="${index}" data-spell="${actionName}" data-used="${isActive}" data-valid="true" data-class="Actions" data-preparation="Actions" title="${actionName}">${actionName}</div>`;
  });

  html += `
        </div>
      </div>
    </div>
  `;

  classDiv.innerHTML = html;
  container.appendChild(classDiv);
}

/**
 * Client-side handler to trigger using a general action.
 */
export function useAction() {
  const slotData = currentSlotData;
  if (!slotData || !slotData.spellName) {
    console.error('No action selected');
    return;
  }

  console.log('Using action:', slotData.spellName);

  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error using action:', error);
      alert('Error using action: ' + error.message);
    })
    .OnUseAction(characterRep.docId, slotData.spellName);

  hideSpellPopup();
}

/**
 * Shows the dedicated Move action modal popup near the clicked element.
 */
export function showMovePopup(targetElement: HTMLElement) {
  // Hide any existing spell popup
  hideSpellPopup();
  // Hide any existing move popup
  hideMovePopup();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'spell-popup-overlay show';
  overlay.id = 'movePopupOverlay';
  document.body.appendChild(overlay);

  // Create popup
  const popup = document.createElement('div');
  popup.className = 'spell-popup show';
  popup.id = 'movePopup';

  const maxSpeed = characterRep && characterRep.speed ? characterRep.speed.currentScore : 30;

  popup.innerHTML = `
        <h3>Use Move Action</h3>
        <div class="spell-info" style="margin-bottom: 15px;">
            <strong>Action:</strong> Move
            <br><strong>Max Speed:</strong> ${maxSpeed} ft.
            <div style="margin-top: 10px;">
              <label for="moveFeetInput" style="font-weight: bold; display: block; margin-bottom: 5px;">Distance (feet):</label>
              <input type="number" id="moveFeetInput" min="5" step="5" value="${maxSpeed}" max="${maxSpeed}" style="width: 80px; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--background-secondary); color: var(--text-color);">
            </div>
        </div>
        
        <div class="spell-actions">
            <button class="spell-button cancel" onclick="window.hideMovePopup()">Cancel</button>
            <button class="spell-button cast" onclick="window.moveAction()">Move</button>
        </div>
    `;

  document.body.appendChild(popup);
  positionPopup(popup, targetElement);

  // Close when clicking overlay
  overlay.addEventListener('click', hideMovePopup);
}

/**
 * Hides the dedicated Move action modal popup.
 */
export function hideMovePopup() {
  const overlay = document.getElementById('movePopupOverlay');
  const popup = document.getElementById('movePopup');
  if (overlay) overlay.remove();
  if (popup) popup.remove();
}

/**
 * Client-side handler to trigger the move action.
 */
export function moveAction() {
  const input = document.getElementById('moveFeetInput') as HTMLInputElement;
  if (!input) return;
  const feet = parseInt(input.value || '0', 10);
  const maxSpeed = characterRep && characterRep.speed ? characterRep.speed.currentScore : 30;
  if (isNaN(feet) || feet <= 0 || feet > maxSpeed) {
    alert(`Please enter a valid distance between 5 and ${maxSpeed} feet.`);
    return;
  }

  console.log('Executing Move Action:', feet);

  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error executing move:', error);
      alert('Error: ' + error.message);
    })
    .OnMoveAction(characterRep.docId, feet);

  hideMovePopup();
}

/**
 * Shows the generic number action modal popup.
 */
export function showNumberActionPopup(targetElement: HTMLElement, actionName: string, metadata: any) {
  hideSpellPopup();
  hideMovePopup();
  hideNumberActionPopup();

  const overlay = document.createElement('div');
  overlay.id = 'numberActionPopupOverlay';
  overlay.className = 'spell-popup-overlay show';
  document.body.appendChild(overlay);

  const popup = document.createElement('div');
  popup.id = 'numberActionPopup';
  popup.className = 'spell-popup show';

  popup.innerHTML = `
        <h3>${actionName}</h3>
        <div class="spell-info">
            <strong>Max:</strong> ${metadata.maxNumber}
        </div>
        <div style="margin: 15px 0;">
            <label for="numberActionInput" style="display: block; margin-bottom: 5px; font-weight: bold;">${metadata.label}</label>
            <input type="number" id="numberActionInput" value="${metadata.maxNumber}" min="${metadata.minNumber}" max="${metadata.maxNumber}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-color); box-sizing: border-box;" />
        </div>
        <div class="spell-actions">
            <button class="spell-button cancel" onclick="window.hideNumberActionPopup()">Cancel</button>
            <button class="spell-button cast" onclick="window.useNumberAction('${actionName}')">Use</button>
        </div>
    `;

  document.body.appendChild(popup);
  positionPopup(popup, targetElement);

  overlay.addEventListener('click', hideNumberActionPopup);
}

/**
 * Hides the generic number action modal popup.
 */
export function hideNumberActionPopup() {
  const overlay = document.getElementById('numberActionPopupOverlay');
  const popup = document.getElementById('numberActionPopup');
  if (overlay) overlay.remove();
  if (popup) popup.remove();
}

/**
 * Client-side handler to trigger the generic number action.
 */
export function useNumberAction(actionName: string) {
  const input = document.getElementById('numberActionInput') as HTMLInputElement;
  if (!input) return;

  const value = parseInt(input.value || '0', 10);
  const metadata = characterRep.actionsMetadata && characterRep.actionsMetadata[actionName];
  if (!metadata) return;

  if (isNaN(value) || value < metadata.minNumber || value > metadata.maxNumber) {
    alert(`Please enter a valid value between ${metadata.minNumber} and ${metadata.maxNumber}.`);
    return;
  }

  console.log(`Executing Number Action ${actionName}:`, value);

  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error(`Error executing number action ${actionName}:`, error);
      alert('Error: ' + error.message);
    })
    .OnUseNumberAction(characterRep.docId, actionName, value);

  hideNumberActionPopup();
}
