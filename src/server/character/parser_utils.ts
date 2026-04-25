import { AbilityNames, SpellcasterClasses } from './_constants';
import {
  CharacterParsedSpellSlots,
  ParseDocResult,
  PreparedSpellEntry,
  SpellValidatorFn
} from './common_types';

/**
 * Parser utility functions for character sheet processing
 */
export const ParserUtils = {
  sectionNames: [
    'Statuses',
    'Feats',
    'Special Abilities',
    'Racial Traits',
    'Bonus Abilities',
    'Flaws, Traits, Quirks',
    'Languages',
    'Prepared Spells',
    'Spells Known',
    'Spells',
    'Skills Synergy',
    'Skills',
    'Skill Tricks',
    'Songs per day',
    'Battle Gear',
    'Possessions',
    'Personal Information',
    'Parties Membership'
  ],

  mustHaveSectionNames: [
    'Statuses',
    'Feats',
    'Special Abilities',
    'Racial Traits',
    'Bonus Abilities',
    'Skills',
    'Personal Information'
  ],

  /**
   * Gets the first number from a line
   * @param line - The line to search
   * @returns The first number found or null
   */
  GetFirstNumberFromALine(line: string): number | null {
    const regex = /-?\d+/;
    const match = line.match(regex);
    if (match) {
      return Number(match[0]);
    }
    return null;
  },

  /**
   * Gets part of a line until a specific token
   * @param line - The input line
   * @param token - The token to stop at
   * @returns The substring before the token
   */
  GetPartOfTheLineUntilToken(line: string, token: string): string {
    if (line.includes(token)) {
      return line.substring(0, line.indexOf(token));
    }
    return line;
  },

  /**
   * Gets content within parentheses from a line
   * @param line - The input line
   * @returns The content within parentheses or null
   */
  GetParenthesesContent(line: string): string | null {
    if (line.includes('(') && line.includes(')')) {
      return line.substring(line.indexOf('(') + 1, line.indexOf(')')).trim();
    }
    return null;
  },

  /**
   * Gets the first line that contains one of the specified tokens
   * @param lines - Array of text lines
   * @param tokens - Array of tokens to search for
   * @returns The first matching line or undefined
   */
  GetLineThatContainsOneOfTheseTokens(lines: string[], tokens: readonly string[]): string | undefined {
    return lines.find(line => tokens.some(token => line.includes(token)));
  },

  /**
   * Checks if a line is a section line
   * @param line - The line to check
   * @returns True if it's a section line
   */
  IsSectionLine(line: string): boolean {
    const trimmed = line.trim();
    return this.sectionNames.some(name => {
      return trimmed.startsWith(name) || (trimmed.match(/^\d+:\s*/) && trimmed.includes(name + ':'));
    });
  },

  /**
   * Parses the prepared spells structure from list items
   * @param items - The items to parse
   * @param domains - The domains of the character
   * @param validatorFn - The validator function
   * @param defaultClassName - The default caster class name
   * @returns The parsed prepared spells structure
   */
  ParsePreparedSpellsStructure(
    items: PreparedSpellEntry[],
    domains: string[],
    validatorFn: SpellValidatorFn,
    defaultClassName: string = ''
  ): CharacterParsedSpellSlots {
    const preparedSpells: CharacterParsedSpellSlots = {};
    if (defaultClassName) {
      preparedSpells[defaultClassName] = {};
    }
    let currentSpellLevel = 0;
    let currentCasterClassName = defaultClassName;
    let currentSpellLevelName = '';

    items.forEach(entry => {
      const text = entry.text.trim().replace(/’/g, '\'');
      const isStrikeThrough = entry.isStrikeThrough || false;

      if ((SpellcasterClasses as readonly string[]).includes(text)) {  //new caster class
        currentCasterClassName = text;
        if (!preparedSpells[currentCasterClassName]) {
          preparedSpells[currentCasterClassName] = {};
        }
      } else if (text.includes('level')) {  //new spell level
        const num = this.GetFirstNumberFromALine(text);
        currentSpellLevel = num !== null ? num : 0;
        currentSpellLevelName = String(currentSpellLevel); // Ensure string key
        if (currentCasterClassName === 'Cleric' && text.toLowerCase().includes('domain')) {
          currentSpellLevelName += ' - domain';
        }
        if (currentCasterClassName) {
          if (!preparedSpells[currentCasterClassName]) {
            preparedSpells[currentCasterClassName] = {};
          }
          preparedSpells[currentCasterClassName][currentSpellLevelName] = [];
        }
      } else {  //new spell
        // Only add if we are inside a valid block
        if (currentCasterClassName && preparedSpells[currentCasterClassName] && preparedSpells[currentCasterClassName][currentSpellLevelName]) {
          const isValid = validatorFn ? validatorFn(currentCasterClassName, currentSpellLevel, currentSpellLevelName, text, domains) : true;
          const listItem = entry.listItem;
          preparedSpells[currentCasterClassName][currentSpellLevelName].push({
            spellName: text,
            isUsed: isStrikeThrough,
            isEmpty: text === '',
            isValid: isValid,
            listItem: listItem
          });
        }
      }
    });
    return preparedSpells;
  },

  /**
   * Parses the raw lines of a character document into structured sections and checks for required fields.
   * @param lines - The raw text lines from the document
   * @returns The parsed structure and validation results
   */
  ParseDocLines(lines: string[]): ParseDocResult {
    const sectionLines: Record<string, string[]> = {};
    let attackLine: string | null = null;
    let resistanceLine: string | null = null;
    const abilitiesLines: Record<string, string> = {};
    const errors: string[] = [];

    let currentSection: string | null = null;

    // Single-pass iteration
    for (const line of lines) {
      // Check for section start
      if (this.IsSectionLine(line)) {
        currentSection = this.sectionNames.find(name => line.startsWith(name)) || null;
        if (currentSection) {
          sectionLines[currentSection] = [];
        }
        continue; // Skip the header line itself
      }

      // If we are in a section, add line to it
      if (currentSection) {
        sectionLines[currentSection].push(line);
      } else {
        // We are in the Header (pre-section) area
        // Check for Attack
        if (line.startsWith('Attack')) {
          attackLine = line;
        }
        // Check for Resistance
        else if (line.includes('Resistance')) {
          resistanceLine = line;
        }
        else {
          // Check for Abilities
          const abilityName = AbilityNames.find(name => line.startsWith(name));
          if (abilityName) {
            abilitiesLines[abilityName] = line;
          }
        }
      }
    }

    // Validation
    let validationFailed = false;

    if (!attackLine) {
      errors.push('Critical: \'Attack\' line not found.');
      validationFailed = true;
    }

    // Check required abilities
    AbilityNames.forEach(name => {
      if (!abilitiesLines[name]) {
        errors.push(`Critical: Ability '${name}' not found.`);
        validationFailed = true;
      }
    });

    // Check required sections
    this.mustHaveSectionNames.forEach(sectionName => {
      if (!sectionLines[sectionName]) {
        errors.push(`Critical: Section '${sectionName}' not found.`);
        validationFailed = true;
      }
    });

    return {
      sectionLines: sectionLines,
      attackLine: attackLine,
      resistanceLine: resistanceLine,
      abilitiesLines: abilitiesLines,
      success: !validationFailed,
      errors: errors
    };
  }
} as const;

