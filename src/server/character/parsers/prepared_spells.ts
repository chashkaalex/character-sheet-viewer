import { SpellcasterClasses } from '../_constants';
import { ClassesData } from '../../classes_data/_classes_general_data';
import { ParserUtils } from '../parser_utils';
import { CharacterSpellSlots, CasterClassSpellSlots, SpellSlotData } from '../common_types';

/**
 * Parses the prepared spells structure from list items
 * @param preparedSpellsLines Lines containing prepared spells information
 * @returns A structure of character spell slots indexed by caster class
 */
export function ParsePreparedSpellsFreeStyle(preparedSpellsLines: string[]): CharacterSpellSlots {
    const preparedSpells: CharacterSpellSlots = {};

    if (preparedSpellsLines.length === 0) return preparedSpells;

    // First line must bear a caster class name
    const firstLine = preparedSpellsLines[0].trim();
    if (!SpellcasterClasses.includes(firstLine as any)) {
        throw new Error('First line must bear a caster class name');
    }

    for (let lineIndex = 0; lineIndex < preparedSpellsLines.length; lineIndex++) {
        const preparedSpellLine = preparedSpellsLines[lineIndex].trim();

        if (SpellcasterClasses.includes(preparedSpellLine as any)) {
            const currentCasterClassName = preparedSpellLine;
            lineIndex++;

            // Collect the lines that belong to the current caster class
            const currentCasterClassLines: string[] = [];
            while (lineIndex < preparedSpellsLines.length && !SpellcasterClasses.includes(preparedSpellsLines[lineIndex].trim() as any)) {
                currentCasterClassLines.push(preparedSpellsLines[lineIndex]);
                lineIndex++;
            }

            // Next operations are defined by the name of the caster class
            // The relevant function should be exported from the class spellcasting definition
            const classInfo = ClassesData.get(currentCasterClassName);
            if (classInfo && classInfo.spellCastingData && typeof classInfo.spellCastingData.ParsePreparedSpells === 'function') {
                const ClassParsingFunction = classInfo.spellCastingData.ParsePreparedSpells;
                preparedSpells[currentCasterClassName] = ClassParsingFunction(currentCasterClassName, currentCasterClassLines);
            }

            // Must not increment again
            if (lineIndex < preparedSpellsLines.length) {
                lineIndex--;
            }
        }
    }

    return preparedSpells;
}

/**
 * ClassParsingFunction for divine casters (list-based)
 * @param casterClassName Name of the caster class
 * @param preparedSpellsLines Lines to parse
 * @returns Spell slots for the class
 */
export function ParsePreparedSlotsDivine(casterClassName: string, preparedSpellsLines: string[]): CasterClassSpellSlots {
    const preparedSpells: CasterClassSpellSlots = {};
    let levelName = '';

    preparedSpellsLines.forEach(line => {
        let cleanLine = line.trim();
        if (cleanLine.toLowerCase().startsWith('level')) {
            const spellLevelNum = ParserUtils.GetFirstNumberFromALine(cleanLine);
            levelName = String(spellLevelNum); // Ensure string key
            if (cleanLine.toLowerCase().includes('domain')) {
                levelName += ' - domain';
            }
            preparedSpells[levelName] = [];
        } else if (levelName) {
            const isUsed = cleanLine.startsWith('[x]');
            if (isUsed) {
                cleanLine = cleanLine.substring(3).trim();
            }
            const isEmpty = cleanLine === '[o]';
            preparedSpells[levelName].push({
                casterClassName: casterClassName,
                spellLevel: levelName,
                spellName: cleanLine,
                slotIndex: preparedSpells[levelName].length,
                isUsed: isUsed,
                isEmpty: isEmpty
            });
        }
    });

    return preparedSpells;
}

/**
 * ClassParsingFunction for spontaneous casters (count-based)
 * @param casterClassName Name of the caster class
 * @param preparedSpellsLines Lines to parse
 * @returns Spell slots for the class
 */
export function ParsePreparedSlotsSpontaneous(casterClassName: string, preparedSpellsLines: string[]): CasterClassSpellSlots {
    const preparedSpells: CasterClassSpellSlots = {};

    // For spontaneous casters, each line designates slots of a level
    // The line looks like: "level 1: 2/4"
    // First number is the number of spells still available to cast
    // Second number is total number of slots,
    // No spell names are listed since they are spontaneous.

    preparedSpellsLines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine.includes(':')) return;

        const levelNamePart = cleanLine.split(':')[0].trim();
        let levelName = levelNamePart;
        if (levelNamePart.toLowerCase().startsWith('level')) {
            const spellLevelNum = ParserUtils.GetFirstNumberFromALine(levelNamePart);
            levelName = String(spellLevelNum);
        }

        const slotsPart = cleanLine.split(':')[1].trim();
        if (!slotsPart.includes('/')) return;

        const [currentSlots, maxSlots] = slotsPart.split('/').map(s => Number(s.trim()));

        preparedSpells[levelName] = [];
        for (let i = 0; i < maxSlots; i++) {
            preparedSpells[levelName].push({
                casterClassName: casterClassName,
                spellLevel: levelName,
                spellName: '',
                slotIndex: i,
                isUsed: i >= currentSlots, // If currentSlots is 2, indices 0,1 are empty, 2,3 are used
                isEmpty: i < currentSlots
            });
        }
    });

    return preparedSpells;
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = {
        ParsePreparedSpellsFreeStyle,
        ParsePreparedSlotsDivine,
        ParsePreparedSlotsSpontaneous
    };
}
