//google document editing functions

const { ParserUtils } = require('./parser');

/**
   * Normalizes a string by replacing common Google Docs "smart" characters
   * with their standard ASCII equivalents for reliable processing in code.
   * @param {string} text - The input string, potentially containing smart characters.
   * @returns {string} The normalized string.
   */
function NormalizeGDocsText(text) {
  const smartToAscii = {
    // Single Quotes / Apostrophe
    '‘': '\'',   // Opening single quote
    '’': '\'',   // Closing single quote / Apostrophe
    '´': '\'',   // Accent grave
    // Double Quotes
    '“': '"',   // Opening double quote
    '”': '"',   // Closing double quote

    // Dashes
    '–': '-',   // En dash (U+2013)
    '—': '-',   // Em dash (U+2014)

    // Ellipsis
    '…': '...', // Horizontal Ellipsis (U+2026)

    // Special Spaces (Non-breaking space)
    '\u00A0': ' ' // Non-breaking space (U+00A0)
  };

  const smartChars = Object.keys(smartToAscii);

  return smartChars.reduce((normalizedText, smartChar) => {
    const replacement = smartToAscii[smartChar];
    const regex = new RegExp(smartChar, 'g');
    return normalizedText.replace(regex, replacement);
  }, text);
}

/**
 * Gets the lines of a Google Doc
 * @param {GoogleAppsScript.Document.Document} doc The Google Doc object.
 * @returns {string[]} An array of lines in the document
 */
function GetDocRawLines(doc) {
  /**@type {string[]}*/
  const lines = [];
  doc.getTabs().forEach(
    tab => {
      lines.push(...tab.asDocumentTab().getBody().getText()
        .replaceAll('’', '\'')        //replace smart quotes with standard quotes
        .replace(/\r/g, '\n')         //replace line breaks with newlines
        // eslint-disable-next-line no-control-regex
        .replace(/\u000b/g, '\n')     //replace form feeds with newlines
        .split('\n')
        .filter(line => line.trim() !== ''));
    }
  );
  return lines;
}

/**
 * Gets the lines of a Google Doc for Character parsing, including visual markers
 * @param {GoogleAppsScript.Document.Document} doc The Google Doc object.
 * @returns {string[]} An array of lines in the document with [x] markers for used spells
 */
function GetCharacterLinesFromDoc(doc) {
  const lines = [];

  doc.getTabs().forEach(tab => {
    const body = tab.asDocumentTab().getBody();
    let inSpellSection = false;

    // Iterate through all child elements because getText() ignores visual formatting structure
    for (let i = 0; i < body.getNumChildren(); i++) {
      const element = body.getChild(i);
      const type = element.getType();

      let text = '';
      let isStrikethrough = false;

      if (type === DocumentApp.ElementType.PARAGRAPH) {
        text = element.asParagraph().getText();
      } else if (type === DocumentApp.ElementType.LIST_ITEM) {
        const listItem = element.asListItem();
        text = listItem.getText();
        // Check strikethrough on first character for list items
        // This logic mirrors ParseListItemsTextAndStrikethrough
        if (text.length > 0) {
          isStrikethrough = listItem.editAsText().isStrikethrough(0);
        }
      } else if (type === DocumentApp.ElementType.TABLE) {
        // Tables are not currently used for main character data, skipping complex parsing
        // But we might want the text content just in case
        text = element.asTable().getText();
      }

      // Clean text similar to GetDocRawLines
      text = text.replaceAll('’', '\'').trim();

      if (text === '') continue;

      // Section detection logic
      if (ParserUtils.IsSectionLine(text)) {
        // Check if we are entering a spell section
        if (text.startsWith('Prepared Spells') || text.startsWith('Spells Known')) {
          inSpellSection = true;
        } else {
          inSpellSection = false;
        }
      }

      if (inSpellSection && isStrikethrough) {
        text = `[x] ${text}`;
      }

      lines.push(text);
    }
  });

  return lines;
}

class ParagraphResult {
  constructor(success, paragraph = null, error = null) {
    this.success = success;
    this.paragraph = paragraph;
    this.error = error;
  }
}

/**
 * Gets the paragraph object that contains the specified text
 * @param {GoogleAppsScript.Document.Document} doc The Google Doc object.
 * @param {string} searchText - The text to search for
 * @returns {ParagraphResult} - Object containing paragraph info or error
 */
