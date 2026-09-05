import { DocumentAdapter } from './_document_adapter';
import { AdapterResult } from './common_types';
import { normalizeQuotes } from './parser_utils';

import {
    ParseGDocToRawLines,
    UpdateProperty,
    UpdateSection,
    RemoveLineFromSection,
    GetSpellListItem,
    DecrementSpontaneousSlotsInGDoc,
    GetPartyMembersFromGDoc,
    PartyData,
    ReplenishPreparedSpellsInGDoc,
    ReplenishSpontaneousSlotsInGDoc,
    MoveItemInGDoc,
    ConsumeItemInGDoc
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
            if (!isSpontaneous && !normalizeQuotes(textElement.getText()).includes(normalizeQuotes(spellName))) {
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

    ReplenishPreparedSpells(docId: string, casterClass: string): AdapterResult {
        return ReplenishPreparedSpellsInGDoc(docId, casterClass);
    }

    ReplenishSpontaneousSlots(docId: string, casterClass: string): AdapterResult {
        return ReplenishSpontaneousSlotsInGDoc(docId, casterClass);
    }

    GetCharacterLines(docId: string): string[] {
        return ParseGDocToRawLines(docId);
    }

    GetPartyData(partyName: string, currentDocId: string): PartyData {
        return GetPartyMembersFromGDoc(partyName, currentDocId);
    }

    MoveItem(docId: string, itemName: string, fromSection: string, toSection: string): AdapterResult {
        return MoveItemInGDoc(docId, itemName, fromSection, toSection);
    }

    ConsumeItem(docId: string, itemName: string, sectionName: string): AdapterResult & { removedLineText?: string } {
        return ConsumeItemInGDoc(docId, itemName, sectionName);
    }

    PostRollToRolz(room: string, text: string, from: string): string | null {
        const url = 'https://rolz.org/api/post';
        const payload = {
            room: room,
            text: text,
            from: from
        };
        const options = {
            method: 'post' as const,
            payload: payload,
            muteHttpExceptions: true
        };
        try {
            const response = UrlFetchApp.fetch(url, options);
            return response.getContentText();
        } catch (e) {
            console.error('Rolz API fetch failed:', e);
            return null;
        }
    }

    PushPartyMemberStatus(dbLink: string, partyName: string, targetMember: string, payload: any): AdapterResult {
        const url = `${dbLink}/parties/${encodeURIComponent(partyName)}/members/${encodeURIComponent(targetMember)}/statuses.json`;
        try {
            const response = UrlFetchApp.fetch(url, {
                method: 'post',
                contentType: 'application/json',
                payload: JSON.stringify(payload),
                muteHttpExceptions: true
            });
            const code = response.getResponseCode();
            if (code >= 200 && code < 300) {
                return { success: true };
            }
            return { success: false, error: `Firebase RTDB responded with HTTP ${code}: ${response.getContentText()}` };
        } catch (e) {
            console.error('Firebase RTDB push failed:', e);
            return { success: false, error: (e as Error).toString() };
        }
    }
}
