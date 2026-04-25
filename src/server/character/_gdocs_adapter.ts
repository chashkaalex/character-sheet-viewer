import { DocumentAdapter } from './_document_adapter';
import { AdapterResult } from './common_types';

import {
    ParseGDocToRawLines,
    UpdateProperty,
    UpdateSection,
    RemoveLineFromSection,
    GetSpellListItem,
    DecrementSpontaneousSlotsInGDoc,
    GetPartyMembersFromGDoc
} from '../services/gdoc_utilities';

/**
 * Google Docs implementation of the DocumentAdapter.
 * Handles the raw Google Apps Script interactions.
 */
export class GDocsAdapter extends DocumentAdapter {
    UpdateHp(docId: string, newHp: number): AdapterResult {
        return UpdateProperty(docId, 'Hp', newHp);
    }

    AddStatus(docId: string, statusLine: string): AdapterResult {
        return UpdateSection(docId, 'Statuses', statusLine);
    }

    RemoveStatus(docId: string, statusLine: string): AdapterResult {
        return RemoveLineFromSection(docId, 'Statuses', statusLine);
    }

    MarkSpellAsCast(
        docId: string,
        casterClass: string,
        spellLevel: string | number,
        slotIndex: number,
        spellName: string,
        isSpontaneous: boolean
    ): AdapterResult {
        try {
            const listItem = GetSpellListItem(docId, casterClass, spellLevel, slotIndex) as GoogleAppsScript.Document.ListItem;
            if (!listItem) {
                return { success: false, error: `Could not find spell slot for ${casterClass} level ${spellLevel} at index ${slotIndex}` };
            }

            const textElement = listItem.editAsText();

            // Basic validation
            if (!isSpontaneous && !textElement.getText().includes(spellName)) {
                console.warn(`Warning: Marking spell as cast, but slot text (${textElement.getText()}) doesn't match expected spell (${spellName})`);
            }

            textElement.setStrikethrough(true);
            return { success: true };
        } catch (e) {
            return { success: false, error: (e as Error).toString() };
        }
    }

    SetPreparedSpell(docId: string, casterClass: string, spellLevel: string | number, slotIndex: number, spellName: string): AdapterResult {
        try {
            const listItem = GetSpellListItem(docId, casterClass, spellLevel, slotIndex) as GoogleAppsScript.Document.ListItem;
            if (!listItem) {
                return { success: false, error: `Could not find spell slot for ${casterClass} level ${spellLevel} at index ${slotIndex}` };
            }

            listItem.editAsText().setText(spellName);
            return { success: true };
        } catch (e) {
            return { success: false, error: (e as Error).toString() };
        }
    }

    DecrementSpontaneousSlots(docId: string, casterClass: string, spellLevel: string | number): AdapterResult {
        const sectionName = 'Prepared Spells';
        let marker = `Level ${spellLevel}:`;

        if (casterClass === 'Bard' && spellLevel === 'songs') {
            marker = 'songs:';
        }

        return DecrementSpontaneousSlotsInGDoc(docId, sectionName, marker);
    }

    GetCharacterLines(docId: string): string[] {
        return ParseGDocToRawLines(docId);
    }

    GetPartyMembers(partyName: string, currentDocId: string): string[] {
        return GetPartyMembersFromGDoc(partyName, currentDocId);
    }
}
