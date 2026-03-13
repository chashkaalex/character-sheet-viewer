/* eslint-disable no-unused-vars */
/**
 * Interface/Base class for document manipulation adapters.
 * This decouples the character business logic from the specific storage mechanism
 * (e.g., Google Docs, a database, or a local JSON file).
 */
class DocumentAdapter {
    /**
     * Updates the character's HP.
     * @param {string} docId - The character's document/storage ID
     * @param {number} newHp - The new HP value
     * @returns {Object} Result object {success: boolean, message/error: string}
     */
    UpdateHp(docId, newHp) {
        throw new Error('Not implemented');
    }

    /**
     * Adds a new status line to the character's active statuses.
     * @param {string} docId - The character's document/storage ID
     * @param {string} statusLine - The finalized status string to add
     * @returns {Object} Result object {success: boolean, message/error: string}
     */
    AddStatus(docId, statusLine) {
        throw new Error('Not implemented');
    }

    /**
     * Removes a specific status line from the character's active statuses.
     * @param {string} docId - The character's document/storage ID
     * @param {string} statusLine - The exact status string to remove
     * @returns {Object} Result object {success: boolean, message/error: string}
     */
    RemoveStatus(docId, statusLine) {
        throw new Error('Not implemented');
    }

    /**
   * Marks a specific spell slot as consumed/cast (e.g., strikethrough in GDocs).
   * @param {string} docId - The character's document/storage ID
   * @param {string} casterClass - The name of the casting class
   * @param {number} spellLevel - The level of the spell
   * @param {number} slotIndex - The index of the slot for this class and level (0-based)
   * @param {string} spellName - The name of the spell being cast (for validation or for spontaneous slots)
   * @param {boolean} isSpontaneous - Whether this is a spontaneous cast that needs the spell name written
   * @returns {Object} Result object {success: boolean, message/error: string}
   */
    MarkSpellAsCast(docId, casterClass, spellLevel, slotIndex, spellName, isSpontaneous) {
        throw new Error('Not implemented');
    }

    /**
     * Sets the text of an empty prepared spell slot to the selected spell.
     * @param {string} docId - The character's document/storage ID
     * @param {string} casterClass - The name of the casting class
     * @param {number} spellLevel - The level of the spell
     * @param {number} slotIndex - The index of the slot for this class and level (0-based)
     * @param {string} spellName - The name of the spell being prepared
     * @returns {Object} Result object {success: boolean, message/error: string}
     */
    SetPreparedSpell(docId, casterClass, spellLevel, slotIndex, spellName) {
        throw new Error('Not implemented');
    }

    /**
     * Gets the prepared spells structure from the local/cloud document.
     * @param {string} docId - The character's document/storage ID
     * @param {function} validatorFn - The validator function
     * @returns {import('../types').PreparedSpellsStructure}
     */
    GetPreparedSpellsStructure(docId, validatorFn) {
        throw new Error('Not implemented');
    }

    /**
     * Gets the raw lines of the character sheet document
     * @param {string} docId - The character's document/storage ID
     * @returns {string[]} The array of text lines
     */
    GetCharacterLines(docId) {
        throw new Error('Not implemented');
    }

    CleanRawLines(rawLines) {
        //this one should be implemented here because it's the same for all adapters
        return rawLines.filter(line => line.trim() !== '');
    }

}

if (typeof module !== 'undefined') {
    module.exports = {
        DocumentAdapter
    };
}
