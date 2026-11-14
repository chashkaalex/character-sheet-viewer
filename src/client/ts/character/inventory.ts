import { characterRep } from '../state';
import { onCharacterRepresentation } from '../character_script';

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

