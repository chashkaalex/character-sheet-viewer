const { DocumentAdapter } = require('./_document_adapter');
const { GetDocRawLines, UpdateProperty, UpdateSection, RemoveLineFromSection, GetSpellListItem, GDocGetPreparedSpellsStructure } = require('../gdocs');

/**
 * Google Docs implementation of the DocumentAdapter.
 * Handles the raw Google Apps Script interactions.
 */
class GDocsAdapter extends DocumentAdapter {
    UpdateHp(docId, newHp) {
        return UpdateProperty(docId, 'Hp', newHp);
    }

    AddStatus(docId, statusLine) {
        return UpdateSection(docId, 'Statuses', statusLine);
    }

    RemoveStatus(docId, statusLine) {
        return RemoveLineFromSection(docId, 'Statuses', statusLine);
    }


    MarkSpellAsCast(docId, casterClass, spellLevel, slotIndex, spellName, isSpontaneous) {
        try {
            const listItem = GetSpellListItem(docId, casterClass, spellLevel, slotIndex);
            if (!listItem) {
                return { success: false, error: `Could not find spell slot for ${casterClass} level ${spellLevel} at index ${slotIndex}` };
            }

            const textElement = listItem.editAsText();

            // Basic validation (optional, but good for safety as requested)
            if (!isSpontaneous && !textElement.getText().includes(spellName)) {
                console.warn(`Warning: Marking spell as cast, but slot text (${textElement.getText()}) doesn't match expected spell (${spellName})`);
            }

            if (isSpontaneous) {
                textElement.setText(spellName);
            }

            textElement.setStrikethrough(true);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.toString() };
        }
    }

    SetPreparedSpell(docId, casterClass, spellLevel, slotIndex, spellName) {
        try {
            const listItem = GetSpellListItem(docId, casterClass, spellLevel, slotIndex);
            if (!listItem) {
                return { success: false, error: `Could not find spell slot for ${casterClass} level ${spellLevel} at index ${slotIndex}` };
            }

            listItem.editAsText().setText(spellName);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.toString() };
        }
    }

    GetCharacterLines(docId) {
        const doc = DocumentApp.openById(docId);
        return GetDocRawLines(doc);
    }

    GetPreparedSpellsStructure(docId, validatorFn) {
        return GDocGetPreparedSpellsStructure(docId, validatorFn);
    }
}

// Single instance to be used everywhere
const gDocsAdapterInstance = new GDocsAdapter();
if (typeof module !== 'undefined') {
    module.exports = {
        GDocsAdapter,
        adapter: gDocsAdapterInstance
    };
}
