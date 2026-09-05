import { AdapterResult } from './common_types';

/**
 * Interface/Base class for document manipulation adapters.
 * This decouples the character business logic from the specific storage mechanism
 * (e.g., Google Docs, a database, or a local JSON file).
 */
export abstract class DocumentAdapter {
    /**
     * Updates the character's HP.
     * @param docId - The character's document/storage ID
     * @param newHp - The new HP value
     * @returns Result object
     */
    abstract UpdateHp(docId: string, newHp: number): AdapterResult;

    /**
     * Adds a new status line to the character's active statuses.
     * @param docId - The character's document/storage ID
     * @param statusLine - The finalized status string to add
     * @returns Result object
     */
    abstract AddStatus(docId: string, statusLine: string): AdapterResult;

    /**
     * Removes a specific status line from the character's active statuses.
     * @param docId - The character's document/storage ID
     * @param statusLine - The exact status string to remove
     * @returns Result object
     */
    abstract RemoveStatus(docId: string, statusLine: string): AdapterResult;

    /**
     * Marks a specific spell slot as consumed/cast (e.g., strikethrough in GDocs).
     * @param docId - The character's document/storage ID
     * @param casterClass - The name of the casting class
     * @param spellLevel - The level of the spell
     * @param slotIndex - The index of the slot for this class and level (0-based)
     * @param spellName - The name of the spell being cast (for validation or for spontaneous slots)
     * @param isSpontaneous - Whether this is a spontaneous cast that needs the spell name written
     * @returns Result object
     */
    abstract MarkSpellAsCast(
        docId: string,
        casterClass: string,
        spellLevel: string | number,
        slotIndex: number,
        spellName: string,
        isSpontaneous: boolean
    ): AdapterResult;

    /**
     * Decrements a spontaneous spell slot count in the document.
     * @param docId - The character's document/storage ID
     * @param casterClass - The name of the casting class
     * @param spellLevel - The level of the spell
     * @returns Result object
     */
    abstract DecrementSpontaneousSlots(docId: string, casterClass: string, spellLevel: string | number): AdapterResult;

    /**
     * Sets the text of an empty prepared spell slot to the selected spell.
     * @param docId - The character's document/storage ID
     * @param casterClass - The name of the casting class
     * @param spellLevel - The level of the spell
     * @param slotIndex - The index of the slot for this class and level (0-based)
     * @param spellName - The name of the spell being prepared
     * @returns Result object
     */
    abstract SetPreparedSpell(docId: string, casterClass: string, spellLevel: string | number, slotIndex: number, spellName: string): AdapterResult;

    /**
     * Gets the raw lines of the character sheet document
     * @param docId - The character's document/storage ID
     * @returns The array of text lines
     */
    abstract GetCharacterLines(docId: string): string[];

    /**
     * Gets the names and quick statuses of a specific party from the 'Parties' document.
     * @param partyName - The name of the party
     * @param currentDocId - The document ID of the character making the request (for validation)
     * @returns An object containing memberNames and quickStatuses
     */
    abstract GetPartyData(partyName: string, currentDocId: string): { memberNames: string[]; quickStatuses: string[]; partyNickname?: string | null };

    /**
     * Replenishes prepared spells (removes strikethroughs).
     */
    abstract ReplenishPreparedSpells(docId: string, casterClass: string): AdapterResult;

    /**
     * Replenishes spontaneous spell slots (restores counts to max).
     */
    abstract ReplenishSpontaneousSlots(docId: string, casterClass: string): AdapterResult;

    /**
     * Moves an item from one section to another.
     * @param docId - The character's document/storage ID
     * @param itemName - The name of the item
     * @param fromSection - The section name to move from
     * @param toSection - The section name to move to
     * @returns Result object
     */
    abstract MoveItem(docId: string, itemName: string, fromSection: string, toSection: string): AdapterResult;

    /**
     * Consumes an item from a section (decrements or removes it).
     * @param docId - The character's document/storage ID
     * @param itemName - The name of the item
     * @param sectionName - The section name (e.g. 'Battle Gear')
     * @returns Result object with removedLineText
     */
    abstract ConsumeItem(docId: string, itemName: string, sectionName: string): AdapterResult & { removedLineText?: string };

    /**
     * Posts a roll request to Rolz.org room.
     * @param room - The Rolz Room ID
     * @param text - The text to post (including roll formulas like [1d8+3])
     * @param from - The sender name
     * @returns The raw API response string, or null on error
     */
    abstract PostRollToRolz(room: string, text: string, from: string): string | null;

    /**
     * Pushes a status payload to a party member's node in Firebase Realtime Database.
     * @param dbLink - Database base URL
     * @param partyName - Name of the party
     * @param targetMember - Name/nickname of the target party member
     * @param payload - The status payload object
     * @returns Result object
     */
    abstract PushPartyMemberStatus(
        dbLink: string,
        partyName: string,
        targetMember: string,
        payload: any
    ): AdapterResult;

    /**
     * Cleans raw lines by removing empty ones.
     */
    CleanRawLines(rawLines: string[]): string[] {
        return rawLines.filter(line => line.trim() !== '');
    }
}
