import { characterRep } from '../state';
import { onCharacterRepresentation, addTooltip } from '../character_script';
import { SpellSlotData } from '../../../server/character/common_types';
import { showSpellPopup, hideSpellPopup } from './spell_popup';
import { renderGeneralActionsUI, showNumberActionPopup, showMovePopup, hideMovePopup } from './general_actions';

export type SpellLayoutMode = 'tabs' | 'list';
const VALID_SPELL_LAYOUTS = new Set<SpellLayoutMode>(['tabs', 'list']);
const activeSpontaneousLevelTabs: Record<string, string> = {};

export function resolveSpellLayoutMode(explicitMode?: SpellLayoutMode): SpellLayoutMode {
  if (explicitMode && VALID_SPELL_LAYOUTS.has(explicitMode)) {
    return explicitMode;
  }
  if (characterRep?.spellLayout && VALID_SPELL_LAYOUTS.has(characterRep.spellLayout)) {
    return characterRep.spellLayout;
  }
  const docId = characterRep?.docId || '';
  const storageKey = docId ? `spellLayout:${docId}` : 'spellLayout';
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as SpellLayoutMode | null;
      if (stored && VALID_SPELL_LAYOUTS.has(stored)) {
        return stored;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return 'tabs';
}

export function setSpellLayoutMode(mode: SpellLayoutMode): void {
  if (!VALID_SPELL_LAYOUTS.has(mode)) return;
  if (characterRep) {
    characterRep.spellLayout = mode;
  }
  const docId = characterRep?.docId || '';
  const storageKey = docId ? `spellLayout:${docId}` : 'spellLayout';
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, mode);
    }
  } catch {
    // Ignore storage errors
  }
  renderSpellsUI();
  if (docId && typeof google !== 'undefined' && google.script?.run) {
    google.script.run.SetSpellLayoutPreference(docId, mode);
  }
}

export function selectSpontaneousLevelTab(className: string, level: string) {
  activeSpontaneousLevelTabs[className] = String(level);
  const safeClassKey = `spellClass_${String(className).replace(/\s+/g, '_')}`;
  const section = document.getElementById(`${safeClassKey}Section`);
  if (!section || typeof section.querySelectorAll !== 'function') return;

  section.querySelectorAll('.action-tab[data-spont-level]').forEach((tab: any) => {
    const isMatch = tab.getAttribute('data-spont-level') === String(level);
    tab.classList?.toggle('active', isMatch);
  });

  section.querySelectorAll('.action-tab-panel[data-spont-level]').forEach((panel: any) => {
    const isMatch = panel.getAttribute('data-spont-level') === String(level);
    panel.classList?.toggle('active', isMatch);
  });
}

