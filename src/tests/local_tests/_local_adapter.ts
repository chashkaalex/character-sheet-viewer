import * as fs from 'fs';
import { DocumentAdapter } from '../../server/character/_document_adapter';
import { GetFirstNumberFromALine } from '../../server/character/parser_utils';
import { IsSectionLine } from '../../server/character/parsers/doc_parser';
import { AdapterResult } from '../../server/character/common_types';
import { ClassesData } from '../../server/classes_data/_classes_general_data';

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
            if (lines[i].includes('Hp:')) {
                // E.g., "Hp: 10/24" or "BAb: +9; Hp: 74/74" -> Replace the first number after "Hp:"
                lines[i] = lines[i].replace(/(Hp:\s*)\d+/, `$1${newHp}`);
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
        while (insertIdx < lines.length && !IsSectionLine(lines[insertIdx])) {
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
            if (IsSectionLine(lines[i])) break;
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
            if (IsSectionLine(line) && !line.startsWith('Spells')) break; // Escaped spell section
            if (!line) continue;

            // Found class header
            if (line === casterClass) {
                inClass = true;
                if (casterClass === 'BardicSpecial') {
                    currentLevel = 1;
                    slotCount = -1;
                }
                continue;
            } else if (inClass && line !== casterClass && ClassesData.has(line)) {
                // switched class
                inClass = false;
            }

            if (inClass) {
                if (line.includes('level')) {
                    currentLevel = GetFirstNumberFromALine(line);
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

        const sectionName = 'Prepared Spells';
        let marker = `Level ${spellLevel}:`;

        if (casterClass === 'Bard' && spellLevel === 'songs') {
            marker = 'songs:';
        }

        const sectionIdx = lines.findIndex(l => l.trim().startsWith(sectionName));
        if (sectionIdx === -1) return { success: false, error: `${sectionName} section not found` };

        for (let i = sectionIdx; i < lines.length; i++) {
            if (i > sectionIdx && IsSectionLine(lines[i])) break;

            const line = lines[i];
            if (line.toLowerCase().includes(marker.toLowerCase())) {
                // Find "X/Y" and decrement X
                const match = line.match(/(\d+)\/(\d+)/);
                if (match) {
                    const remaining = parseInt(match[1]);
                    const total = parseInt(match[2]);
                    if (remaining > 0) {
                        let newLine = line.replace(`${remaining}/${total}`, `${remaining - 1}/${total}`);
                        if (newLine.trim().startsWith('[x]')) {
                            newLine = newLine.replace('[x]', '').trim();
                        }
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

    ReplenishPreparedSpells(docId: string, casterClass: string): AdapterResult {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        const startIdx = lines.findIndex(l => l.trim().startsWith('Prepared Spells'));
        if (startIdx === -1) return { success: false, error: 'Prepared Spells section not found' };

        let inClass = false;

        for (let i = startIdx + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (IsSectionLine(line) && !line.startsWith('Spells')) break; // Escaped spell section

            if (line === casterClass) {
                inClass = true;
                continue;
            } else if (inClass && ClassesData.has(line)) {
                // switched class
                inClass = false;
            }

            if (inClass) {
                if (lines[i].trim().startsWith('[x]')) {
                    lines[i] = lines[i].replace('[x]', '').trim();
                }
            }
        }

        this._writeLines(docId, lines);
        return { success: true };
    }

    ReplenishSpontaneousSlots(docId: string, casterClass: string): AdapterResult {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        const startIdx = lines.findIndex(l => l.trim().startsWith('Prepared Spells'));
        if (startIdx === -1) return { success: false, error: 'Prepared Spells section not found' };

        let inClass = false;

        for (let i = startIdx + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (IsSectionLine(line) && !line.startsWith('Spells')) break; // Escaped spell section

            if (line === casterClass) {
                inClass = true;
                continue;
            } else if (inClass && ClassesData.has(line)) {
                // switched class
                inClass = false;
            }

            if (inClass) {
                const match = lines[i].match(/(\d+)\/(\d+)/);
                if (match) {
                    const total = match[2];
                    let newLine = lines[i].replace(/(\d+)\/(\d+)/, `${total}/${total}`);
                    if (newLine.trim().startsWith('[x]')) {
                        newLine = newLine.replace('[x]', '').trim();
                    }
                    lines[i] = newLine;
                }
            }
        }

        this._writeLines(docId, lines);
        return { success: true };
    }

    GetCharacterLines(docId: string): string[] {
        const res = this._readLines(docId) || [];

        return res;
    }

    GetPartyData(partyName: string, _currentDocId: string): { memberNames: string[]; quickStatuses: string[] } {
        //return the local file names of the characters in the party
        if (partyName === 'TeamD20_T&E') {
            return {
                memberNames: ['thror_test', 'bess_test'],
                quickStatuses: ['Thror is preparing spells', 'Bess is ready']
            };
        }
        return { memberNames: [], quickStatuses: [] };
    }

    MoveItem(docId: string, itemName: string, fromSection: string, toSection: string): AdapterResult {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        const fromIdx = lines.findIndex(l => l.trim() === fromSection || l.trim() === `${fromSection}:`);
        const toIdx = lines.findIndex(l => l.trim() === toSection || l.trim() === `${toSection}:`);

        if (fromIdx === -1) return { success: false, error: `Source section ${fromSection} not found` };
        if (toIdx === -1) return { success: false, error: `Target section ${toSection} not found` };

        // Find the item line under fromSection
        let itemIdx = -1;
        for (let i = fromIdx + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (IsSectionLine(line)) break;
            if (line.toLowerCase().includes(itemName.toLowerCase())) {
                itemIdx = i;
                break;
            }
        }

        if (itemIdx === -1) {
            return { success: false, error: `Item '${itemName}' not found in ${fromSection}` };
        }

        const itemLine = lines[itemIdx];
        // Remove item from source
        lines.splice(itemIdx, 1);

        // Re-find target section index since index might have shifted
        const newToIdx = lines.findIndex(l => l.trim() === toSection || l.trim() === `${toSection}:`);

        // Find insert index (end of toSection)
        let insertIdx = newToIdx + 1;
        while (insertIdx < lines.length && !IsSectionLine(lines[insertIdx])) {
            insertIdx++;
        }

        // Insert at end of target section
        lines.splice(insertIdx, 0, itemLine);

        this._writeLines(docId, lines);
        return { success: true };
    }

    ConsumeItem(docId: string, itemName: string, sectionName: string): AdapterResult & { removedLineText?: string } {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        const sectionIdx = lines.findIndex(l => l.trim() === sectionName || l.trim() === `${sectionName}:`);
        if (sectionIdx === -1) return { success: false, error: `Section ${sectionName} not found` };

        let itemIdx = -1;
        for (let i = sectionIdx + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (IsSectionLine(line)) break;
            if (line.toLowerCase().includes(itemName.toLowerCase())) {
                itemIdx = i;
                break;
            }
        }

        if (itemIdx === -1) {
            return { success: false, error: `Item '${itemName}' not found in ${sectionName}` };
        }

        const originalLine = lines[itemIdx];
        const decrementedLine = decrementOrRemoveLine(originalLine);

        if (decrementedLine === null) {
            lines.splice(itemIdx, 1);
        } else {
            lines[itemIdx] = decrementedLine;
        }

        this._writeLines(docId, lines);
        return { success: true, removedLineText: originalLine };
    }

    PostRollToRolz(room: string, text: string, from: string): string | null {
        const url = 'https://rolz.org/api/post';
        try {
            // @ts-ignore
            const { spawnSync } = require('child_process');
            const payload = `room=${encodeURIComponent(room)}&text=${encodeURIComponent(text)}&from=${encodeURIComponent(from)}`;
            const result = spawnSync('curl', ['-s', '-X', 'POST', '-d', payload, url], { encoding: 'utf8' });
            if (result.status !== 0) {
                console.error('Curl execution failed:', result.stderr);
                return null;
            }
            return result.stdout;
        } catch (e) {
            console.error('Rolz API local curl failed:', e);
            return null;
        }
    }
}

export function decrementOrRemoveLine(line: string): string | null {
    const xMatch = line.match(/\b([xX×]\s*)(\d+)\b/);
    if (xMatch) {
        const prefix = xMatch[1];
        const count = parseInt(xMatch[2]);
        if (count > 1) {
            return line.replace(/\b([xX×]\s*)(\d+)\b/, `${prefix}${count - 1}`);
        } else {
            return null;
        }
    }

    const parenMatch = line.match(/\(\s*(\d+)\s*\)/);
    if (parenMatch) {
        const count = parseInt(parenMatch[1]);
        if (count > 1) {
            return line.replace(/\(\s*(\d+)\s*\)/, `(${count - 1})`);
        } else {
            return null;
        }
    }

    return null;
}

export const adapter = new LocalAdapter();