function GetParagraphThatContainsText(doc, searchText) {
  const paragraphs = doc.getBody().getParagraphs();

  // Find the paragraph containing the search text
  const targetParagraphIndex = paragraphs.findIndex(paragraph => paragraph.getText().includes(searchText));

  if (targetParagraphIndex === -1) {
    return new ParagraphResult(false, null, `Text '${searchText}' not found in document`);
  }

  return new ParagraphResult(true, paragraphs[targetParagraphIndex]);
}

/**
 * Updates a specific property in a Google Doc while preserving formatting
 * property value is expected to be the first number encountered after the property name
 * @param {string} docId - The Google Doc ID
 * @param {string} propertyName - The property to update (e.g., "HP", "AC")
 * @param {string|number} newValue - The new value for the property
 * @returns {Object} - Result object with success status and message
 */
function UpdateProperty(docId, propertyName, newValue) {
  try {
    const doc = DocumentApp.openById(docId);

    // Get the paragraph that contains the property
    const paragraphResult = GetParagraphThatContainsText(doc, propertyName);
    if (!paragraphResult.success) {
      return paragraphResult;
    }

    const paragraph = paragraphResult.paragraph;
    const paragraphText = paragraph.editAsText();
    const targetLine = paragraph.getText();

    // Find the position of the property name in the line
    const propertyStartIndex = targetLine.indexOf(propertyName);

    // Get the substring after the property name
    const afterProperty = targetLine.substring(propertyStartIndex + propertyName.length);

    // Find the first number after the property name
    const numberMatch = afterProperty.match(/(\d+)/);
    if (!numberMatch) {
      return {
        success: false,
        error: `No number found after property '${propertyName}' in line`
      };
    }

    // Calculate the position of the number in the original line
    const propertyValueStartIndex = propertyStartIndex + propertyName.length + numberMatch.index;

    //record attributes
    const attributes = paragraphText.getAttributes(propertyValueStartIndex);
    const fcolor = paragraphText.getForegroundColor(propertyValueStartIndex);

    const propertyEndIndex = propertyStartIndex + propertyName.length + numberMatch.index + numberMatch[0].length;
    const updatedText = targetLine.substring(propertyStartIndex, propertyValueStartIndex) + newValue.toString();

    // Update the specific text range while preserving formatting
    paragraphText.replaceText(targetLine.substring(propertyStartIndex, propertyEndIndex), updatedText);

    //restore attributes
    paragraphText.setAttributes(propertyValueStartIndex, propertyValueStartIndex + newValue.toString().length - 1, attributes);
    paragraphText.setForegroundColor(propertyValueStartIndex, propertyValueStartIndex, fcolor);

    return {
      success: true,
      message: `Successfully updated ${propertyName} to ${newValue}`
    };

  } catch (error) {
    console.error('Error updating property:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Adds a single line to a section in a Google Doc
 * @param {string} docId - The Google Doc ID
 * @param {string} sectionName - The section name to add to (e.g., "Statuses")
 * @param {string} newLine - The single line to add to the section
 * @returns {Object} - Result object with success status and message
 */
function UpdateSection(docId, sectionName, newLine) {
  try {
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    const paragraphs = body.getParagraphs();

    // Find the section start
    const sectionStartIndex = paragraphs.findIndex(paragraph =>
      paragraph.getText().includes(sectionName)
    );

    if (sectionStartIndex === -1) {
      return {
        success: false,
        error: `Section '${sectionName}' not found in document`
      };
    }

    // Find the section end (next section or end of document)
    let sectionEndIndex = sectionStartIndex + 1;
    while (sectionEndIndex < paragraphs.length &&
      !ParserUtils.sectionNames.some(name => paragraphs[sectionEndIndex].getText().includes(name))) {
      sectionEndIndex++;
    }

    // Insert the new line at the end of the section
    body.insertParagraph(sectionEndIndex, newLine);

    return {
      success: true,
      message: `Successfully added line to ${sectionName} section`
    };

  } catch (error) {
    console.error('Error updating section:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Removes a specific line from a section in a Google Doc
 * @param {string} docId - The Google Doc ID
 * @param {string} sectionName - The section name to remove from (e.g., "Statuses")
 * @param {string} lineToRemove - The exact line text to remove
 * @returns {Object} - Result object with success status and message
 */
function RemoveLineFromSection(docId, sectionName, lineToRemove) {
  try {
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    const paragraphs = body.getParagraphs();

    // Find the section start
    const sectionStartIndex = paragraphs.findIndex(paragraph =>
      paragraph.getText().includes(sectionName)
    );

    if (sectionStartIndex === -1) {
      return {
        success: false,
        error: `Section '${sectionName}' not found in document`
      };
    }

    // Find the section end (next section or end of document)
    let sectionEndIndex = sectionStartIndex + 1;
    while (sectionEndIndex < paragraphs.length &&
      !ParserUtils.sectionNames.some(name => paragraphs[sectionEndIndex].getText().includes(name))) {
      sectionEndIndex++;
    }

    // Find the specific line to remove within the section
    let lineToRemoveIndex = -1;
    for (let i = sectionStartIndex + 1; i < sectionEndIndex; i++) {
      if (paragraphs[i].getText().includes(lineToRemove)) {
        lineToRemoveIndex = i;
        break;
      }
    }

    if (lineToRemoveIndex === -1) {
      return {
        success: false,
        error: `Line '${lineToRemove}' not found in ${sectionName} section`
      };
    }

    // Remove the specific line
    paragraphs[lineToRemoveIndex].removeFromParent();

    return {
      success: true,
      message: `Successfully removed line from ${sectionName} section`
    };

  } catch (error) {
    console.error('Error removing line from section:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}


/**
 * Extracts list items between two markers from a Google Document
 * @param {GoogleAppsScript.Document.Document} doc - The Google Document object
 * @param {string} fromText - The start marker text
 * @param {string} toText - The end marker text
 * @returns {{text: string, isStrikeThrough: boolean}[]} Array of list item data
 */
function ExtractListItemsBetweenMarkers(doc, fromText, toText) {
  const listItems = ExtractListItemsArray(doc, fromText, toText);
  return ParseListItemsTextAndStrikethrough(listItems);
}

/**
 * Extracts list items from a Google Document
 * @param {GoogleAppsScript.Document.Document} doc - The Google Document object
 * @param {string} fromText - The start marker text
 * @param {string} toText - The end marker text
 * @returns { GoogleAppsScript.Document.ListItem[]} Array of list item data
 */
function ExtractListItemsArray(doc, fromText, toText) {
  const body = doc.getBody();
  const listItems = [];
  let startParsing = false;

  for (let i = 0; i < body.getNumChildren(); i++) {
    const element = body.getChild(i);
    const type = element.getType();

    let elementText = '';

    try {
      if (type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM) {
        const textElement = /** @type {GoogleAppsScript.Document.Paragraph | GoogleAppsScript.Document.ListItem} */ (element);
        elementText = textElement.getText().trim();
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
}

/**
 * Parses the text and strikethrough of a list of items
 * @param {GoogleAppsScript.Document.ListItem[]} listItems - Array of list item data
 * @returns {{text: string, isStrikeThrough: boolean}[]} Array of list item data
 */
function ParseListItemsTextAndStrikethrough(listItems) {
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
}

/**
   * Gets the spells structure from a document
   * @param {string} docId - The Google Document ID
   * @param {function(string, number, string, string, string[]): boolean} validatorFn - The validator function
   * @returns {PreparedSpellsStructure}
   */
function GetPreparedSpellsStructure(docId, validatorFn) {
  const doc = DocumentApp.openById(docId);
  // Get raw items with potentially method access if they are ListItems
  const listItems = ExtractListItemsArray(doc, 'Prepared Spells', 'Skills');

  const lines = GetDocRawLines(doc);
  let domains = [];
  const domainLine = ParserUtils.GetLineThatContainsOneOfTheseTokens(lines, ['Domain', 'domains']);
  if (domainLine) {
    domains = ParserUtils.GetParenthesesContent(domainLine).split(',').map(domain => domain.trim());
  }

  // Convert listItems to object array with [x] markers support (though here we use isStrikeThrough property)
  const spellsItems = listItems.map(listItem => {
    const text = listItem.getText().trim();
    const isStruckThrough = listItem.editAsText().isStrikethrough(0);
    return {
      text: (isStruckThrough ? '[x] ' : '') + text,
      item: listItem,
      isStrikeThrough: isStruckThrough
    };
  });

  return ParserUtils.ParsePreparedSpellsStructure(spellsItems, domains, validatorFn);
}

if (typeof module !== 'undefined') {
  module.exports = {
    GetDocRawLines,
    GetCharacterLinesFromDoc,
    NormalizeGDocsText,
    UpdateProperty,
    UpdateSection,
    RemoveLineFromSection,
    ExtractListItemsBetweenMarkers,
    ExtractListItemsArray,
    ParseListItemsTextAndStrikethrough,
    GetPreparedSpellsStructure
  };
}
