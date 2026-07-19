import { RacesData } from '../../races_data/_races_general_data';
import { ClassesData } from '../../classes_data/_classes_general_data';
import { Races, SpellcasterClasses } from '../_constants';
import { ModifiableProperty } from '../00_property';
import { GetFirstNumberFromALine, GetLineThatContainsOneOfTheseTokens } from '../parser_utils';
import { EffectFactory, PermanentPropertyEffectData } from '../state/effects';
import { ICharacter } from '../icharacter';
import { RacialEffectData } from '../../races_data/race_types';

export interface CharacterClass {
    name: string;
    level: number;
}

export interface ParsedRaceAndClasses {
    race: string;
    classes: CharacterClass[];
}

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
        const num = GetFirstNumberFromALine(classesString);
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
 * Parses race and classes from the character lines.
 * @param lines The character document lines.
 * @returns A ParsedRaceAndClasses object.
 */
export function ParseRaceAndClasses(lines: string[]): ParsedRaceAndClasses {
    const raceAndClassesLine = GetLineThatContainsOneOfTheseTokens(lines, Races as unknown as string[]);
    if (raceAndClassesLine) {
        return ParseRaceAndClassesString(raceAndClassesLine);
    }
    return { race: '', classes: [] };
}

/**
 * Applies class-specific effects, updates HD, and configures spellcasting.
 * @param character The character object to modify.
 */
export function ApplyClassesEffects(character: ICharacter): void {
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
                    const casterLevelAddition = classSpellCastingData.GetCasterLevelAddition
                        ? classSpellCastingData.GetCasterLevelAddition(c.level)
                        : c.level;
                    character.spellCasting
                        .AddSpellCasterClass(
                            classSpellCastingData.casterClass,
                            casterLevelAddition,
                            character.abilities[classSpellCastingData.bonusSpellAbility],
                            classSpellCastingData);
                    character.spellCasting
                        .GetSpellCasterClassData(classSpellCastingData.casterClass)!
                        .AddSpecialProperties(character);
                }
            }
            const levelData = classData.levelTable[c.level];
            if (levelData) {
                Object.entries(levelData).forEach(([property, value]) => {
                    const permanentData: PermanentPropertyEffectData = {
                        status: c.name,
                        property,
                        value: value as number
                    };
                    EffectFactory(permanentData).ApplyEffect(character);
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
export function ApplyRacesEffects(character: ICharacter): void {
    const raceData = RacesData.get(character.race);
    if (raceData && raceData.effects) {
        raceData.effects.forEach((effect: RacialEffectData) => {
            EffectFactory({ ...effect, status: character.race }).ApplyEffect(character);
        });
    }
}
