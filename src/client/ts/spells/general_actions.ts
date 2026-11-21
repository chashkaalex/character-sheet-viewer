import { characterRep } from '../state';
import { onCharacterRepresentation } from '../character_script';
import { checkActionCostWithPrompt, consumeActionCost, ActionCostType } from '../round_actions';
import { positionPopup, hideSpellPopup, getCurrentSlotData } from './spell_popup';

let activeActionCategoryTab: string | null = null;

export function selectActionCategoryTab(category: string) {
  activeActionCategoryTab = category;
  const container = document.getElementById('generalActionsContainer');
  if (!container || typeof container.querySelectorAll !== 'function') return;

  container.querySelectorAll('.action-tab').forEach((tab: any) => {
    const isMatch = tab.getAttribute('data-action-tab') === category;
    if (tab.classList) {
      tab.classList.toggle('active', isMatch);
    }
  });

  container.querySelectorAll('.action-tab-panel').forEach((panel: any) => {
    const isMatch = panel.getAttribute('data-action-category') === category;
    if (panel.classList) {
      panel.classList.toggle('active', isMatch);
    }
  });
}


/**
 * Renders the categorized actions UI grids (General, Class, Feat, Stance, Item).
 */
export function renderGeneralActionsUI() {
  const container = document.getElementById('generalActionsContainer');
  if (!container) return;

  const collapsedIds = new Set<string>();
  if (typeof container.querySelectorAll === 'function') {
    container.querySelectorAll('.collapsed').forEach((el: any) => {
      if (el.id) collapsedIds.add(el.id);
    });
  }

  container.innerHTML = '';

  if (!characterRep || !characterRep.actions || characterRep.actions.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  const ACTION_SECTIONS: Array<{ category: string; title: string }> = (
    Array.isArray((characterRep as any).actionCategories) && (characterRep as any).actionCategories.length > 0
      ? (characterRep as any).actionCategories
      : [
        { category: 'general', title: 'General Actions' },
        { category: 'class', title: 'Class Actions' },
        { category: 'feat', title: 'Feat Actions' },
        { category: 'stance', title: 'Stances' },
        { category: 'item', title: 'Item Actions' }
      ]
  );

  const categorized: Record<string, string[]> = {};
  ACTION_SECTIONS.forEach(s => {
    categorized[s.category] = [];
  });

  if ((characterRep as any).categorizedActions) {
    for (const key of Object.keys(categorized)) {
      if (Array.isArray((characterRep as any).categorizedActions[key])) {
        categorized[key] = (characterRep as any).categorizedActions[key];
      }
    }
  } else {
    characterRep.actions.forEach(actionName => {
      const metadata = (characterRep as any).actionsMetadata && (characterRep as any).actionsMetadata[actionName];
      const cat = (metadata && metadata.category) || 'general';
      if (categorized[cat]) {
        categorized[cat].push(actionName);
      } else {
        categorized.general.push(actionName);
      }
    });
  }

  const nonEmptySections = ACTION_SECTIONS.filter(
    section => (categorized[section.category] || []).length > 0
  );

  if (!activeActionCategoryTab || !nonEmptySections.some(s => s.category === activeActionCategoryTab)) {
    activeActionCategoryTab = nonEmptySections[0]?.category || null;
  }

  const isActionsCollapsed = collapsedIds.has('actionsSection');
  const actionsDiv = document.createElement('div');
  actionsDiv.id = 'actionsSection';
  actionsDiv.className = 'spellcasting-class' + (isActionsCollapsed ? ' collapsed' : '');

  let tabsHtml = '<div class="action-tabs">';
  let panelsHtml = '';
  let globalSlotIndex = 0;

  nonEmptySections.forEach(section => {
    const sectionActions = categorized[section.category] || [];
    const isActive = section.category === activeActionCategoryTab;

    tabsHtml += `<span class="action-tab${isActive ? ' active' : ''}" data-action-tab="${section.category}" onclick="selectActionCategoryTab('${section.category}')">${section.title}</span>`;

    const catResource = (characterRep as any).actionCategoryResources?.[section.category];
    const hasUses = !catResource || catResource.remaining > 0;
    const resourceBannerHtml = catResource
      ? `<div class="action-category-resource" style="margin-bottom: 10px; font-weight: bold; color: var(--primary-color);">${catResource.label || 'Uses'}: <span style="color: ${hasUses ? 'var(--accent-color)' : '#dc3545'};">${catResource.remaining} / ${catResource.max}</span></div>`
      : '';

    panelsHtml += `
      <div class="action-tab-panel${isActive ? ' active' : ''}" data-action-category="${section.category}">
        ${resourceBannerHtml}
        <div class="spell-slot-grid">
    `;

    sectionActions.forEach(actionName => {
      const metadata = (characterRep as any).actionsMetadata && (characterRep as any).actionsMetadata[actionName];
      const statusName = (metadata && metadata.statusName) || actionName;
      const isActionActive = characterRep.statuses && characterRep.statuses.some((s: any) =>
        s.name === statusName || s.name.startsWith(statusName + ' +') || s.name.startsWith(statusName + ' -')
      );
      const slotClass = 'filled';
      const usedClass = isActionActive ? 'used' : '';
      const isSlotValid = hasUses;
      const invalidClass = isSlotValid ? '' : ' invalid';

      panelsHtml += `<div class="spell-slot ${slotClass} ${usedClass}${invalidClass}" data-level="actions" data-slot="${globalSlotIndex++}" data-spell="${actionName}" data-used="${isActionActive}" data-valid="${isSlotValid}" data-class="Actions" data-preparation="Actions" data-category="${section.category}" title="${actionName}">${actionName}</div>`;
    });

    panelsHtml += `
        </div>
      </div>
    `;
  });

  tabsHtml += '</div>';

  actionsDiv.innerHTML = `
    <div class="spellcasting-class-header" style="display: flex; justify-content: flex-start; align-items: center; gap: 10px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px; margin-bottom: 15px;">
        <h3 style="margin: 0; border: none; padding: 0; font-size: 1.3em; color: var(--primary-color);">Actions</h3>
        <button class="collapse-button" id="actionsCollapseBtn" onclick="toggleCollapse('actions')" title="Collapse/Expand">${isActionsCollapsed ? '▼' : '▲'}</button>
    </div>
    <div class="spell-slots-container">
      ${tabsHtml}
      ${panelsHtml}
    </div>
  `;

  container.appendChild(actionsDiv);
}

/**
 * Client-side handler to trigger using a general action.
 */
export function useAction() {
  const slotData = getCurrentSlotData();
  if (!slotData || !slotData.spellName) {
    console.error('No action selected');
    return;
  }

  const metadata = (characterRep as any).actionsMetadata?.[slotData.spellName];
  const actionCost: ActionCostType = metadata?.actionType || 'standard';
  const isMovement = ['Charge', 'Run', 'Withdraw'].includes(slotData.spellName);

  if (!checkActionCostWithPrompt(characterRep.docId, actionCost, { isMovement })) {
    return;
  }

  const targetCheckboxes = document.querySelectorAll('#spellTargetContainer input[name="spellTarget"]:checked');
  const targets = targetCheckboxes.length > 0
    ? Array.from(targetCheckboxes).map((cb: any) => cb.value)
    : undefined;

  console.log('Using action:', slotData.spellName, targets);

  google.script.run
    .withSuccessHandler((rep: any) => {
      consumeActionCost(characterRep.docId, slotData.spellName, actionCost, { isMovement });
      onCharacterRepresentation(rep);
    })
    .withFailureHandler(function (error) {
      console.error('Error using action:', error);
      alert('Error using action: ' + error.message);
    })
    .OnUseAction(characterRep.docId, slotData.spellName, targets);

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

  if (!checkActionCostWithPrompt(characterRep.docId, 'move', { isMovement: true })) {
    return;
  }

  console.log('Executing Move Action:', feet);

  google.script.run
    .withSuccessHandler((rep: any) => {
      consumeActionCost(characterRep.docId, `Move ${feet} ft`, 'move', { isMovement: true });
      onCharacterRepresentation(rep);
    })
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

  const actionCost: ActionCostType = metadata.actionType || 'free';
  if (!checkActionCostWithPrompt(characterRep.docId, actionCost)) {
    return;
  }

  console.log(`Executing Number Action ${actionName}:`, value);

  google.script.run
    .withSuccessHandler((rep: any) => {
      consumeActionCost(characterRep.docId, actionName, actionCost);
      onCharacterRepresentation(rep);
    })
    .withFailureHandler(function (error) {
      console.error(`Error executing number action ${actionName}:`, error);
      alert('Error: ' + error.message);
    })
    .OnUseNumberAction(characterRep.docId, actionName, value);

  hideNumberActionPopup();
}

