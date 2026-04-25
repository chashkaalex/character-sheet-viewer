import { GetEffects } from '../_general_effects';
import { FeatEffects } from '../feats';

/**
 * Parses feats from the character document and applies their effects.
 * @param character The character object to populate and modify.
 */
export function ParseFeats(character: any): void {
    const featsSectionLines = character.sectionLines['Feats'];
    if (featsSectionLines) {
        character.feats = [];
        featsSectionLines.forEach((featLine: string) => {
            const trimmedLine = featLine.trim();
            const theFeat = Object.keys(FeatEffects).find(feat => trimmedLine.startsWith(feat));

            if (theFeat) {
                const featEffects = GetEffects(FeatEffects, theFeat);
                if (featEffects) {
                    if (theFeat === 'Practiced Spellcaster') {
                        const casterClass = character.classes.find((classObj: any) => trimmedLine.includes(classObj.name));
                        if (casterClass) {
                            const casterClassName = casterClass.name;
                            featEffects.forEach(f => { f.casterClassName = casterClassName; });
                        }
                    }
                    character.feats.push(featEffects);
                }
            } else if (trimmedLine !== '') {
                character.parseWarnings.push(`Feat ${trimmedLine} not found`);
            }
        });

        if (character.feats) {
            character.feats.forEach((feat: any[]) => {
                feat.forEach(effect => {
                    character.ApplyEffect(effect);
                });
            });
        }
    } else {
        character.parseWarnings.push('Character has no feats');
    }
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = {
        ParseFeats
    };
}
