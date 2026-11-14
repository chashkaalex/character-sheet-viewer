import { characterRep } from '../state';
import { onCharacterRepresentation } from '../character_script';
import { SpellSlotData } from '../../../server/character/common_types';
import { showSpellPopup, hideSpellPopup } from './spell_popup';
import { renderGeneralActionsUI, showNumberActionPopup, showMovePopup, hideMovePopup } from './general_actions';

export function renderSpellsUI() {
  const container = document.getElementById('spellsDynamicContainer');
  if (!container) return;

  const collapsedIds = new Set<string>();
  if (typeof container.querySelectorAll === 'function') {
    container.querySelectorAll('.spellcasting-class.collapsed').forEach((el: any) => {
      if (el.id) collapsedIds.add(el.id);
    });
  }

  container.innerHTML = '';

  if (!characterRep || !characterRep.spellCasting || !characterRep.spellCasting.classSpellCastingData) {
    container.innerHTML = '<div>No spellcasting available.</div>';
    return;
  }

  const spellCastingData = characterRep.spellCasting.classSpellCastingData;

  // Display each spellcasting class
  spellCastingData.forEach(casterClassData => {
    const safeClassKey = `spellClass_${String(casterClassData.className).replace(/\s+/g, '_')}`;
    const sectionId = `${safeClassKey}Section`;
    const isCollapsed = collapsedIds.has(sectionId);
    const classDiv = document.createElement('div');
    classDiv.id = sectionId;
    classDiv.className = 'spellcasting-class' + (isCollapsed ? ' collapsed' : '');

    let classTitle = `${casterClassData.className} (Level ${casterClassData.level})`;
    if (casterClassData.domains && casterClassData.domains.length > 0) {
      classTitle += ` - Domains: ${casterClassData.domains.join(', ')}`;
    }

    classDiv.innerHTML = `
            <div class="spellcasting-class-header" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px; margin-bottom: 15px;">
                <h3 style="margin: 0; border: none; padding: 0; font-size: 1.3em; color: var(--primary-color);">${classTitle}</h3>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="replenish-button" style="margin: 0; padding: 6px 12px; font-size: 0.9em;" onclick="replenishClassSpellSlots(this, '${casterClassData.className}')">Replenish Slots</button>
                    <button class="collapse-button" id="${safeClassKey}CollapseBtn" onclick="toggleCollapse('${safeClassKey}')" title="Collapse/Expand">${isCollapsed ? '▼' : '▲'}</button>
                </div>
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

