import { characterRep, setCharacterRep } from './state';
import { populateWeaponDropdown, populateSpecialAttackDropdown, RemoveStatus } from './dashboard_script';
import { PrepareSpellsUI } from './spells_script';
import { startPartyStatusListener } from './party_sync_listener';

export function onCharacterRepresentation(response) {
  console.log('char response handler called!!!');

  if (response.error) {
    let errorMessage = response.errorMessage;
    if (response.parseErrors && response.parseErrors.length > 0) {
      errorMessage += '\n\nDetails:\n' + response.parseErrors.join('\n');
    }
    alert(errorMessage);
    return;
  }

  if (!response.parseSuccess) {
    alert('Parse errors:\n' + response.parseErrors.join('\n'));
    return;
  }

  if (response.parseWarnings.length > 0) {
    alert('Parse warnings:\n' + response.parseWarnings.join('\n'));
  }

  setCharacterRep(response);

  if (response.mutationMessage) {
    alert(response.mutationMessage);
  }

  // Populate quick statuses datalist for adding new statuses
  const datalist = document.getElementById('quickStatusesList') as HTMLDataListElement;
  if (datalist) {
    datalist.innerHTML = '';
    if (characterRep.quickStatuses && characterRep.quickStatuses.length > 0) {
      characterRep.quickStatuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        datalist.appendChild(option);
      });
    }
  }

  // Always render statuses from server (this will clear existing ones and show only server statuses)
  renderServerStatuses(characterRep.statuses || []);

  //parsing and rendering
  // Format: Name, race classname1 classlevel1/classname2 classlevel2 etc.
  const docUrl = `https://docs.google.com/document/d/${characterRep.docId}/edit`;
  let nameDisplay = `<a href="${docUrl}" target="_blank" rel="noopener noreferrer">${characterRep.name}</a>`;

  if (characterRep.race) {
    nameDisplay += ` ( ${characterRep.race}`;
  }

  if (characterRep.classes && characterRep.classes.length > 0) {
    const classStrings = characterRep.classes.map(c => `${c.name} ${c.level}`);
    nameDisplay += ` ${classStrings.join('/')}`;
    nameDisplay += ' )';
  }

  document.getElementById('characterName').innerHTML = nameDisplay;

  //render hp
  document.getElementById('hpCurrent').innerHTML = characterRep.hp.current;
  document.getElementById('hpMax').innerHTML = characterRep.hp.max;
  const hpMeter = document.getElementById('hpMeter') as HTMLMeterElement;
  hpMeter.value = characterRep.hp.current;
  hpMeter.max = characterRep.hp.max;


  //render saves
  if (characterRep.saves) {
    UpdateValueAndTooltip('fortBonus', characterRep.saves.Fort);
    UpdateValueAndTooltip('refBonus', characterRep.saves.Ref);
    UpdateValueAndTooltip('willBonus', characterRep.saves.Will);
  }
  //render initiative and AC
  UpdateValueAndTooltip('initBonus', characterRep.initBonus);

  //render speed
  document.getElementById('speedValue').innerHTML = characterRep.speed?.currentScore || '-';
  if (characterRep.speed) {
    addTooltip('speedValue', characterRep.speed.string);
  }

  UpdateValueAndTooltip('acValue', characterRep.ac);
  if (characterRep.ac && characterRep.ac.touch) {
    UpdateValueAndTooltip('touchAcValue', characterRep.ac.touch);
  }
  if (characterRep.ac && characterRep.ac.flatFooted) {
    UpdateValueAndTooltip('flatFootedAcValue', characterRep.ac.flatFooted);
  }

  // Populate weapon dropdown and display weapon stats
  populateWeaponDropdown();

  // Populate special attack dropdown and display special attack stats
  populateSpecialAttackDropdown();

  // Update attacks of opportunity
  UpdateValueAndTooltip('attacksOfOpportunity', characterRep.attacksOfOpportunity);

  //populate abilities table
  const abilitiesTableBody = document.querySelector('#abilitiesTable tbody');
  abilitiesTableBody.innerHTML = '';

  if (characterRep.abilities) {
    const abilityOrder = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];
    abilityOrder.forEach(abilityName => {
      const ability = characterRep.abilities[abilityName];
      if (ability) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="row-style">${abilityName}</td>
          <td class="row-style ability-score" data-ability="${abilityName}" data-field="score">${ability.score}</td>
          <td class="row-style ability-current" data-ability="${abilityName}" data-field="currentScore">${ability.currentScore}</td>
          <td class="row-style ability-modifier" data-ability="${abilityName}" data-field="modifier">${ability.modifier}</td>
        `;
        abilitiesTableBody.appendChild(row);

        // Add tooltips to ability properties
        const currentScoreElement = row.querySelector('.ability-current');
        addTooltip(currentScoreElement, ability.string, ability.rolzRollMessage);

        const modifierElement = row.querySelector('.ability-modifier');
        addTooltip(modifierElement, ability.string, ability.rolzRollMessage);
      }
    });
  }

  //populate skills table
  const skillsTableBody = document.querySelector('#skillsTable tbody');
  // Clear previous rows before repopulating to avoid duplicates
  skillsTableBody.innerHTML = '';
  if (characterRep.skills) {
    Object.entries(characterRep.skills)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([skillName, skill]: [string, any]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
              <td class="row-style">${skillName}</td>
              <td class="row-style skill-rank" data-skill="${skillName}">${skill.score}</td>
              <td class="row-style skill-bonus" data-skill="${skillName}">${skill.bonus}</td>
          `;
        skillsTableBody.appendChild(row);

        // Add tooltips to skill properties
        const bonusElement = row.querySelector('.skill-bonus');
        addTooltip(bonusElement, skill.string, skill.rolzRollMessage);
      });
  }

  //populate spells
  PrepareSpellsUI();

  //populate inventory
  populateInventory();

  //populate party UI
  const partyBtn = document.getElementById('partyButton');
  if (characterRep && characterRep.partyName) {
    partyBtn.style.display = 'inline-block';
  } else {
    partyBtn.style.display = 'none';
  }

  console.log(characterRep.partyName);
  console.log(characterRep.partyMembers);
  if (characterRep.dbLink) {
    console.log(`Firebase Realtime Database link: ${characterRep.dbLink}`);
    startPartyStatusListener(characterRep);
  } else {
    console.log('Firebase Realtime Database link (DB_LINK) not configured.');
  }

  // Trigger top bar ready animation
  const header = document.querySelector('.header');
  if (header) {
    header.classList.remove('ui-ready');
    void (header as HTMLElement).offsetWidth; // force reflow to restart animation
    header.classList.add('ui-ready');
  }
}

