import { RacesData } from '../../races_data/_races_general_data';
import { ClassesData } from '../../classes_data/_classes_general_data';
import { Races, SpellcasterClasses } from '../_constants';
import { ModifiableProperty } from '../property';
import { ParserUtils } from '../parser_utils';
import { ParsedRaceAndClasses, CharacterClass } from '../common_types';

/**
 * Parses a string containing race and class information.
 * @param text The input string to parse.
 * @returns A ParsedRaceAndClasses object.
 */
export function ParseRaceAndClassesString(text: string): ParsedRaceAndClasses {
    const cleanText = text.replace(/[()]/g, '').trim();
    const words = cleanText.split(' ');
    const race = words[0];
    const rest = words.slice(1).join(' ');
    const classesStrings = rest.split('/');
    const classes: CharacterClass[] = [];

    classesStrings.forEach(classesString => {
        const num = ParserUtils.GetFirstNumberFromALine(classesString);
        if (num !== null) {
            let name = classesString.substring(0, classesString.indexOf(String(num))).trim();

            if (name.includes('Cleric')) {
                const ofIndex = name.indexOf('of');
                if (ofIndex !== -1) {
                    name = name.substring(0, ofIndex).trim();
                }
            }

            classes.push({
                name: name,
                level: num
            });
        }
    });

    return {
        race,
        classes
    };
}

/**
 * Parses race and classes from the character document and sets basic character properties.
 * @param character The character object to populate.
 */
export function ParseRaceAndClasses(character: any): void {
    const raceAndClassesLine = ParserUtils.GetLineThatContainsOneOfTheseTokens(character.lines, Races as unknown as string[]);
    if (raceAndClassesLine) {
        const parsed = ParseRaceAndClassesString(raceAndClassesLine);
        if (!parsed || !parsed.race || !parsed.classes || parsed.classes.length === 0) {
            character.LogParseError('Race and classes - parsing failed');
        }
        character.race = parsed.race;
        character.classes = parsed.classes;

        const raceData = RacesData.get(character.race);
        character.speed = new ModifiableProperty(raceData ? raceData.speed : 0);
    } else {
        character.LogParseError('Race and classes - no line found');
    }
}

/**
 * Applies class-specific effects, updates HD, and configures spellcasting.
 * @param character The character object to modify.
 */
export function ApplyClassesEffects(character: any): void {
    character.classes.forEach((c: CharacterClass) => {
        const classData = ClassesData.get(c.name);
        if (classData) {
            if (typeof classData.AddSpecialProps === 'function') {
                classData.AddSpecialProps(character);
            }
            character.HD += c.level;
            if (SpellcasterClasses.includes(c.name as any)) {
                const classSpellCastingData = classData.spellCastingData;
                if (!classSpellCastingData) {
                    character.LogParseError(`${c.name} - the class is listed as a spellcaster, but no spell casting data found`);
                } else {
                    character.spellCasting
                        .addSpellCasterClass(
                            classSpellCastingData.casterClass,
                            c.level,
                            character.abilities[classSpellCastingData.bonusSpellAbility],
                            character.domains); //prestige classes may be counted towards other caster classes
                }
            }
            const levelData = classData.levelTable[c.level];
            if (levelData) {
                Object.entries(levelData).forEach(([property, value]) => {
                    character.ApplyEffect({ property: property, value: value, status: c.name }, true);
                });
            } else {
                character.LogParseError(`${c.name} - no level data found`);
            }
        }
    });
}

/**
 * Applies racial effects to the character.
 * @param character The character object to modify.
 */
export function ApplyRacesEffects(character: any): void {
    const raceData = RacesData.get(character.race);
    if (raceData && raceData.effects) {
        raceData.effects.forEach((effect: any) => {
            character.ApplyEffect({ ...effect, status: character.race });
        });
    }
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = {
        ParseRaceAndClasses,
        ApplyClassesEffects,
        ApplyRacesEffects
    };
}
