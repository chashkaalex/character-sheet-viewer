import { GetEffects } from '../../_general_effects';
import { FeatEffects } from './feats_effects';
import { EffectData, EffectFactory } from '../../state/effects';
import { ICharacter } from '../../icharacter';

/**
 * Extracts the feat name and any colon-delimited args from a feat line.
 * e.g. "Practiced Spellcaster: Cleric," → { name: 'Practiced Spellcaster', params: ['Cleric'] }
 */
function ParseFeatLine(line: string): { name: string; params: string[] } {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
        // Strip trailing comma first
        const cleanLine = line.trim().replace(/,$/, '');
        // Check for parentheses to parse options
        const firstParen = cleanLine.indexOf('(');
        const lastParen = cleanLine.lastIndexOf(')');
        if (firstParen !== -1 && lastParen !== -1 && lastParen > firstParen) {
            const name = cleanLine.substring(0, firstParen).trim();
            const param = cleanLine.substring(firstParen + 1, lastParen).trim();
            return { name, params: [param] };
        }
        return { name: cleanLine, params: [] };
    }
    const name = line.substring(0, colonIndex).trim();
    const params = line.substring(colonIndex + 1)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    return { name, params };
}

/**
 * Parses feats from the character document and applies their effects.
 * @param character The character object to populate and modify.
 */
export function ParseFeats(character: ICharacter): void {
    const featsSectionLines = character.sectionLines['Feats'];
    if (featsSectionLines) {
        character.feats = [];
        featsSectionLines.forEach((featLine: string) => {
            const trimmedLine = featLine.trim();
            const { name: parsedName, params } = ParseFeatLine(trimmedLine);
            const theFeat = Object.keys(FeatEffects).find(feat => parsedName === feat);

            if (theFeat) {
                const featEffects = GetEffects(FeatEffects, theFeat);
                if (featEffects) {
                    if (params.length > 0) {
                        featEffects.forEach(f => {
                            f.status = `${theFeat} (${params.join(', ')})`;
                            if ('callback' in f && typeof f.callback === 'function') {
                                f.args = { params };
                            }
                        });
                    }
                    character.feats.push(featEffects);
                }
            } else {
                // Fall back to startsWith for feat lines that have extra text but no colon
                const startsFeat = Object.keys(FeatEffects).find(feat => trimmedLine.startsWith(feat));
                if (startsFeat) {
                    const featEffects = GetEffects(FeatEffects, startsFeat);
                    if (featEffects) {
                        character.feats.push(featEffects);
                    }
                } else if (trimmedLine !== '') {
                    character.parseWarnings.push(`Feat ${trimmedLine} not found`);
                }
            }
        });

        if (character.feats) {
            character.feats.forEach((feat: EffectData[]) => {
                feat.forEach(effect => {
                    EffectFactory(effect).ApplyEffect(character);
                });
            });
        }
    } else {
        character.parseWarnings.push('Character has no feats');
    }
}
