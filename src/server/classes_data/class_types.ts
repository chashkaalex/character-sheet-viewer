import { AbilityName } from '../character/_constants';
import { ICharacter } from '../character/icharacter';

/**
 * Data for a single level in a class progression
 */
export interface ClassLevelData {
    bab: number;
    Fort: number;
    Ref: number;
    Will: number;
    [key: string]: any; // For class-specific progression (e.g., Monk speed/AC)
}

/**
 * Data structure for spellcasting capabilities of a class
 */
export interface SpellCastingData {
    casterClass: string;
    type: 'Arcane' | 'Divine';
    preparation?: 'In Advance' | 'Spontaneous' | 'Free Style';
    bonusSpellAbility: AbilityName;
    spellSlots?: number[][];
    spells?: {
        [level: number]: string[];
        domainSpells?: Record<string, string[]>;
    };
    spellsKnown?: number[][]; // For Spontaneous casters like Beguiler/Bard
    getAvailableSpells?: (maxLevel: number, domains?: string[]) => Record<string, string[]>;
    getBardicSpecials?: (level: number) => any[];
    ParsePreparedSpells?: any; // The parser function (e.g., ParsePreparedSlotsDivine)
}

/**
 * Foundational data for a D&D 3.5 class
 */
export interface ClassData {
    name: string;
    HD: string;
    skills: string[];
    acAbilityName?: AbilityName;
    levelTable: ClassLevelData[];
    spellCastingData?: SpellCastingData;
    /**
     * Optional hook to add class-specific properties to a character during initialization
     */
    AddSpecialProps?: (character: ICharacter) => void;
}
