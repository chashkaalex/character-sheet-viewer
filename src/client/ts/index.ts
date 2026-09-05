// Styles
import '../style/stylesheet.css';
import '../style/landing_styles.css';

// Scripts
import * as Landing from './landing_script';
import * as SectionNav from './section_navigation_script';
import * as Character from './character_script';
import * as Dashboard from './dashboard_script';
import * as Spells from './spells_script';
import * as PartySync from './party_sync_listener';

// Global Registry for Google Apps Script compatibility
// This exposes functions to the global 'window' object so they can be called from HTML event handlers
const globalRegistry: Record<string, any> = {
    // Landing
    loadCharacterData: Landing.loadCharacterData,
    showError: Landing.showError,

    // Section Navigation
    showSection: SectionNav.showSection,

    // Character
    onCharacterRepresentation: Character.onCharacterRepresentation,
    addTooltip: Character.addTooltip,
    UpdateValueAndTooltip: Character.UpdateValueAndTooltip,
    populateInventory: Character.populateInventory,
    toggleCollapse: Character.toggleCollapse,
    toggleFilterDropdown: Character.toggleFilterDropdown,
    moveInventoryItem: Character.moveInventoryItem,
    usePotion: Character.usePotion,
    filterItems: Character.filterItems,

    // Dashboard
    NewStatus: Dashboard.NewStatus,
    AddStatus: Dashboard.AddStatus,
    RemoveStatus: Dashboard.RemoveStatus,
    ClearAllStatuses: Dashboard.ClearAllStatuses,
    inflict: Dashboard.inflict,
    cure: Dashboard.cure,
    refreshCharacterData: Dashboard.refreshCharacterData,
    onTimePassed: Dashboard.onTimePassed,
    onWeaponChange: Dashboard.onWeaponChange,
    onOffHandChange: Dashboard.onOffHandChange,
    onFullAttackToggle: Dashboard.onFullAttackToggle,
    onSpecialAttackChange: Dashboard.onSpecialAttackChange,
    showPartyModal: Dashboard.showPartyModal,
    closePartyModal: Dashboard.closePartyModal,

    // Actions & Spells
    PrepareSpellsUI: Spells.PrepareSpellsUI,
    hideSpellPopup: Spells.hideSpellPopup,
    prepareSpell: Spells.prepareSpell,
    castSpell: Spells.castSpell,
    replenishClassSpellSlots: Spells.replenishClassSpellSlots,
    useAction: Spells.useAction,
    hideMovePopup: Spells.hideMovePopup,
    moveAction: Spells.moveAction,
    hideNumberActionPopup: Spells.hideNumberActionPopup,
    useNumberAction: Spells.useNumberAction,

    // Party Sync
    startPartyStatusListener: PartySync.startPartyStatusListener,
    stopPartyStatusListener: PartySync.stopPartyStatusListener,
    showPartyNotification: PartySync.showPartyNotification
};

// Map each function to the window object
Object.entries(globalRegistry).forEach(([name, func]) => {
    (window as any)[name] = func;
});

console.log('Client-side global registry initialized.');
