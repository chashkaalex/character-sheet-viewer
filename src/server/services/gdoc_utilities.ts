import { ParserUtils } from '../character/parser_utils';
import { AdapterResult } from '../character/common_types';

class ParagraphResult {
    public success: boolean;
    public paragraph: GoogleAppsScript.Document.Paragraph | null;
    public error: string | null;

    constructor(success: boolean, paragraph: GoogleAppsScript.Document.Paragraph | null = null, error: string | null = null) {
        this.success = success;
        this.paragraph = paragraph;
        this.error = error;
    }
}

/**
 * Gets the paragraph object that contains the specified text
 * @param doc The Google Doc object.
 * @param searchText The text to search for
 * @returns Object containing paragraph info or error
 */
function GetParagraphThatContainsText(doc: GoogleAppsScript.Document.Document, searchText: string): ParagraphResult {
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
 * @param docId The Google Doc ID
 * @param propertyName The property to update (e.g., "HP", "AC")
 * @param newValue The new value for the property
 * @returns Result object with success status and message
 */
export function UpdateProperty(docId: string, propertyName: string, newValue: string | number): AdapterResult {
    try {
        const doc = DocumentApp.openById(docId);

        // Get the paragraph that contains the property
        const paragraphResult = GetParagraphThatContainsText(doc, propertyName);
        if (!paragraphResult.success) {
            return { success: false, error: paragraphResult.error || 'Unknown error' };
        }

        const paragraph = paragraphResult.paragraph!;
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
        const propertyValueStartIndex = propertyStartIndex + propertyName.length + (numberMatch.index || 0);

        // record attributes
        const attributes = paragraphText.getAttributes(propertyValueStartIndex);
        const fcolor = paragraphText.getForegroundColor(propertyValueStartIndex);

        const propertyEndIndex = propertyStartIndex + propertyName.length + (numberMatch.index || 0) + numberMatch[0].length;
        const updatedText = targetLine.substring(propertyStartIndex, propertyValueStartIndex) + newValue.toString();

        // Update the specific text range while preserving formatting
        paragraphText.replaceText(targetLine.substring(propertyStartIndex, propertyEndIndex), updatedText);

        // restore attributes
        paragraphText.setAttributes(propertyValueStartIndex, propertyValueStartIndex + newValue.toString().length - 1, attributes);
        paragraphText.setForegroundColor(propertyValueStartIndex, propertyValueStartIndex + newValue.toString().length - 1, fcolor);

        return {
            success: true,
            message: `Successfully updated ${propertyName} to ${newValue}`
        };

    } catch (error) {
        console.error('Error updating property:', error);
        return {
            success: false,
            error: (error as Error).toString()
        };
    }
}

/**
 * Adds a single line to a section in a Google Doc
 * @param docId The Google Doc ID
 * @param sectionName The section name to add to (e.g., "Statuses")
 * @param newLine The single line to add to the section
 * @returns Result object with success status and message
 */
export function UpdateSection(docId: string, sectionName: string, newLine: string): AdapterResult {
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
            error: (error as Error).toString()
        };
    }
}

/**
 * Removes a specific line from a section in a Google Doc
 * @param docId The Google Doc ID
 * @param sectionName The section name to remove from (e.g., "Statuses")
 * @param lineToRemove The exact line text to remove
 * @returns Result object with success status and message
 */
export function RemoveLineFromSection(docId: string, sectionName: string, lineToRemove: string): AdapterResult {
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
            error: (error as Error).toString()
        };
    }
}

/**
 * Parses a Google Doc to raw lines including styles like:
 * - list items being strikethrough (for spells state)
 * @param docId The Google Doc ID
 * @returns Array of raw lines
 */
export function ParseGDocToRawLines(docId: string): string[] {
    ReplaceSoftWithHardReturns(docId);
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    const paragraphs = body.getParagraphs();

    const rawLines: string[] = [];
    paragraphs.forEach(paragraph => {
        // if it is a list item, get the text and strikethrough
        let text = paragraph.getText().trim();
        if (paragraph.getType() === DocumentApp.ElementType.LIST_ITEM) {
            const listItem = paragraph.asListItem();
            if (text === '') {
                text = '[o]';
            } else if (listItem.editAsText().isStrikethrough(0)) { // check if the first character is strikethrough
                text = '[x]' + text;
            }
        }
        if (text !== '') {
            rawLines.push(text);
        }
    });
    return rawLines;
}

