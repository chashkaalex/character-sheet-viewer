import { SaveName } from './properties/saves';
import { ModifiableProperty } from './00_property';

export interface BardicSpecial {
  name: string;
  value?: ModifiableProperty;
}

export interface SpellSlotData {
  casterClassName: string;
  spellLevel: string;
  slotIndex: number;
  spellName: string;
  isUsed: boolean;
  isEmpty: boolean;
  isValid?: boolean;
}

export interface ParsedSpellSlot {
  spellName: string;
  isUsed: boolean;
  isEmpty: boolean;
  isValid: boolean;
  listItem?: GoogleAppsScript.Document.ListItem;
}

export interface KnownSpellEntry {
  spellName: string;
  isValid: boolean;
}

export type LevelSpellSlots = Record<string, SpellSlotData[]>;
export type ParsedLevelSpellSlots = Record<string, ParsedSpellSlot[]>;

export interface CasterClassSpellSlots extends LevelSpellSlots { }
export interface CasterClassParsedSpellSlots extends ParsedLevelSpellSlots { }

export type CharacterSpellSlots = Record<string, CasterClassSpellSlots>;
export type CharacterParsedSpellSlots = Record<string, CasterClassParsedSpellSlots>;

export type SavesMap = Record<SaveName, ModifiableProperty>;

export interface ParseDocResult {
  sectionLines: Record<string, string[]>;
  attackLine: string | null;
  resistanceLine: string | null;
  hpLine: string | null;
  abilitiesLines: Record<string, string>;
  success: boolean;
  errors: string[];
}

export interface PreparedSpellEntry {
  text: string;
  isStrikeThrough?: boolean;
  listItem?: GoogleAppsScript.Document.ListItem;
}

export type SpellValidatorFn = (
  currentCasterClassName: string,
  currentSpellLevel: number,
  currentSpellLevelName: string,
  text: string,
  domains: string[]
) => boolean;

export interface AdapterResult {
  success: boolean;
  message?: string;
  error?: string;
}
