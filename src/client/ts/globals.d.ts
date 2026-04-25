declare const CHARACTER_PAYLOAD: string;
declare const HAS_ID: boolean;
declare const CHARACTER_ID: string;
declare const SCRIPT_URL: string;

interface Window {
  onCharacterRepresentation: (response: any) => void;
  addTooltip: (element: any, text: string) => void;
  UpdateValueAndTooltip: (element: any, property: any) => void;
  populateInventory: () => void;
  moveItem: (fromList: string, toList: string) => void;
  toggleFilterDropdown: (listType: string) => void;
  filterItems: (listType: string, filterType: string) => void;
  NewStatus: () => void;
  AddStatus: () => void;
  RemoveStatus: (element: any, statusName: string) => void;
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
  nextSection: () => void;
  prevSection: () => void;
  showSection: (sectionId: string) => void;
  loadCharacterData: () => void;
  showError: (message: string) => void;
}
