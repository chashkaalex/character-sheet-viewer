import { GetEffects } from '../_general_effects';
import { FlawsEffects } from '../flaws';

/**
 * Parses flaws from the character document and applies their effects.
 * @param character The character object to populate and modify.
 */
export function ParseFlaws(character: any): void {
    const flawsSectionLines = character.sectionLines['Flaws, Traits, Quirks'];
    if (flawsSectionLines) {
        character.flaws = [];
        flawsSectionLines.forEach((flawLine: string) => {
            const trimmedLine = flawLine.trim();
            const theFlaw = Object.keys(FlawsEffects).find(flaw => trimmedLine.startsWith(flaw));
            if (theFlaw) {
                const flawEffects = GetEffects(FlawsEffects, theFlaw);
                if (flawEffects) {
                    character.flaws.push(flawEffects);
                }
            } else if (trimmedLine !== '') {
                character.parseWarnings.push(`Flaw ${trimmedLine} not found`);
            }
        });

        if (character.flaws) {
            character.flaws.forEach((flaw: any[]) => {
                flaw.forEach(effect => {
                    character.ApplyEffect(effect);
                });
            });
        }
    }
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = {
        ParseFlaws
    };
}
