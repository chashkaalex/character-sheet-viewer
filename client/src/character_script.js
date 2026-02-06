/* eslint-disable no-unused-vars */
/* global RemoveStatus */
let characterRep; // Defined in globals

function onCharacterRepresentation(response) {
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

  characterRep = response;

  // for (const [key, value] of Object.entries(character)) {
  //   console.log(`${key}: ${value}`);
  // }

  // for (const [key, value] of Object.entries(character.skills)) {
  //   console.log(`${key}: ${value}`);
  // }

  // Always render statuses from server (this will clear existing ones and show only server statuses)
  renderServerStatuses(characterRep.statuses || []);

  //parsing and rendering
  // Format: Name, race classname1 classlevel1/classname2 classlevel2 etc.
  let nameDisplay = characterRep.name;

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
  const hpMeter = /** @type {HTMLMeterElement} */ (document.getElementById('hpMeter'));
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

  // Populate weapon dropdown and display weapon stats
  populateWeaponDropdown();

  // Populate special attack dropdown and display special attack stats
  populateSpecialAttackDropdown();

  // Update attacks of opportunity
  UpdateValueAndTooltip('attacksOfOpportunity', characterRep.attacksOfOpportunity);

  //populate abilities table
  //populate abilities table
  const abilitiesTableBody = document.querySelector('#abilitiesTable tbody');
  abilitiesTableBody.innerHTML = '';

  if (characterRep.abilities) {
    Object.entries(characterRep.abilities).forEach(([abilityName, ability]) => {
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
      addTooltip(currentScoreElement, ability.string);
    });
  }

  //populate skills table
  const skillsTableBody = document.querySelector('#skillsTable tbody');
  // Clear previous rows before repopulating to avoid duplicates
  skillsTableBody.innerHTML = '';
  if (characterRep.skills) {
    Object.entries(characterRep.skills).forEach(([skillName, skill]) => {
      const row = document.createElement('tr');
      row.innerHTML = `
              <td class="row-style">${skillName}</td>
              <td class="row-style skill-rank" data-skill="${skillName}">${skill.currentScore}</td>
              <td class="row-style skill-bonus" data-skill="${skillName}">${skill.bonus}</td>
          `;
      skillsTableBody.appendChild(row);

      // Add tooltips to skill properties
      const rankElement = row.querySelector('.skill-rank');
      const bonusElement = row.querySelector('.skill-bonus');
      addTooltip(rankElement, skill.string);
    });
  }

  //populate spells
  PrepareSpellsUI();

  //populate inventory
  populateInventory();

}

function UpdateValueAndTooltip(element, property) {
  const value = property.bonus || property.currentScore || '-';
  document.getElementById(element).innerHTML = value;
  if (property) {
    addTooltip(element, property.string);
  }
}

function renderServerStatuses(statuses) {
  const statusesList = document.getElementById('statusesList');
  const emptyStatus = document.getElementById('emptyStatus');

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
function formatRoundsToReadable(rounds) {
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

function createStatusDisplay(containerElement, statusData) {
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

function addTooltip(element, tooltipText) {
  // If element is an ID string, get the element
  if (typeof element === 'string') {
    element = document.getElementById(element);
  }

  if (element && tooltipText) {
    // Remove native title to prevent default browser tooltip
    element.removeAttribute('title');
    element.dataset.tooltip = tooltipText;
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

function showTooltip(element) {
  const tooltip = document.getElementById('custom-tooltip');
  const text = element.dataset.tooltip;

  if (!tooltip || !text) return;

  tooltip.textContent = text;
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

function hideTooltip() {
  const tooltip = document.getElementById('custom-tooltip');
  if (tooltip) {
    tooltip.classList.remove('show');
  }
}

// Close tooltip when clicking anywhere else
document.addEventListener('click', function (e) {
  if (activeTooltipElement && !activeTooltipElement.contains(e.target)) {
    hideTooltip();
    activeTooltipElement = null;
  }
});

/**
 * Populates the inventory lists with parsed items from character data
 */
function populateInventory() {
  // Clear existing items and populate both lists
  const battleGearList = document.getElementById('battleGearList');
  const possessionsList = document.getElementById('possessionsList');

  populateInventoryList(battleGearList, characterRep.battleGear, 'battleGear');
  populateInventoryList(possessionsList, characterRep.possessions, 'possessions');

  // Update filter button appearances based on current filters
  updateFilterButtonAppearance('battleGear', currentFilters.battleGear);
  updateFilterButtonAppearance('possessions', currentFilters.possessions);

  // Reinitialize inventory click handlers
  initializeInventory();
}

/**
 * Populates a single inventory list with items from character data
 */
function populateInventoryList(element, items, listType) {
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
function filterItemsByType(items, filterType) {
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
function createInventoryItem(item, index, listType) {
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

  itemElement.innerHTML = `
    <label>${nameText}</label>
    <span style="text-align: right; margin-left: auto;">${amountText}</span>
  `;

  return itemElement;
}

// Inventory management functions
let selectedItem = null;

function initializeInventory() {
  // Remove any existing event listeners first
  const items = document.querySelectorAll('.inventory-item');
  items.forEach(item => {
    // Clone the element to remove all event listeners
    const newItem = item.cloneNode(true);
    item.parentNode.replaceChild(newItem, item);
  });

  // Add click handlers to all inventory items
  const newItems = document.querySelectorAll('.inventory-item');
  console.log('Initializing inventory with', newItems.length, 'items');

  newItems.forEach(item => {
    item.addEventListener('click', function () {
      // Remove previous selection
      document.querySelectorAll('.inventory-item').forEach(i => i.classList.remove('selected'));

      // Select this item
      this.classList.add('selected');
      selectedItem = this;

      console.log('Selected item:', this.dataset.item);
    });
  });
}

function moveItem(fromList, toList) {
  if (!selectedItem) {
    alert('Please select an item first by clicking on it.');
    return;
  }

  const fromListElement = document.getElementById(fromList + 'List');
  const toListElement = document.getElementById(toList + 'List');

  // Check if the selected item is in the correct source list
  if (!fromListElement.contains(selectedItem)) {
    alert(`Selected item is not in the ${fromList} list.`);
    return;
  }

  // Move the item
  toListElement.appendChild(selectedItem);

  // Clear selection
  selectedItem.classList.remove('selected');
  selectedItem = null;

  console.log(`Moved item to ${toList} list`);
}

// Filter functionality
const currentFilters = {
  battleGear: 'all',
  possessions: 'all'
};

function toggleFilterDropdown(listType) {
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

function filterItems(listType, filterType) {
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

function updateFilterButtonAppearance(listType, filterType) {
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
document.addEventListener('click', function (event) {
  const target = /** @type {HTMLElement} */ (event.target);
  if (!target.closest('.inventory-header')) {
    document.querySelectorAll('.filter-dropdown').forEach(dd => {
      dd.classList.remove('show');
    });
  }
});

// Initialize inventory when the page loads
document.addEventListener('DOMContentLoaded', function () {
  initializeInventory();
});