export function ReplaceSoftWithHardReturns(docId: string): void {
    // Use the advanced Docs service to perform a batch update
    const requests = [{
        replaceAllText: {
            replaceText: '\n', // This will be interpreted as a hard return
            containsText: {
                text: '\u000b',  // The Unicode for a soft return (vertical tab)
                matchCase: true
            }
        }
    }];

    // Execute the request
    // @ts-ignore - Docs is a global available via advanced services
    Docs.Documents.batchUpdate({ requests: requests }, docId);
}

/**
 * Extracts list items from a Google Document
 * @param doc The Google Document object
 * @param sectionName The section name text
 * @returns Array of list item data
 */
export function ExtractListItemsArray(doc: GoogleAppsScript.Document.Document, sectionName: string): GoogleAppsScript.Document.ListItem[] {
    const body = doc.getBody();
    const listItems: GoogleAppsScript.Document.ListItem[] = [];
    let startParsing = false;

    for (let i = 0; i < body.getNumChildren(); i++) {
        const element = body.getChild(i);
        const type = element.getType();

        let elementText = '';

        try {
            if (type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM) {
                const textElement = element as GoogleAppsScript.Document.Paragraph | GoogleAppsScript.Document.ListItem;
                elementText = textElement.getText().trim();
            }
        } catch (e) {
            // Ignore complex elements
        }

        if (startParsing && ParserUtils.IsSectionLine(elementText) && !elementText.startsWith(sectionName)) {
            startParsing = false;
            break;
        }

        if (elementText.startsWith(sectionName)) {
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
 * Gets a specific spell list item from a Google Document
 * @param docId The Google Document ID
 * @param casterClass The caster class name
 * @param spellLevel The spell level
 * @param slotIndex The slot index
 * @returns The spell list item or null
 */
export function GetSpellListItem(docId: string, casterClass: string, spellLevel: string | number, slotIndex: number): GoogleAppsScript.Document.ListItem | null {
    const doc = DocumentApp.openById(docId);
    // Get raw items with potentially method access if they are ListItems
    const listItems = ExtractListItemsArray(doc, 'Prepared Spells');

    const lines = ParseGDocToRawLines(docId);
    let domains: string[] = [];
    const domainLine = ParserUtils.GetLineThatContainsOneOfTheseTokens(lines, ['Domain', 'domains']);
    if (domainLine) {
        domains = ParserUtils.GetParenthesesContent(domainLine).split(',').map(domain => domain.trim());
    }

    // Convert listItems to object array
    const spellsItems = listItems.map(listItem => {
        const text = listItem.getText().trim();
        const isStruckThrough = text !== '' && listItem.editAsText().isStrikethrough(0);
        return {
            text: text,
            isStrikeThrough: isStruckThrough,
            listItem: listItem
        };
    });

    const preparedSpellsStructure = ParserUtils.ParsePreparedSpellsStructure(spellsItems, domains, () => true);

    // Filter for the specific spell level
    // @ts-ignore
    const levelItems = preparedSpellsStructure[casterClass][spellLevel];
    if (!levelItems) return null;

    // Find the specific slot index
    const targetItem = levelItems[slotIndex];

    return targetItem ? targetItem.listItem || null : null;
}

/**
 * Decrements a spontaneous spell slot count in a section
 * @param docId The Google Doc ID
 * @param sectionName The section name (e.g., "Spell Slots per day")
 * @param marker The marker to identify the line (e.g., "Level 1:")
 * @returns Result object with success status and message
 */
export function DecrementSpontaneousSlotsInGDoc(docId: string, sectionName: string, marker: string): AdapterResult {
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

        // Find the section end
        let sectionEndIndex = sectionStartIndex + 1;
        while (sectionEndIndex < paragraphs.length &&
            !ParserUtils.sectionNames.some(name => paragraphs[sectionEndIndex].getText().includes(name))) {
            sectionEndIndex++;
        }

        // Find the specific line
        for (let i = sectionStartIndex; i < sectionEndIndex; i++) {
            const paragraph = paragraphs[i];
            const text = paragraph.getText();

            const isTargetLine = text.startsWith(marker);

            if (isTargetLine) {
                const match = text.match(/(\d+)\/(\d+)/);
                if (match) {
                    const remaining = parseInt(match[1]);
                    const total = parseInt(match[2]);
                    if (remaining > 0) {
                        const newText = text.replace(`${remaining}/${total}`, `${remaining - 1}/${total}`);
                        paragraph.setText(newText);
                        return { success: true };
                    }
                    return { success: false, error: 'No slots remaining' };
                }
            }
        }

        return {
            success: false,
            error: `Marker '${marker}' not found in ${sectionName} section`
        };

    } catch (error) {
        console.error('Error decrementing spontaneous slots:', error);
        return {
            success: false,
            error: (error as Error).toString()
        };
    }
}

/**
 * Decrements a numerical property using the UpdateProperty formatting preservation logic.
 * @param docId The Google Doc ID
 * @param propertyName The property to decrement (e.g., "Songs per day:")
 * @returns Result object with success status and message
 */
export function DecrementPropertyWithUpdateProperty(docId: string, propertyName: string): AdapterResult {
    try {
        const doc = DocumentApp.openById(docId);
        const paragraphResult = GetParagraphThatContainsText(doc, propertyName);
        if (!paragraphResult.success) {
            return { success: false, error: paragraphResult.error || 'Unknown error' };
        }

        const paragraph = paragraphResult.paragraph!;
        const text = paragraph.getText();
        const propertyStartIndex = text.indexOf(propertyName);
        const afterProperty = text.substring(propertyStartIndex + propertyName.length);

        // Find the first number after the property name
        const numberMatch = afterProperty.match(/(\d+)/);
        if (!numberMatch) {
            return {
                success: false,
                error: `No numeric value found to decrement for property '${propertyName}'`
            };
        }

        const currentValue = parseInt(numberMatch[1], 10);
        if (currentValue <= 0) {
            return {
                success: false,
                error: `Property '${propertyName}' is already zero.`
            };
        }

        // Defer to the existing UpdateProperty behavior to preserve formatting
        return UpdateProperty(docId, propertyName, currentValue - 1);

    } catch (error) {
        console.error('Error decrementing property:', error);
        return {
            success: false,
            error: (error as Error).toString()
        };
    }
}

/**
 * Gets the members of a party from the Parties document
 * @param partyName The name of the party
 * @param currentDocId The calling character's doc ID for validation
 * @returns List of valid character names in the party
 */
export function GetPartyMembersFromGDoc(partyName: string, currentDocId: string): string[] {
    try {
        const partiesDocId = PropertiesService.getScriptProperties().getProperty('PARTIES_DOC_ID');
        if (!partiesDocId) {
            console.error('PARTIES_DOC_ID not set in script properties');
            return [];
        }
        const doc = DocumentApp.openById(partiesDocId);
        let targetTab: any = null;

        // Iterate through tabs to find the matching party name
        // @ts-ignore - getTabs is a newer feature in GAS DocumentApp
        for (const tab of doc.getTabs()) {
            if (tab.getTitle() === partyName) {
                targetTab = tab;
                break;
            }
        }

        if (!targetTab) {
            console.error(`Party "${partyName}" not found in Parties document`);
            return [];
        }

        const body = targetTab.asDocumentTab().getBody();
        const text = body.getText();
        const lines = text.split(/\r?\n/).map(line => line.trim());

        let isMember = false;
        const memberNames: string[] = [];
        let inMembersSection = false;

        // Format: "Character_Sheet_Name gdoc_id"
        for (const line of lines) {
            if (line === 'Party Members') {
                inMembersSection = true;
                continue;
            }
            if (line === 'Events Log') {
                break;
            }

            if (!inMembersSection || line === '') continue;

            const parts = line.split(' ');
            if (parts.length < 2) continue; // skip malformed lines

            const docId = parts.pop(); // The last part is the docId
            const memberName = parts.join(' '); // Rejoin the rest as the name

            if (docId === currentDocId) {
                isMember = true;
            }
            memberNames.push(memberName);
        }

        if (!isMember) {
            console.error(`Validation failed: Current doc ID ${currentDocId} not found in party list for ${partyName}`);
            return [];
        }

        return memberNames;
    } catch (e) {
        console.error('Error fetching party members:', e);
        return [];
    }
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = {
        ParseGDocToRawLines,
        UpdateProperty,
        UpdateSection,
        RemoveLineFromSection,
        ExtractListItemsArray,
        GetSpellListItem,
        DecrementSpontaneousSlotsInGDoc,
        DecrementPropertyWithUpdateProperty,
        GetPartyMembersFromGDoc
    };
}
