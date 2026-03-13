const fs = require('fs');
const { DocumentAdapter } = require('./_document_adapter');
const { ParserUtils } = require('../parser');

/**
 * Local file system implementation of the DocumentAdapter.
 * Manipulates a local .txt file using docId as the absolute file path.
 */
class LocalAdapter extends DocumentAdapter {
    /**
     * Helper to read the lines of a file.
     * @param {string} filePath
     * @returns {string[]|null}
     */
    _readLines(filePath) {
        if (!fs.existsSync(filePath)) return null;
        return fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    }

    /**
     * Helper to write lines back to a file.
     * @param {string} filePath
     * @param {string[]} lines
     */
    _writeLines(filePath, lines) {
        fs.writeFileSync(filePath, lines.join('\n'));
    }

    UpdateHp(docId, newHp) {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('Hp:')) {
                // E.g., "Hp: 10/24" -> Replace the first number
                lines[i] = lines[i].replace(/\d+/, newHp);
                break;
            }
        }

        this._writeLines(docId, lines);
        return { success: true };
    }

    AddStatus(docId, statusLine) {
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

    RemoveStatus(docId, statusLine) {
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
    _getSpellLineIndex(lines, casterClass, spellLevel, slotIndex) {
        // Find "Prepared Spells"
        const startIdx = lines.findIndex(l => l.startsWith('Prepared Spells'));
        if (startIdx === -1) return -1;

        let inClass = false;
        let currentLevel = -1;
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
                } else if (currentLevel !== -1 && currentLevel.toString() === parseFloat(spellLevel).toString()) {
                    slotCount++;
                    if (slotCount === slotIndex) {
                        return i;
                    }
                }
            }
        }
        return -1;
    }

    MarkSpellAsCast(docId, casterClass, spellLevel, slotIndex, spellName, isSpontaneous) {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        const lineIdx = this._getSpellLineIndex(lines, casterClass, spellLevel, slotIndex);
        if (lineIdx === -1) return { success: false, error: 'Spell slot not found in file' };

        let line = lines[lineIdx];

        // Emulate strikethrough by prepending "[x] " for the parser
        if (!line.trim().startsWith('[x]')) {
            if (isSpontaneous) {
                // Spontaneous casters write the spell into the blank slot
                line = `[x] ${spellName}`;
            } else {
                line = `[x] ${line}`;
            }
            lines[lineIdx] = line;
            this._writeLines(docId, lines);
        }

        return { success: true };
    }

    SetPreparedSpell(docId, casterClass, spellLevel, slotIndex, spellName) {
        const lines = this._readLines(docId);
        if (!lines) return { success: false, error: 'File not found' };

        const lineIdx = this._getSpellLineIndex(lines, casterClass, spellLevel, slotIndex);
        if (lineIdx === -1) return { success: false, error: 'Spell slot not found in file' };

        lines[lineIdx] = spellName;
        this._writeLines(docId, lines);

        return { success: true };
    }

    GetPreparedSpellsStructure(docId, validatorFn) {
        const lines = this._readLines(docId);
        if (!lines) return {};

        const startIdx = lines.findIndex(l => l.startsWith('Prepared Spells'));
        if (startIdx === -1) return {};

        const spellsItems = [];
        for (let i = startIdx + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (ParserUtils.IsSectionLine(line) && !line.startsWith('Spells')) break; // Escaped section
            if (!line) continue;

            const isStruckThrough = line.startsWith('[x] ');

            spellsItems.push({
                text: line,
                isStrikeThrough: isStruckThrough
            });
        }

        // Local domains tracking (rudimentary implementation just for passing spells data structure)
        let domains = [];
        const domainLine = ParserUtils.GetLineThatContainsOneOfTheseTokens(lines, ['Domain', 'domains']);
        if (domainLine) {
            domains = ParserUtils.GetParenthesesContent(domainLine).split(',').map(d => d.trim());
        }

        return ParserUtils.ParsePreparedSpellsStructure(spellsItems, domains, validatorFn);
    }

    GetCharacterLines(docId) {
        const res = this._readLines(docId) || [];

        return res;
    }
}

const localAdapterInstance = new LocalAdapter();
if (typeof module !== 'undefined') {
    module.exports = {
        LocalAdapter,
        adapter: localAdapterInstance
    };
}