export function renderSpellsUI() {
  const container = document.getElementById('spellsDynamicContainer');
  if (!container) return;

  const collapsedIds = new Set<string>();
  if (typeof container.querySelectorAll === 'function') {
    container.querySelectorAll('.spellcasting-class.collapsed, .spell-level-slots.collapsed').forEach((el: any) => {
      if (el.id) collapsedIds.add(el.id);
    });
  }

  container.innerHTML = '';

  if (!characterRep || !characterRep.spellCasting || !characterRep.spellCasting.classSpellCastingData) {
    container.innerHTML = '<div>No spellcasting available.</div>';
    return;
  }

  const currentLayout = resolveSpellLayoutMode();
  const spellCastingData = characterRep.spellCasting.classSpellCastingData;

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
            <div class="spellcasting-class-header" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                <h3 style="margin: 0; border: none; padding: 0; font-size: 1.3em; color: var(--primary-color);">${classTitle}</h3>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <div class="skills-mode-toggle" role="group" aria-label="Spell level layout">
                        <button type="button" class="skills-mode-btn${currentLayout === 'tabs' ? ' active' : ''}" onclick="setSpellLayoutMode('tabs')" title="Display spell levels as selectable tabs">Tabs</button>
                        <button type="button" class="skills-mode-btn${currentLayout === 'list' ? ' active' : ''}" onclick="setSpellLayoutMode('list')" title="Display spell levels as collapsible sections">Levels</button>
                    </div>
                    <button class="replenish-button" style="margin: 0; padding: 6px 12px; font-size: 0.9em;" onclick="replenishClassSpellSlots(this, '${casterClassData.className}')">Replenish Slots</button>
                    <button class="collapse-button" id="${safeClassKey}CollapseBtn" onclick="toggleCollapse('${safeClassKey}')" title="Collapse/Expand">${isCollapsed ? '▼' : '▲'}</button>
                </div>
            </div>
            <div class="spell-slots-container">
                ${renderSpellSlots(casterClassData.spellSlots, casterClassData.preparedSpells, casterClassData.className, casterClassData.preparation, casterClassData.knownSpells, currentLayout, collapsedIds)}
            </div>
        `;

    container.appendChild(classDiv);

    if (typeof classDiv.querySelectorAll === 'function') {
      classDiv.querySelectorAll('.action-slot-mod[data-save-dc-tooltip]').forEach((modEl: Element) => {
        const dcTooltip = (modEl as HTMLElement).getAttribute('data-save-dc-tooltip');
        if (dcTooltip) {
          addTooltip(modEl, dcTooltip);
        }
      });
    }
  });
}

export function renderSpellSlots(
  spellSlots,
  preparedSpells = {},
  className = '',
  preparation = 'Prepared',
  knownSpells: Record<string, any[]> = {},
  layoutMode?: SpellLayoutMode,
  collapsedIds: Set<string> = new Set()
) {
  const levelsToRender: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const resolvedKnownSpells: Record<string, any[]> = (
    knownSpells && Object.keys(knownSpells).length > 0
      ? knownSpells
      : (characterRep?.spellCasting?.classSpellCastingData?.find((c: any) => c.className === className)?.knownSpells || {})
  );
  const hasKnownCards = preparation === 'Spontaneous' && Object.keys(resolvedKnownSpells).length > 0;
  const effectiveLayout: SpellLayoutMode = layoutMode || (hasKnownCards ? resolveSpellLayoutMode() : 'list');

  const renderedLevels: Array<{
    level: number;
    tabTitle: string;
    listHeaderTitle: string;
    discrepancyHtml: string;
    gridHtml: string;
  }> = [];

  for (const level of levelsToRender) {
    const expectedSlots = spellSlots[level] || 0;
    const levelPreparedSpells = preparedSpells[level] || [];
    const preparedSpellsCount = levelPreparedSpells.length;
    const domainKey = `${level} - domain`;
    const isNumericLevel = typeof level === 'number';
    const domainSpells = (className === 'Cleric' && isNumericLevel && level > 0) ? (preparedSpells[domainKey] || []) : [];
    const hasDomainSlot = className === 'Cleric' && isNumericLevel && level > 0;
    const expectedDomainSlots = hasDomainSlot ? 1 : 0;
    const preparedDomainSpellsCount = domainSpells.length;
    const levelKnown = resolvedKnownSpells[level] || [];
    const slotsToRender = preparedSpellsCount;

    let showDiscrepancyAlert = false;
    let discrepancyMsg = '';
    if ((expectedSlots > 0 || slotsToRender > 0) && slotsToRender !== expectedSlots) {
      showDiscrepancyAlert = true;
      const slotType = preparation === 'Spontaneous' ? 'spontaneous slots' : 'prepared spells';
      discrepancyMsg = `⚠ Discrepancy! Level ${level}: ${slotsToRender} parsed ${slotType} vs ${expectedSlots} calculated slots!`;
    }
    if (hasDomainSlot && preparedDomainSpellsCount !== expectedDomainSlots) {
      showDiscrepancyAlert = true;
      discrepancyMsg += discrepancyMsg ? '<br>' : '';
      discrepancyMsg += `⚠ Discrepancy! Level ${level} has ${preparedDomainSpellsCount} prepared domain spells, but 1 was expected!`;
    }
    const discrepancyHtml = showDiscrepancyAlert
      ? `<div class="discrepancy-alert" style="color: darkorange; font-size: 0.9em; margin-bottom: 5px; font-weight: bold;">${discrepancyMsg}</div>`
      : '';

    if (hasKnownCards) {
      if (slotsToRender > 0 || expectedSlots > 0 || levelKnown.length > 0) {
        const remaining = levelPreparedSpells.filter((s: any) => !(s && (s.used || s.isUsed))).length;
        const total = slotsToRender || expectedSlots;
        const noSlotsLeft = remaining <= 0;
        const sortedSpells = [...levelKnown].sort((a, b) => {
          const nameA = typeof a === 'string' ? a : (a.spellName || '');
          const nameB = typeof b === 'string' ? b : (b.spellName || '');
          return nameA.localeCompare(nameB);
        });
        const cardsHtml = sortedSpells.map((sp, idx) => {
          const spellName = typeof sp === 'string' ? sp : (sp.spellName || '');
          const isValid = typeof sp === 'string' ? true : (sp.isValid !== false);
          const saveDc = typeof sp === 'object' && sp !== null ? sp.saveDc : null;
          const saveDcString = typeof sp === 'object' && sp !== null ? (sp.saveDcString || '') : '';
          const dcHtml = (typeof saveDc === 'number')
            ? ` <span class="action-slot-mod" data-save-dc-tooltip="${saveDcString.replace(/"/g, '&quot;')}" title="${saveDcString.replace(/"/g, '&quot;')}">DC ${saveDc}</span>`
            : '';
          const usedClass = noSlotsLeft ? 'used' : '';
          const invalidClass = !isValid ? 'invalid' : '';
          return `<div class="spell-slot filled ${usedClass} ${invalidClass}" data-level="${level}" data-slot="${idx}" data-spell="${spellName}" data-used="${noSlotsLeft}" data-valid="${isValid}" data-class="${className}" data-preparation="Spontaneous" title="${spellName}">${spellName}${dcHtml}</div>`;
        }).join('');

        renderedLevels.push({
          level,
          tabTitle: `Level ${level} (${remaining}/${total})`,
          listHeaderTitle: `Level ${level} Spells (${remaining}/${total})`,
          discrepancyHtml,
          gridHtml: `<div class="spell-slot-grid">${cardsHtml}</div>`
        });
      }
    } else {
      const shouldRenderLevel = slotsToRender > 0 || expectedSlots > 0 || preparedDomainSpellsCount > 0;
      if (shouldRenderLevel) {
        const remainingNormal = levelPreparedSpells.filter((s: any) => !(s && (s.used || s.isUsed))).length;
        const remainingDomain = domainSpells.filter((s: any) => !(s && (s.used || s.isUsed))).length;
        const totalPrepared = (slotsToRender || expectedSlots) + (hasDomainSlot ? Math.max(1, preparedDomainSpellsCount) : 0);
        const remainingTotal = remainingNormal + remainingDomain;
        const listHeaderTitle = `Level ${level} Spells (${expectedSlots} slot${expectedSlots !== 1 ? 's' : ''}${hasDomainSlot ? ' + 1 domain' : ''})`;
        const tabTitle = `Level ${level} (${remainingTotal}/${totalPrepared})`;

        const normalSlotsHtml = Array(slotsToRender).fill(0).map((_, index) => {
          const spellData = levelPreparedSpells[index];
          const isEmpty = !spellData || spellData.isEmpty;
          let spellName = '';
          let isUsed = false;
          let isValid = true;
          let saveDc: number | null = null;
          let saveDcString = '';
          if (spellData) {
            if (typeof spellData === 'string') {
              spellName = spellData;
            } else if (typeof spellData === 'object') {
              spellName = spellData.spell || '';
              isUsed = spellData.used || false;
              if (spellData.isValid === false) {
                isValid = false;
              }
              if (typeof spellData.saveDc === 'number') {
                saveDc = spellData.saveDc;
                saveDcString = spellData.saveDcString || '';
              }
            }
          }
          let isSpontaneousEmpty = false;
          if (preparation === 'Spontaneous' && typeof spellName === 'string') {
            if (spellName.toLowerCase().startsWith('spontaneous') && !isUsed) {
              isSpontaneousEmpty = true;
            }
          }
          const invalidClass = (!isEmpty && !isSpontaneousEmpty && !isValid) ? 'invalid' : '';
          const slotClass = (isEmpty || isSpontaneousEmpty) ? 'empty' : 'filled';
          const usedClass = isUsed ? 'used' : '';
          const dcHtml = (!isEmpty && !isSpontaneousEmpty && saveDc !== null)
            ? ` <span class="action-slot-mod" data-save-dc-tooltip="${saveDcString.replace(/"/g, '&quot;')}" title="${saveDcString.replace(/"/g, '&quot;')}">DC ${saveDc}</span>`
            : '';
          const displayText = (isEmpty || isSpontaneousEmpty) ? '' : `${spellName}${dcHtml}`;
          return `<div class="spell-slot ${slotClass} ${usedClass} ${invalidClass}" data-level="${level}" data-slot="${index}" data-spell="${spellName}" data-used="${isUsed}" data-valid="${isValid}" data-class="${className}" data-preparation="${preparation}" title="${spellName || 'Empty slot'}">${displayText}</div>`;
        }).join('');

        const domainSlotsHtml = hasDomainSlot ? (() => {
          let domainHtml = '';
          const domainSlotsToRender = Math.max(1, preparedDomainSpellsCount);
          for (let d = 0; d < domainSlotsToRender; d++) {
            const domainSpellData = domainSpells[d];
            const isEmpty = !domainSpellData || domainSpellData.isEmpty;
            let domainSpellName = '';
            let domainIsUsed = false;
            let domainIsValid = true;
            let domainSaveDc: number | null = null;
            let domainSaveDcString = '';
            if (domainSpellData) {
              if (typeof domainSpellData === 'string') {
                domainSpellName = domainSpellData;
              } else if (typeof domainSpellData === 'object') {
                domainSpellName = domainSpellData.spell || '';
                domainIsUsed = domainSpellData.used || false;
                if (domainSpellData.isValid === false) {
                  domainIsValid = false;
                }
                if (typeof domainSpellData.saveDc === 'number') {
                  domainSaveDc = domainSpellData.saveDc;
                  domainSaveDcString = domainSpellData.saveDcString || '';
                }
              }
            }
            const domainInvalidClass = (!isEmpty && !domainIsValid) ? 'invalid' : '';
            const domainSlotClass = isEmpty ? 'empty' : 'filled';
            const domainUsedClass = domainIsUsed ? 'used' : '';
            const domainDcHtml = (!isEmpty && domainSaveDc !== null)
              ? ` <span class="action-slot-mod" data-save-dc-tooltip="${domainSaveDcString.replace(/"/g, '&quot;')}" title="${domainSaveDcString.replace(/"/g, '&quot;')}">DC ${domainSaveDc}</span>`
              : '';
            const domainDisplayText = isEmpty ? '' : `${domainSpellName}${domainDcHtml}`;
            domainHtml += `
              <div class="spell-slot-separator"></div>
              <div class="spell-slot domain-slot ${domainSlotClass} ${domainUsedClass} ${domainInvalidClass}" data-level="${level}" data-slot="${d}" data-spell="${domainSpellName}" data-used="${domainIsUsed}" data-valid="${domainIsValid}" data-class="${className}" data-preparation="${preparation}" title="${domainSpellName || 'Empty domain slot'}">${domainDisplayText}</div>
            `;
          }
          return domainHtml;
        })() : '';

        renderedLevels.push({
          level,
          tabTitle,
          listHeaderTitle,
          discrepancyHtml,
          gridHtml: `<div class="spell-slot-grid">${normalSlotsHtml}${domainSlotsHtml}</div>`
        });
      }
    }
  }

  if (renderedLevels.length === 0) {
    return '<div>No spell slots available at all.</div>';
  }

  if (effectiveLayout === 'tabs') {
    const currentTab = activeSpontaneousLevelTabs[className];
    if (!currentTab || !renderedLevels.some(l => String(l.level) === currentTab)) {
      activeSpontaneousLevelTabs[className] = String(renderedLevels[0].level);
    }
    const activeLevelStr = activeSpontaneousLevelTabs[className];
    let tabsHtml = '<div class="action-tabs">';
    let panelsHtml = '';
    renderedLevels.forEach(entry => {
      const isActive = String(entry.level) === activeLevelStr;
      tabsHtml += `<span class="action-tab${isActive ? ' active' : ''}" data-spont-class="${className}" data-spont-level="${entry.level}" onclick="selectSpontaneousLevelTab('${className}', '${entry.level}')">${entry.tabTitle}</span>`;
      panelsHtml += `
        <div class="action-tab-panel${isActive ? ' active' : ''}" data-spont-level="${entry.level}">
          ${entry.discrepancyHtml}
          ${entry.gridHtml}
        </div>
      `;
    });
    tabsHtml += '</div>';
    return tabsHtml + panelsHtml;
  }

  return renderedLevels.map(entry => {
    const safeLevelKey = `spellLevel_${String(className).replace(/\s+/g, '_')}_${entry.level}`;
    const levelSectionId = `${safeLevelKey}Section`;
    const isLevelCollapsed = collapsedIds.has(levelSectionId);
    return `
      <div class="spell-level-slots${isLevelCollapsed ? ' collapsed' : ''}" id="${levelSectionId}">
        <div class="spell-level-header">
          <h4>${entry.listHeaderTitle}</h4>
          <button class="collapse-button" id="${safeLevelKey}CollapseBtn" onclick="toggleCollapse('${safeLevelKey}')" title="Collapse/Expand">${isLevelCollapsed ? '▼' : '▲'}</button>
        </div>
        <div class="spell-level-body">
          ${entry.discrepancyHtml}
          ${entry.gridHtml}
        </div>
      </div>
    `;
  }).join('');
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
    const target = event.target.closest('.spell-slot') as HTMLElement | null;
    if (target) {
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

