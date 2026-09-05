declare const CHARACTER_PAYLOAD: string;
declare const HAS_ID: boolean;
declare const CHARACTER_ID: string;
declare const SCRIPT_URL: string;

interface Window {
  onCharacterRepresentation: (response: any) => void;
  addTooltip: (element: any, text: string) => void;
  UpdateValueAndTooltip: (element: any, property: any) => void;
  populateInventory: () => void;
  toggleCollapse: (listType: string) => void;
  toggleFilterDropdown: (listType: string) => void;
  moveInventoryItem: (listType: string, index: number) => void;
  usePotion: (index: number) => void;
  filterItems: (listType: string, filterType: string) => void;
  NewStatus: () => void;
  AddStatus: () => void;
  RemoveStatus: (element: any, statusName: string) => void;
  ClearAllStatuses: () => void;
  inflict: (effectName: string, duration?: any) => void;
  cure: (effectName: string) => void;
  refreshCharacterData: () => void;
  onTimePassed: () => void;
  onWeaponChange: () => void;
  onSpecialAttackChange: () => void;
  showPartyModal: () => void;
  closePartyModal: () => void;
  PrepareSpellsUI: () => void;
  hideSpellPopup: () => void;
  prepareSpell: (casterClassName: string, spellLevel: string, slotIndex: number, spellName: string) => void;
  castSpell: (casterClassName: string, spellLevel: string, slotIndex: number) => void;
  showSection: (sectionId: string) => void;
  loadCharacterData: () => void;
  showError: (message: string) => void;
  startPartyStatusListener: (characterRep: any) => void;
  stopPartyStatusListener: () => void;
  showPartyNotification: (message: string, isError?: boolean) => void;
}

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.html' {
  const content: string;
  export default content;
}
