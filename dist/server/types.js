/**
 * @typedef {Object} PreparedSpellDocData
 * @property {GoogleAppsScript.Document.ListItem} item - The list item data
 * @property {string} spell - The spell name
 * @property {boolean} used - Whether the spell is used
 * @property {boolean} isValid - Whether the spell is valid
 */

/**
 * @typedef {Object.<string, Object.<number, PreparedSpellDocData[]>>} PreparedSpellsStructure
 */
/**
 * @typedef {Object} SlotData
 * @property {string} casterClassName
 * @property {number|string} spellLevel
 * @property {string} [spellName]
 */

if (typeof module !== 'undefined') {
  module.exports = {};
}
