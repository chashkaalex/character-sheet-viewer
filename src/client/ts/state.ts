/**
 * Central state management for the client-side application.
 */

/** @type {any} */
export let characterRep = null;

/**
 * Updates the global character representation.
 * @param {any} newRep - The new character representation data.
 */
export function setCharacterRep(newRep) {
    characterRep = newRep;
}
