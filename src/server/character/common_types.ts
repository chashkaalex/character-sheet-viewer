import { AbilityName, SaveName } from './_constants';
import { ModifiableProperty, Ability } from './property';

export interface SpellSlotData {
  casterClassName: string;
  spellLevel: string;
  slotIndex: number;
  spellName: string;
  isUsed: boolean;
  isEmpty: boolean;
}

export interface ParsedSpellSlot {
  spellName: string;
  isUsed: boolean;
  isEmpty: boolean;
  isValid: boolean;
  listItem?: GoogleAppsScript.Document.ListItem;
}

export type LevelSpellSlots = Record<string, SpellSlotData[]>;
export type ParsedLevelSpellSlots = Record<string, ParsedSpellSlot[]>;

export interface CasterClassSpellSlots extends LevelSpellSlots {}
export interface CasterClassParsedSpellSlots extends ParsedLevelSpellSlots {}

export type CharacterSpellSlots = Record<string, CasterClassSpellSlots>;
export type CharacterParsedSpellSlots = Record<string, CasterClassParsedSpellSlots>;

export type SavesMap = Record<SaveName, ModifiableProperty>;

export type AbilitiesMap = Partial<Record<AbilityName, Ability>>;

export interface CharacterState {
  name: string;
  hp: {
    current: number;
    max: number;
  };
  abilities: AbilitiesMap;
  saves: SavesMap;
  // ... more to be added as we migrate
}

export interface CharacterClass {
  name: string;
  level: number;
}

export interface ParsedRaceAndClasses {
  race: string;
  classes: CharacterClass[];
}

export interface ParseDocResult {
  sectionLines: Record<string, string[]>;
  attackLine: string | null;
  resistanceLine: string | null;
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
