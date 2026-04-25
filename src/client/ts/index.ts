// Styles
import '../style/stylesheet.css';
import '../style/landing_styles.css';

// Scripts
import * as Landing from './landing_script';
import * as SectionNav from './section_navigation_script';
import * as Character from './character_script';
import * as Dashboard from './dashboard_script';
import * as Spells from './spells_script';

// Global Registry for Google Apps Script compatibility
// This exposes functions to the global 'window' object so they can be called from HTML event handlers
const globalRegistry: Record<string, any> = {
    // Landing
    loadCharacterData: Landing.loadCharacterData,
    showError: Landing.showError,

    // Section Navigation
    nextSection: SectionNav.nextSection,
    prevSection: SectionNav.prevSection,
    showSection: SectionNav.showSection,

    // Character
    onCharacterRepresentation: Character.onCharacterRepresentation,
    addTooltip: Character.addTooltip,
    UpdateValueAndTooltip: Character.UpdateValueAndTooltip,
    populateInventory: Character.populateInventory,
    moveItem: Character.moveItem,
    toggleFilterDropdown: Character.toggleFilterDropdown,
    filterItems: Character.filterItems,

    // Dashboard
    NewStatus: Dashboard.NewStatus,
    AddStatus: Dashboard.AddStatus,
    RemoveStatus: Dashboard.RemoveStatus,
    inflict: Dashboard.inflict,
    cure: Dashboard.cure,
    refreshCharacterData: Dashboard.refreshCharacterData,
    onTimePassed: Dashboard.onTimePassed,
    onWeaponChange: Dashboard.onWeaponChange,
    onSpecialAttackChange: Dashboard.onSpecialAttackChange,
    showPartyModal: Dashboard.showPartyModal,
    closePartyModal: Dashboard.closePartyModal,

    // Spells
    PrepareSpellsUI: Spells.PrepareSpellsUI,
    hideSpellPopup: Spells.hideSpellPopup,
    prepareSpell: Spells.prepareSpell,
    castSpell: Spells.castSpell
};

// Map each function to the window object
Object.entries(globalRegistry).forEach(([name, func]) => {
    (window as any)[name] = func;
});

console.log('Client-side global registry initialized.');
