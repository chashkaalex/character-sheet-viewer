import type { CharacterRep } from '../../server/character/character_rep';

/**
 * Central state management for the client-side application.
 */

export let characterRep: CharacterRep | null = null;

/**
 * Updates the global character representation.
 * @param newRep - The new character representation data.
 */
export function setCharacterRep(newRep: CharacterRep | null): void {
    characterRep = newRep;
}
