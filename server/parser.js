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
    'Spells',
    'Skills',
    'Battle Gear',
    'Possessions',
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
    return this.sectionNames.some(sectionName => line.includes(sectionName));
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
    for (const key of Object.keys(skillsAbilities)) {
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
      let name = classesString.substring(0, classesString.indexOf(num)).trim();

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
   * Extracts list items between two markers from a Google Document
   * @param {GoogleAppsScript.Document.Document} doc - The Google Document object
   * @param {string} fromText - The start marker text
   * @param {string} toText - The end marker text
   * @returns {{text: string, isStrikeThrough: boolean}[]} Array of list item data
   */
  ExtractListItemsBetweenMarkers(doc, fromText, toText) {
    const listItems = this.ExtractListItemsArray(doc, fromText, toText);
    return this.ParseListItemsTextAndStrikethrough(listItems);
  },


  /**
   * Extracts list items from a Google Document
   * @param {GoogleAppsScript.Document.Document} doc - The Google Document object
   * @param {string} fromText - The start marker text
   * @param {string} toText - The end marker text
   * @returns { GoogleAppsScript.Document.ListItem[]} Array of list item data
   */
  ExtractListItemsArray(doc, fromText, toText) {
    const body = doc.getBody();
    const listItems = [];
    let startParsing = false;

    for (let i = 0; i < body.getNumChildren(); i++) {
      const element = body.getChild(i);
      const type = element.getType();

      let elementText = '';

      try {
        if (type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM) {
          elementText = element.getText().trim();
        }
      } catch (e) {
        // Ignore complex elements
      }

      if (startParsing && elementText.startsWith(toText)) {
        startParsing = false;
        break;
      }

      if (elementText.startsWith(fromText)) {
        startParsing = true;
        continue;
      }

      if (startParsing) {
        if (type === DocumentApp.ElementType.LIST_ITEM) {
          const listItem = element.asListItem();
          listItems.push(listItem);
        }
      }
    }

    return listItems;
  },

  /**
   * Parses the text and strikethrough of a list of items
   * @param {GoogleAppsScript.Document.ListItem[]} listItems - Array of list item data
   * @returns {{text: string, isStrikeThrough: boolean}[]} Array of list item data
   */
  ParseListItemsTextAndStrikethrough(listItems) {
    const results = [];

    listItems.forEach(listItem => {
      const textElement = listItem.editAsText();
      const itemText = textElement.getText().trim().replaceAll('’', '\'');
      const isStruckThrough = textElement.isStrikethrough(0) || false;  //may be null if the item is not strikethrough

      results.push({
        text: itemText,
        isStrikeThrough: isStruckThrough
      });
    });

    return results;
  },

  /**
   * @typedef {Object} PreparedSpellDocData
   * @property {GoogleAppsScript.Document.ListItem} item - The list item data
   * @property {string} spell - The spell name
   * @property {boolean} used - Whether the spell is used
   * @property {boolean} isValid - Whether the spell is valid
   */

  /**
     * Gets the spells structure from a document
     * @param {string} docId - The Google Document ID
     * @typedef {Object.<string, Object.<number, PreparedSpellDocData[]>>} PreparedSpellsStructure
     * @returns {PreparedSpellsStructure}
     */
  GetPreparedSpellsStructure(docId) {
    const doc = DocumentApp.openById(docId);
    const listItems = this.ExtractListItemsArray(doc, 'Prepared Spells', 'Skills');

    /**
     * @type {PreparedSpellsStructure}
     */
    const preparedSpells = {};
    const lines = GetDocRawLines(doc);
    let domains;
    const domainLine = ParserUtils.GetLineThatContainsOneOfTheseTokens(lines, ['Domain', 'domains']);
    if (domainLine) {
      domains = ParserUtils.GetParenthesesContent(domainLine).split(',').map(domain => domain.trim());
    }
    let currentSpellLevel = 0;
    let currentCasterClassName = 0;
    listItems.forEach(listItem => {
      const line = listItem.getText().trim().replaceAll('’', '\'');
      if (spellcasterClasses.includes(line.trim())) {  //new caster class
        currentCasterClassName = line.trim();
        preparedSpells[currentCasterClassName] = {};
      } else if (line.includes('level')) {  //new spell level
        currentSpellLevel = ParserUtils.GetFirstNumberFromALine(line);
        if (currentCasterClassName == 'Cleric' && line.toLowerCase().includes('domain')) {
          currentSpellLevel += ' - domain';
        }
        preparedSpells[currentCasterClassName][currentSpellLevel] = [];
      } else {  //new spell
        preparedSpells[currentCasterClassName][currentSpellLevel]
          .push({ item: listItem, spell: line, used: listItem.isStrikeThrough, isValid: Character.ValidatePreparedSpell(currentCasterClassName, currentSpellLevel, line, domains) });
      }
    });
    return preparedSpells;
  }
};


