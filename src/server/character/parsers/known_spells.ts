import { ParsePreparedSpellsStructure } from './doc_parser';
import { ICharacter } from '../icharacter';
import { ExtractAndValidateSpell } from '../spells';
import { KnownSpellEntry } from '../common_types';

/**
 * Parses the known spells structure for a spontaneous caster class from list items.
 * @param character - The character to parse
 * @param className - The caster class name (e.g. 'Bard')
 * @param domains - The domains to pass to validator
 * @returns A record of spell levels to KnownSpellEntry objects
 */
export function ParseKnownSpellsSpontaneous(
  character: Readonly<ICharacter>,
  className: string,
  domains: string[] = []
): Record<string, KnownSpellEntry[]> {
  const sectionName = 'Spells Known';
  const knownSpellsLines = character.sectionLines[sectionName];

  if (!knownSpellsLines || knownSpellsLines.length === 0) {
    return {};
  }

  const knownSpellsItems = knownSpellsLines.map(line => ({ text: line, item: null }));
  const parsedStructure = ParsePreparedSpellsStructure(
    knownSpellsItems,
    domains,
    () => true,
    className
  );

  const flatSpells: Record<string, KnownSpellEntry[]> = {};
  const classSpells = parsedStructure[className];
  if (classSpells) {
    Object.keys(classSpells).forEach(level => {
      const levelNum = parseInt(level) || 0;
      flatSpells[level] = classSpells[level].map(s => {
        const { extractedName, isValid } = ExtractAndValidateSpell(
          className,
          levelNum,
          level,
          s.spellName,
          domains
        );
        return {
          spellName: extractedName,
          isValid: isValid
        };
      });
    });
  }
  return flatSpells;
}