export function UpdateValueAndTooltip(element, property) {
  const value = property.bonus !== undefined ? property.bonus : (property.currentScore !== undefined ? property.currentScore : '-');
  document.getElementById(element).innerHTML = value;
  if (property) {
    addTooltip(element, property.string, property.rolzRollMessage);
  }
}

export function renderServerStatuses(statuses) {
  const statusesList = document.getElementById('statusesList');
  const emptyStatus = document.getElementById('emptyStatus');

  // Enable/disable the clear all button based on status presence
  const clearAllBtn = document.getElementById('clearAllStatusesButton') as HTMLButtonElement;
  if (clearAllBtn) {
    clearAllBtn.disabled = (!statuses || statuses.length === 0);
  }

  // Clear any existing statuses (except the empty template)
  const existingStatuses = statusesList.querySelectorAll('.status-item:not(#emptyStatus)');
  existingStatuses.forEach(status => status.remove());

  // Render each status from the server
  statuses.forEach(status => {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'status-item';

    // Create the status display using the shared function
    const statusData = {
      name: status.name,
      duration: status.duration,
      elapsed: status.elapsed
    };

    createStatusDisplay(statusDiv, statusData);

    // Insert before the empty status template
    statusesList.insertBefore(statusDiv, emptyStatus);
  });
}

/**
 * Converts rounds to a readable time format
 * @param {number} rounds - The number of rounds
 * @returns {string} - Formatted time string
 */
