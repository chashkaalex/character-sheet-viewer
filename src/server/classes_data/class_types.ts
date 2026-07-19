import { AbilityName } from '../character/properties/abilities/ability_types';
import { ICharacter } from '../character/icharacter';
import { ModifiableProperty } from '../character/00_property';
import { CasterClassSpellSlots, BardicSpecial, KnownSpellEntry, SpellSlotData, AdapterResult } from '../character/common_types';


/**
 * Data for a single level in a class progression
 */
export interface ClassLevelData {
    bab: number;
    Fort: number;
    Ref: number;
    Will: number;
    [key: string]: number | string | undefined; // For class-specific progression (e.g., Monk speed/AC)
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
    getKnownSpells?: (character: Readonly<ICharacter>, maxLevel: number, domains?: string[]) => Record<string, KnownSpellEntry[]>;
    getBardicSpecials?: (level: number) => BardicSpecial[];
    ParsePreparedSpellsMethod?: (casterClassName: string, preparedSpellsLines: string[]) => CasterClassSpellSlots; // The parser function (e.g., ParsePreparedSlotsDivine)
    /**
     * Optional hook to add class-specific properties to the runtime spellcasting data
     */
    AddSpecialProperties?: (character: ICharacter, runtimeData: any) => void;
    /**
     * Optional hook to determine how many levels this class adds to the caster level.
     * Default is the full class level.
     */
    GetCasterLevelAddition?: (level: number) => number;
    ConsumeSpellSlot?: (docId: string, slotData: SpellSlotData, adapter: any) => AdapterResult;
    ReplenishSpellSlots?: (docId: string, adapter: any) => AdapterResult;
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

    /**
     * Optional hook to get the unarmed damage for a character of this class at a certain level.
     * If not provided, the default progression is used.
     */
    GetUnarmedDamage: (character: ICharacter, level: number) => string;
}

/**
 * Default unarmed damage progression based on character size.
 */
export function DefaultUnarmedDamage(character: ICharacter, _level: number): string {
    const sizeMap: Record<string, string> = {
        'Fine': '1',
        'Diminutive': '1',
        'Tiny': '1',
        'Small': '1d2',
        'Medium': '1d3',
        'Large': '1d4',
        'Huge': '1d6',
        'Gargantuan': '1d8',
        'Colossal': '2d6'
    };
    return sizeMap[character.size.currentSize.name] || '1d3';
}

/**
 * Factory function to create class data with sensible defaults.
 */
export function createClassData(data: Omit<ClassData, 'GetUnarmedDamage'> & { GetUnarmedDamage?: (character: ICharacter, level: number) => string }): ClassData {
    return {
        GetUnarmedDamage: DefaultUnarmedDamage,
        ...data
    };
}
