import * as fs from 'fs';
import { DocumentAdapter } from '../server/character/_document_adapter';
import { ParserUtils } from '../server/character/parser_utils';
import { AdapterResult } from '../server/character/common_types';

/**
 * Local file system implementation of the DocumentAdapter.
 * Manipulates a local .txt file using docId as the absolute file path.
 */
export class LocalAdapter extends DocumentAdapter {
    /**
     * Helper to read the lines of a file.
     * @param filePath
     * @returns {string[]|null}
     */
    _readLines(filePath: string): string[] | null {
        if (!fs.existsSync(filePath)) return null;
        return fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    }

    /**
     * Helper to write lines back to a file.
     * @param filePath
     * @param lines
     */
    _writeLines(filePath: string, lines: string[]): void {
        fs.writeFileSync(filePath, lines.join('\n'));
    }

    UpdateHp(docId: string, newHp: number): AdapterResult {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('Hp:')) {
                // E.g., "Hp: 10/24" -> Replace the first number
                lines[i] = lines[i].replace(/\d+/, newHp.toString());
                break;
            }
        }

        this._writeLines(docId, lines);
        return { success: true };
    }

    AddStatus(docId: string, statusLine: string): AdapterResult {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        const statusSectionIdx = lines.findIndex(l => l.startsWith('Statuses'));
        if (statusSectionIdx === -1) return { success: false, error: 'Statuses section not found' };

        // Insert at the end of the Statuses section
        let insertIdx = statusSectionIdx + 1;
        while (insertIdx < lines.length && !ParserUtils.IsSectionLine(lines[insertIdx])) {
            insertIdx++;
        }

        lines.splice(insertIdx, 0, statusLine);
        this._writeLines(docId, lines);
        return { success: true };
    }

    RemoveStatus(docId: string, statusLine: string): AdapterResult {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        const statusSectionIdx = lines.findIndex(l => l.startsWith('Statuses'));
        if (statusSectionIdx === -1) return { success: false, error: 'Statuses section not found' };

        let removeIdx = -1;
        for (let i = statusSectionIdx + 1; i < lines.length; i++) {
            if (ParserUtils.IsSectionLine(lines[i])) break;
            if (lines[i].includes(statusLine)) {
                removeIdx = i;
                break;
            }
        }

        if (removeIdx !== -1) {
            lines.splice(removeIdx, 1);
            this._writeLines(docId, lines);
            return { success: true };
        }

        return { success: false, error: 'Status line not found' };
    }

    /**
     * Helper logic to locate the correct list item line in the file
     */
    _getSpellLineIndex(lines: string[], casterClass: string, spellLevel: string | number, slotIndex: number): number {
        // Find "Prepared Spells"
        const startIdx = lines.findIndex(l => l.startsWith('Prepared Spells'));
        if (startIdx === -1) return -1;

        let inClass = false;
        let currentLevel: number | null = -1;
        let slotCount = -1;

        for (let i = startIdx + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (ParserUtils.IsSectionLine(line) && !line.startsWith('Spells')) break; // Escaped spell section
            if (!line) continue;

            // Found class header
            if (line === casterClass) {
                inClass = true;
                if (casterClass === 'BardicSpecial') {
                    currentLevel = 1;
                    slotCount = -1;
                }
                continue;
            } else if (inClass && line !== casterClass && ['Cleric', 'Wizard', 'Druid', 'Sorcerer', 'Bard'].includes(line)) {
                // switched class
                inClass = false;
            }

            if (inClass) {
                if (line.includes('level')) {
                    currentLevel = ParserUtils.GetFirstNumberFromALine(line);
                    // Match "level X - domain" vs normal
                    const isDomainTarget = spellLevel.toString().includes('domain');
                    const isDomainCurrent = line.toLowerCase().includes('domain');
                    if (isDomainTarget !== isDomainCurrent) {
                        currentLevel = -1; // mismatch domain status
                    }
                    slotCount = -1; // reset slots for this level
                } else if (currentLevel !== -1 && currentLevel !== null && currentLevel.toString() === parseFloat(spellLevel.toString()).toString()) {
                    slotCount++;
                    if (slotCount === slotIndex) {
                        return i;
                    }
                }
            }
        }
        return -1;
    }

    MarkSpellAsCast(docId: string, casterClass: string, spellLevel: string | number, slotIndex: number, spellName: string, isSpontaneous: boolean): AdapterResult {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        const lineIdx = this._getSpellLineIndex(lines, casterClass, spellLevel, slotIndex);
        if (lineIdx === -1) return { success: false, error: 'Spell slot not found in file' };

        let line = lines[lineIdx];

        // Basic validation (optional, but good for safety as requested)
        if (!isSpontaneous && !line.includes(spellName)) {
            console.warn(`Warning: Marking spell as cast, but slot text (${line}) doesn't match expected spell (${spellName})`);
        }

        // Emulate strikethrough by prepending "[x] " for the parser
        if (!line.trim().startsWith('[x]')) {
            line = `[x] ${line}`;
            lines[lineIdx] = line;
            this._writeLines(docId, lines);
        }

        return { success: true };
    }

    DecrementSpontaneousSlots(docId: string, casterClass: string, spellLevel: string | number): AdapterResult {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        // Determine which section and marker to look for
        let sectionName = 'Spell Slots per day';
        let marker = `Level ${spellLevel}:`;

        if (casterClass === 'Bard' && spellLevel === 'songs') {
            sectionName = 'Prepared Spells';
            marker = 'songs:';
        }

        const sectionIdx = lines.findIndex(l => l.trim().startsWith(sectionName));
        if (sectionIdx === -1) return { success: false, error: `${sectionName} section not found` };

        for (let i = sectionIdx; i < lines.length; i++) {
            if (i > sectionIdx && ParserUtils.IsSectionLine(lines[i])) break;

            const line = lines[i];
            if (line.includes(marker)) {
                // Find "X/Y" and decrement X
                const match = line.match(/(\d+)\/(\d+)/);
                if (match) {
                    const remaining = parseInt(match[1]);
                    const total = parseInt(match[2]);
                    if (remaining > 0) {
                        const newLine = line.replace(`${remaining}/${total}`, `${remaining - 1}/${total}`);
                        lines[i] = newLine;
                        this._writeLines(docId, lines);
                        return { success: true };
                    }
                    return { success: false, error: 'No slots remaining' };
                }
            }
        }
        return { success: false, error: `${marker} matching slots not found` };
    }

    SetPreparedSpell(docId: string, casterClass: string, spellLevel: string | number, slotIndex: number, spellName: string): AdapterResult {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        const lineIdx = this._getSpellLineIndex(lines, casterClass, spellLevel, slotIndex);
        if (lineIdx === -1) return { success: false, error: 'Spell slot not found in file' };

        lines[lineIdx] = spellName;
        this._writeLines(docId, lines);

        return { success: true };
    }

    GetCharacterLines(docId: string): string[] {
        const res = this._readLines(docId) || [];

        return res;
    }

    GetPartyMembers(partyName: string, _currentDocId: string): string[] {
        //return the local file names of the characters in the party
        if (partyName === 'TeamD20_T&E') {
            return ['thror_test', 'bess_test'];
        }
        return [];
    }
}

export const adapter = new LocalAdapter();

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = {
        LocalAdapter,
        adapter: adapter
    };
}