export function formatRoundsToReadable(rounds) {
  if (rounds < 0) {
    return 'endless';
  }
  if (rounds >= 360) {
    const hours = Math.floor(rounds / 360);
    const remainingRounds = rounds % 360;
    if (remainingRounds === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const minutes = Math.floor(remainingRounds / 6);
    const finalRounds = remainingRounds % 6;
    const parts = [`${hours} hour${hours !== 1 ? 's' : ''}`];
    if (minutes > 0) parts.push(`${minutes} min${minutes !== 1 ? 's' : ''}`);
    if (finalRounds > 0) parts.push(`${finalRounds} round${finalRounds !== 1 ? 's' : ''}`);
    return parts.join(', ');
  } else if (rounds >= 6) {
    const minutes = Math.floor(rounds / 6);
    const remainingRounds = rounds % 6;
    if (remainingRounds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} min${minutes !== 1 ? 's' : ''}, ${remainingRounds} round${remainingRounds !== 1 ? 's' : ''}`;
  } else {
    return `${rounds} round${rounds !== 1 ? 's' : ''}`;
  }
}

export function createStatusDisplay(containerElement, statusData) {
  // Clear the container and create the new structure
  containerElement.innerHTML = '';

  // Create the status name display
  const nameSpan = document.createElement('span');
  nameSpan.className = 'status-name-display';
  nameSpan.textContent = statusData.name;
  containerElement.appendChild(nameSpan);

  // Create the duration display with readable format
  const durationSpan = document.createElement('span');
  durationSpan.className = 'status-duration-display';
  durationSpan.textContent = `Duration: ${formatRoundsToReadable(statusData.duration)}`;
  containerElement.appendChild(durationSpan);

  // Create the elapsed display with readable format
  const elapsedSpan = document.createElement('span');
  elapsedSpan.className = 'status-elapsed-display';
  elapsedSpan.textContent = `Elapsed: ${formatRoundsToReadable(statusData.elapsed)}`;
  containerElement.appendChild(elapsedSpan);

  // Add the remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'status-remove-btn';
  removeBtn.textContent = '✖';
  removeBtn.onclick = function () { RemoveStatus(this, statusData.name); };
  containerElement.appendChild(removeBtn);
}

// Custom Tooltip Logic
let activeTooltipElement = null;

export function addTooltip(element, tooltipText, rolzRollMessage?: string) {
  // If element is an ID string, get the element
  if (typeof element === 'string') {
    element = document.getElementById(element);
  }

  if (element && tooltipText) {
    // Remove native title to prevent default browser tooltip
    element.removeAttribute('title');
    element.dataset.tooltip = tooltipText;
    if (rolzRollMessage) {
      element.dataset.rolzRollMessage = rolzRollMessage;
    } else {
      delete element.dataset.rolzRollMessage;
    }
    element.style.cursor = 'help';

    // Desktop: Hover events
    element.addEventListener('mouseenter', function (e) {
      // If we hover a new element, unlock the previous one if it's different
      if (activeTooltipElement && activeTooltipElement !== this) {
        activeTooltipElement = null;
      }
      showTooltip(this);
    });

    element.addEventListener('mouseleave', function (e) {
      // Only hide if this element is NOT the currently locked (clicked) one
      if (activeTooltipElement !== this) {
        hideTooltip();
      }
    });

    // Mobile/Touch: Click to toggle
    element.addEventListener('click', function (e) {
      e.stopPropagation(); // Prevent document click from immediately hiding it

      if (activeTooltipElement === this) {
        // If clicking the locked element, unlock and hide
        hideTooltip();
        activeTooltipElement = null;
      } else {
        // Lock this element
        showTooltip(this);
        activeTooltipElement = this;
      }
    });
  }
}

export function showTooltip(element) {
  const tooltip = document.getElementById('custom-tooltip');
  const text = element.dataset.tooltip;

  if (!tooltip || !text) return;

  tooltip.innerHTML = '';
  const textDiv = document.createElement('div');
  textDiv.textContent = text;
  tooltip.appendChild(textDiv);

  const rollMessage = element.dataset.rolzRollMessage;
  if (rollMessage) {
    const divider = document.createElement('hr');
    divider.className = 'tooltip-divider';
    tooltip.appendChild(divider);

    const rollBtn = document.createElement('button');
    rollBtn.className = 'tooltip-roll-btn';

    if (characterRep && characterRep.rolzRoomId) {
      rollBtn.innerHTML = `🎲 <span class="roll-expr">Roll to Rolz (${characterRep.rolzRoomId})</span>`;
      rollBtn.title = `Click to roll ${rollMessage} directly in room ${characterRep.rolzRoomId}`;

      rollBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        rollBtn.disabled = true;
        rollBtn.textContent = '🎲 Rolling...';

        // @ts-ignore
        google.script.run
          .withSuccessHandler((responseStr: string) => {
            rollBtn.disabled = false;
            rollBtn.innerHTML = `🎲 <span class="roll-expr">Roll to Rolz (${characterRep.rolzRoomId})</span>`;

            try {
              const res = JSON.parse(responseStr);
              const item = res.message?.content?.items?.[0];
              if (item) {
                const resultVal = item.result;
                const detailsVal = item.details || '';
                const preVal = item.pre || '';
                const commentVal = item.comment || '';
                const label = preVal || (commentVal ? `${commentVal}: ` : '');
                alert(`Roll Result: ${label}${resultVal} ${detailsVal}`);
              } else {
                alert(`API response did not contain a roll: ${responseStr}`);
              }
            } catch (err: any) {
              console.error(err);
              alert(`Error parsing Rolz response: ${err.message}\nRaw: ${responseStr}`);
            }
          })
          .withFailureHandler((err: any) => {
            rollBtn.disabled = false;
            rollBtn.innerHTML = `🎲 <span class="roll-expr">Roll to Rolz (${characterRep.rolzRoomId})</span>`;
            alert(`Error communicating with server: ${err.message}`);
          })
          .PostRollToRolz(characterRep.rolzRoomId, rollMessage, characterRep.name);
      });
    } else {
      rollBtn.innerHTML = `🎲 <span class="roll-expr">${rollMessage}</span>`;
      rollBtn.title = 'Click to copy Rolz command';

      rollBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid closing/toggling
        navigator.clipboard.writeText(rollMessage).then(() => {
          showToast(`Copied roll code: ${rollMessage}`);
        }).catch(err => {
          console.error('Could not copy text: ', err);
        });
      });
    }
    tooltip.appendChild(rollBtn);
  }

  tooltip.classList.add('show');

  // Position logic
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // Default: Top center
  let top = rect.top - tooltipRect.height - 10;
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

  // Check bounds and adjust
  // If too high (off screen), move to bottom
  if (top < 0) {
    top = rect.bottom + 10;
  }

  // If too far left
  if (left < 10) {
    left = 10;
  }

  // If too far right
  if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }

  tooltip.style.top = `${top + window.scrollY}px`;
  tooltip.style.left = `${left + window.scrollX}px`;
}

export function hideTooltip() {
  const tooltip = document.getElementById('custom-tooltip');
  if (tooltip) {
    tooltip.classList.remove('show');
  }
}

export function showToast(message: string) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger transition
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remove after 2.5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2500);
}

// Close tooltip when clicking anywhere else
if (typeof document !== 'undefined') {
  document.addEventListener('click', function (e) {
    if (activeTooltipElement && !activeTooltipElement.contains(e.target as Node)) {
      hideTooltip();
      activeTooltipElement = null;
    }
  });
}

/**
 * Populates the inventory lists with parsed items from character data
 */
export function populateInventory() {
  // Clear existing items and populate both lists
  const battleGearList = document.getElementById('battleGearList');
  const possessionsList = document.getElementById('possessionsList');

  populateInventoryList(battleGearList, characterRep.battleGear, 'battleGear');
  populateInventoryList(possessionsList, characterRep.possessions, 'possessions');
  populateBodySlots(characterRep.battleGear);

  // Update filter button appearances based on current filters
  updateFilterButtonAppearance('battleGear', currentFilters.battleGear);
  updateFilterButtonAppearance('possessions', currentFilters.possessions);

  // Reinitialize inventory click handlers
  initializeInventory();
}

/**
 * Populates a single inventory list with items from character data
 */
export function populateInventoryList(element, items, listType) {
  element.innerHTML = '';

  if (items && items.length > 0) {
    // Filter items based on current filter
    const filteredItems = filterItemsByType(items, currentFilters[listType]);

    filteredItems.forEach((item, index) => {
      const itemElement = createInventoryItem(item, index, listType);
      element.appendChild(itemElement);
    });
  } else {
    // Add placeholder if no items
    const placeholder = document.createElement('div');
    placeholder.className = 'inventory-item';
    const placeholderText = listType === 'battleGear' ? 'No battle gear found' : 'No possessions found';
    placeholder.innerHTML = `<span style="color: #666; font-style: italic;">${placeholderText}</span>`;
    element.appendChild(placeholder);
  }
}

/**
 * Filters items based on the filter type
 */
export function filterItemsByType(items, filterType) {
  if (filterType === 'all') {
    return items;
  }

  return items.filter(item => {
    switch (filterType) {
      case 'equipment':
        // Items with bodySlot not being null (equipment that can be worn)
        return item.bodySlot !== null && item.bodySlot !== undefined;
      case 'weapons':
        // Items that are weapons
        return item.isWeapon === true;
      case 'potions':
        // Items that are potions
        return item.isPotion === true;
      case 'scrolls':
        // Items that are scrolls
        return item.isScroll === true;
      default:
        return true;
    }
  });
}

/**
 * Creates an inventory item element with the format Name x Amount
 */
export function createInventoryItem(item, index, listType) {
  const itemElement = document.createElement('div');
  itemElement.className = 'inventory-item';
  itemElement.dataset.item = `${listType}_${index}`;

  // Format as Name x Amount with amount aligned to the right
  // Include material if it exists: ${material} ${name}
  let nameText = item.material && !item.name.includes(item.material) ? `${item.material} ${item.name}` : item.name;

  // Add symbols for different item types
  if (item.isPotion) {
    nameText = `🧪 ${nameText}`;
  } else if (item.isScroll) {
    nameText = `📜 ${nameText}`;
  } else if (item.isWeapon) {
    nameText = `⚔ ${nameText}`;
  } else if (item.bodySlot !== null && item.bodySlot !== undefined) {
    nameText = `𐂫 ${nameText}`;
  }

  const amountText = item.amount > 1 ? `x ${item.amount}` : '';

  const actionIcon = listType === 'battleGear' ? '🎒' : '⚔';
  const actionTitle = listType === 'battleGear' ? 'Move to Possessions' : 'Move to Battle Gear';

  let buttonsHtml = `<button class="inventory-item-action" onclick="event.stopPropagation(); moveInventoryItem('${listType}', ${index})" title="${actionTitle}">${actionIcon}</button>`;

  if (listType === 'battleGear' && item.isPotion) {
    buttonsHtml += `<button class="inventory-item-action" onclick="event.stopPropagation(); usePotion(${index})" title="Drink Potion">🧪</button>`;
  }

  itemElement.innerHTML = `
    <label>${nameText}</label>
    <span style="text-align: right; margin-left: auto;">${amountText}</span>
    ${buttonsHtml}
  `;

  return itemElement;
}

// Inventory management functions
export function initializeInventory() {
  // Inventory selection/movement is removed.
}

/**
 * Collapses or expands an inventory section
 */
export function toggleCollapse(listType: string) {
  const section = document.getElementById(`${listType}Section`);
  const btn = document.getElementById(`${listType}CollapseBtn`);
  if (!section || !btn) return;

  const isCollapsed = section.classList.toggle('collapsed');
  btn.textContent = isCollapsed ? '▼' : '▲';
}

// Filter functionality
const currentFilters = {
  battleGear: 'all',
  possessions: 'all'
};

export function toggleFilterDropdown(listType) {
  const dropdown = document.getElementById(listType + 'Filter');
  const isShowing = dropdown.classList.contains('show');

  // Close all other dropdowns
  document.querySelectorAll('.filter-dropdown').forEach(dd => {
    dd.classList.remove('show');
  });

  // Toggle current dropdown
  if (!isShowing) {
    dropdown.classList.add('show');
  }
}

export function filterItems(listType, filterType) {
  currentFilters[listType] = filterType;

  // Close dropdown
  document.getElementById(listType + 'Filter').classList.remove('show');

  // Update filter button appearance
  updateFilterButtonAppearance(listType, filterType);

  // Re-populate the inventory with the current filter
  populateInventoryList(
    document.getElementById(listType + 'List'),
    characterRep[listType],
    listType
  );
}

export function updateFilterButtonAppearance(listType, filterType) {
  const filterButton = document.getElementById(`${listType}FilterBtn`);

  // Map filter types to their corresponding icons
  const filterIcons = {
    'all': '🔽',
    'equipment': '𐂫',
    'weapons': '⚔',
    'potions': '🧪',
    'scrolls': '📜'
  };

  // Update the button icon based on the current filter
  filterButton.textContent = filterIcons[filterType] || '🔽';
}

// Close dropdowns when clicking outside
if (typeof document !== 'undefined') {
  document.addEventListener('click', function (event) {
    const target = event.target as HTMLElement;
    if (target && !target.closest('.inventory-header')) {
      document.querySelectorAll('.filter-dropdown').forEach(dd => {
        dd.classList.remove('show');
      });
    }
  });

  // Initialize inventory when the page loads
  document.addEventListener('DOMContentLoaded', function () {
    initializeInventory();
  });
}

/**
 * Populates the equipped slots visual depiction based on Battle Gear items
 */
export function populateBodySlots(battleGear) {
  const slotsListElement = document.getElementById('slotsList');
  if (!slotsListElement) return;
  slotsListElement.innerHTML = '';

  const OFFICIAL_SLOTS = [
    { name: 'Head', possibleAmount: 1 },
    { name: 'Eyes', possibleAmount: 1 },
    { name: 'Neck', possibleAmount: 1 },
    { name: 'Torso', possibleAmount: 1 },
    { name: 'Body', possibleAmount: 1 },
    { name: 'Shoulders', possibleAmount: 1 },
    { name: 'Arms', possibleAmount: 1 },
    { name: 'Hands', possibleAmount: 1 },
    { name: 'Fingers', possibleAmount: 2 },
    { name: 'Waist', possibleAmount: 1 },
    { name: 'Feet', possibleAmount: 1 },
    { name: 'Holy Symbol', possibleAmount: 1 }
  ];

  const SLOT_ICONS = {
    'Head': '🪖',
    'Eyes': '👓',
    'Neck': '📿',
    'Torso': '👕',
    'Body': '👘',
    'Shoulders': '🧣',
    'Arms': '🦾',
    'Hands': '🧤',
    'Fingers': '💍',
    'Waist': '🎗',
    'Feet': '🥾',
    'Holy Symbol': '⛪'
  };

  const assignedItems = new Set();

  OFFICIAL_SLOTS.forEach(slot => {
    // Find matching items in battleGear that haven't been assigned yet
    const matchingItems = (battleGear || []).filter(item =>
      item.bodySlot === slot.name && !assignedItems.has(item)
    );

    for (let i = 0; i < slot.possibleAmount; i++) {
      const item = matchingItems[i];
      const slotItemDiv = document.createElement('div');

      const displayName = slot.possibleAmount > 1 ? `${slot.name} ${i + 1}` : slot.name;
      const icon = SLOT_ICONS[slot.name] || '📦';

      if (item) {
        assignedItems.add(item);
        slotItemDiv.className = 'slot-item occupied';

        const itemNameText = item.material && !item.name.includes(item.material) ? `${item.material} ${item.name}` : item.name;

        slotItemDiv.innerHTML = `
          <span class="slot-icon">${icon}</span>
          <span class="slot-name">${displayName}</span>
          <span class="slot-item-name" title="${itemNameText}">${itemNameText}</span>
        `;
      } else {
        slotItemDiv.className = 'slot-item vacant';
        slotItemDiv.innerHTML = `
          <span class="slot-icon">${icon}</span>
          <span class="slot-name">${displayName}</span>
          <span class="slot-status">Vacant</span>
        `;
      }

      slotsListElement.appendChild(slotItemDiv);
    }
  });
}

/**
 * Invokes server-side MoveInventoryItem mutation
 */
export function moveInventoryItem(listType: string, index: number) {
  const items = listType === 'battleGear' ? characterRep.battleGear : characterRep.possessions;
  const item = items[index];
  if (!item) return;

  const fromSection = listType === 'battleGear' ? 'Battle Gear' : 'Possessions';
  const toSection = listType === 'battleGear' ? 'Possessions' : 'Battle Gear';

  console.log(`Moving item '${item.name}' from ${fromSection} to ${toSection}`);

  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error calling MoveInventoryItem:', error);
      alert('Error moving item: ' + error.message);
    })
    .MoveInventoryItem(characterRep.docId, item.name, fromSection, toSection);
}

/**
 * Invokes server-side UsePotion mutation
 */
export function usePotion(index: number) {
  const item = characterRep.battleGear[index];
  if (!item) return;

  if (!confirm(`Are you sure you want to drink ${item.name}?`)) {
    return;
  }

  console.log(`Drinking potion: ${item.name}`);

  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error calling UsePotion:', error);
      alert('Error drinking potion: ' + error.message);
    })
    .UsePotion(characterRep.docId, item.name);
}
