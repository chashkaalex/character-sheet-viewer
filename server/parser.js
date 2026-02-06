const { ModifiableProperty } = require('./character/property');
const { AbilityNames, SkillsAbilities, SpellcasterClasses } = require('./_constants');
const { Item } = require('./character/items');


/**
 * Parser utility functions for character sheet processing
 * @namespace ParserUtils
 */
const ParserUtils = {
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
    'Battle Gear',
    'Possessions',
    'Personal Information'
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
   * Gets the first number from a line that starts with a specific token
   * @param {string[]} lines - Array of text lines
   * @param {string} token - The token to search for at the start of lines
   * @returns {number|null} The first number found or null
   */
  GetFirstNumberFromLineThatStartsWithToken(lines, token) {
    const found = lines.find((line) => line.startsWith(token));
    if (found) {
      return this.GetFirstNumberFromALine(found);
    }
    return null;
  },

  /**
   * Gets the first number from a line
   * @param {string} line - The line to search
   * @returns {number|null} The first number found or null
   */
  GetFirstNumberFromALine(line) {
    const regex = /\d+/;
    const match = line.match(regex);
    if (match) {
      return Number(match[0]);
    }
    return null;
  },

  /**
   * Gets part of a line until a specific token
   * @param {string} line - The input line
   * @param {string} token - The token to stop at
   * @returns {string} The substring before the token
   */
  GetPartOfTheLineUntilToken(line, token) {
    if (line.includes(token)) {
      return line.substring(0, line.indexOf(token));
    }
    return line;
  },

  /**
   * Gets content within parentheses from a line
   * @param {string} line - The input line
   * @returns {string|null} The content within parentheses or null
   */
  GetParenthesesContent(line) {
    if (line.includes('(') && line.includes(')')) {
      return line.substring(line.indexOf('(') + 1, line.indexOf(')')).trim();
    }
    return null;
  },

  /**
   * Gets number after plus sign in parentheses
   * @param {string} line - The input line
   * @returns {number|null} The number found or null
   */
  GetNumberAfterPlusSignInParentheses(line) {
    const regex = /\(.*?\+\s*(\d+).*?\)/;
    const match = line.match(regex);

    if (match && match[1]) {
      return parseInt(match[1]);
    }

    return null;
  },

  /**
   * Gets the first line that contains one of the specified tokens
   * @param {string[]} lines - Array of text lines
   * @param {string[]} tokens - Array of tokens to search for
   * @returns {string|undefined} The first matching line or undefined
   */
  GetLineThatContainsOneOfTheseTokens(lines, tokens) {
    return lines.find(line => tokens.some(token => line.includes(token)));
  },

  /**
   * Gets the first word from a line
   * @param {string} line - The input line
   * @returns {string} The first word
   */
  GetLineFirstWord(line) {
    return line.split(' ')[0];
  },

  /**
   * Checks if a line is a section line
   * @param {string} line - The line to check
   * @returns {boolean} True if it's a section line
   */
  IsSectionLine(line) {
    return this.sectionNames.some(sectionName => line.startsWith(sectionName));
  },

  /**
   * Gets lines for a specific section
   * @param {string[]} lines - Array of text lines
   * @param {string} sectionName - The name of the section
   * @returns {string[]|null} The section lines or null
   */
  GetSectionLines(lines, sectionName) {
    const startIndex = lines.findIndex(line => line.includes(sectionName));
    if (startIndex === -1) {
      return null;
    }

    let endIndex = startIndex + 1;
    while (endIndex < lines.length && !this.IsSectionLine(lines[endIndex])) {
      endIndex++;
    }

    if (startIndex + 1 === endIndex) {
      return null;
    }

    return lines.slice(startIndex + 1, endIndex);
  },

  /**
   * Gets lines between two tokens
   * @param {string[]} lines - Array of text lines
   * @param {string} token1 - First token (start)
   * @param {string} token2 - Second token (end)
   * @returns {string[]} Lines between the tokens
   */
  GetLinesBetweenTwoTokens(lines, token1, token2) {
    const startIndex = lines.findIndex(line => line.includes(token1));
    const endIndex = lines.findIndex(line => line.includes(token2));
    return lines.slice(startIndex + 1, endIndex);
  },

  /**
   * Gets the line after the line that contains a token
   * @param {string[]} lines - Array of text lines
   * @param {string} token - The token to search for
   * @returns {string|null} The next line or null
   */
  GetLineAfterTheLineThatContainsToken(lines, token) {
    const startIndex = lines.findIndex(line => line.includes(token));
    if (startIndex === -1) {
      return null;
    }
    return lines[startIndex + 1];
  },

  /**
   * Gets skill name from a line
   * @param {string} line - The input line
   * @returns {string|null} The skill name or null
   */
  GetSkillNameFromLine(line) {
    let skillName = null;
    for (const key of Object.keys(SkillsAbilities)) {
      if (line.toLowerCase().includes(key.toLowerCase())) {
        skillName = key;
        break;
      }
    }
    return skillName;
  },

  /**
   * Parses saves from a string
   * @param {string} savesString - The saves string to parse
   * @returns {Object} Object containing parsed saves
   */
  ParseSaves(savesString) {
    const cleanString = savesString.replace('Saves:', '').trim();
    const saves = {};

    cleanString.split(';').forEach(save => {
      const match = save.trim().match(/(\w+)\s*\+(\d+)/);
      if (match) {
        const saveName = match[1];
        const saveValue = parseInt(match[2]);
        saves[saveName] = new ModifiableProperty(saveValue);
      }
    });

    return saves;
  },

  /**
   * Parses race and classes from text
   * @param {string} text - The text to parse
   * @returns {Object} Object containing race and classes
   */
  ParseRaceAndClasses(text) {
    const cleanText = text.replace(/[()]/g, '').trim();
    const [race, ...rest] = cleanText.split(' ');
    const classesStrings = rest.join(' ').split('/');
    const classes = [];

    classesStrings.forEach(classesString => {
      const num = this.GetFirstNumberFromALine(classesString);
      let name = classesString.substring(0, classesString.indexOf(String(num))).trim();

      if (name.includes('Cleric')) {
        name = name.substring(0, name.indexOf('of')).trim();
      }

      classes.push({
        name: name,
        level: num
      });
    });

    return {
      race,
      classes
    };
  },

  /**
   * Parses items from lines
   * @param {string[]} lines - Array of text lines
   * @returns {Item[]} Array of parsed items
   */
  ParseItems(lines) {
    const items = [];
    lines.forEach(line => {
      if (line.trim() !== '') {
        let amount = 1;
        let nameLine = line;
        if (line.includes(' x ')) {
          const lineSplitByX = line.split(' x ');
          const amountLine = lineSplitByX.pop().trim();
          nameLine = lineSplitByX[0];
          if (amountLine) {
            const num = this.GetFirstNumberFromALine(amountLine);
            if (num) {
              amount = num;
            }
          }
        }
        const item = this.GetPartOfTheLineUntilToken(nameLine, '(').trim().replaceAll(',', '');
        items.push(new Item(item, amount));
      }
    });
    return items;
  },

  /**
   * Cleans characters from the beginning and end of a string
   * @param {string} str - The input string to clean
   * @param {string[]} charactersToRemove - Array of characters to remove
   * @returns {string} The cleaned string
   */
  CleanCharacters(str, charactersToRemove) {
    if (!str || typeof str !== 'string') {
      return '';
    }

    if (!Array.isArray(charactersToRemove)) {
      return str;
    }

    let startIndex = 0;
    let endIndex = str.length;

    while (startIndex < endIndex && charactersToRemove.includes(str[startIndex])) {
      startIndex++;
    }

    while (endIndex > startIndex && charactersToRemove.includes(str[endIndex - 1])) {
      endIndex--;
    }

    return str.substring(startIndex, endIndex);
  },

  /**
    * Parses the prepared spells structure from list items
    * @param {Array<{text: string, item: any, isStrikeThrough?: boolean}>} items - The items to parse
    * @param {string[]} domains - The domains of the character
    * @param {function(string, number, string, string, string[]): boolean} validatorFn - The validator function
    * @returns {PreparedSpellsStructure}
    */
  ParsePreparedSpellsStructure(items, domains, validatorFn) {
    /**
     * @type {PreparedSpellsStructure}
     */
    const preparedSpells = {};
    let currentSpellLevel = 0;
    let currentCasterClassName = '';
    let currentSpellLevelName = '';

    items.forEach(entry => {
      let text = entry.text.trim().replaceAll('’', '\'');
      let isStrikeThrough = entry.isStrikeThrough || false;
      const itemRef = entry.item;

      // Check for used marker (override or additive)
      if (text.startsWith('[x] ')) {
        isStrikeThrough = true;
        text = text.substring(4).trim();
      }

      if (SpellcasterClasses.includes(text)) {  //new caster class
        currentCasterClassName = text;
        preparedSpells[currentCasterClassName] = {};
      } else if (text.includes('level')) {  //new spell level
        currentSpellLevel = ParserUtils.GetFirstNumberFromALine(text);
        currentSpellLevelName = String(currentSpellLevel); // Ensure string key
        if (currentCasterClassName == 'Cleric' && text.toLowerCase().includes('domain')) {
          currentSpellLevelName += ' - domain';
        }
        preparedSpells[currentCasterClassName][currentSpellLevelName] = [];
      } else {  //new spell
        // Only add if we are inside a valid block
        if (currentCasterClassName && preparedSpells[currentCasterClassName][currentSpellLevelName]) {
          const isValid = validatorFn ? validatorFn(currentCasterClassName, currentSpellLevel, currentSpellLevelName, text, domains) : true;
          preparedSpells[currentCasterClassName][currentSpellLevelName].push({
            item: itemRef,
            spell: text,
            used: isStrikeThrough,
            isValid: isValid
          });
        }
      }
    });
    return preparedSpells;
  },



  /**
   * @typedef {Object} ParseDocResult
   * @property {Object.<string, string[]>} sectionLines - Lines for each section
   * @property {string|null} attackLine - The attack line
   * @property {string|null} resistanceLine - The resistance line
   * @property {Object.<string, string>} abilitiesLines - Lines for each ability
   * @property {boolean} success - Whether parsing validation passed
   * @property {string[]} errors - Validation errors
   */

  /**
   * Parses the raw lines of a character document into structured sections and checks for required fields.
   * @param {string[]} lines - The raw text lines from the document
   * @returns {ParseDocResult} The parsed structure and validation results
   */
  ParseDocLines(lines) {
    /** @type {Object.<string, string[]>} */
    const sectionLines = {};
    let attackLine = null;
    let resistanceLine = null;
    /** @type {Object.<string, string>} */
    const abilitiesLines = {};
    const errors = [];

    let currentSection = null;

    // Single-pass iteration
    for (const line of lines) {
      // Check for section start
      if (this.IsSectionLine(line)) {
        currentSection = this.sectionNames.find(name => line.startsWith(name));
        sectionLines[currentSection] = [];
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
};

//exports
if (typeof module !== 'undefined') {
  module.exports = {
    ParserUtils
  };
}


