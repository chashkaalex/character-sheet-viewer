import { SpellcasterClasses } from '../_constants';
import { AbilityNames } from '../properties/abilities/ability_types';
import {
  CharacterParsedSpellSlots,
  ParseDocResult,
  PreparedSpellEntry,
  SpellValidatorFn
} from '../common_types';
import { GetFirstNumberFromALine } from '../parser_utils';

export const SECTION_NAMES = [
  'Statuses',
  'Feats',
  'Special Abilities',
  'Racial Traits',
  'Bonus Abilities',
  'Flaws, Traits, Quirks',
  'Languages',
  'Prepared Spells',
  'Spells Known',
  'Spells',
  'Skills Synergy',
  'Skills',
  'Skill Tricks',
  'Songs per day',
  'Battle Gear',
  'Possessions',
  'Personal Information',
  'Parties Membership',
  'Domains'
];

export const MUST_HAVE_SECTION_NAMES = [
  'Statuses',
  'Feats',
  'Special Abilities',
  'Racial Traits',
  'Bonus Abilities',
  'Skills',
  'Personal Information'
];

/**
 * Checks if a line is a section line
 * @param line - The line to check
 * @returns True if it's a section line
 */
export function IsSectionLine(line: string): boolean {
  const trimmed = line.trim();
  return SECTION_NAMES.some(name => {
    return trimmed.startsWith(name) || (trimmed.match(/^\d+:\s*/) && trimmed.includes(name + ':'));
  });
}

/**
 * Parses the prepared spells structure from list items
 * @param items - The items to parse
 * @param domains - The domains of the character
 * @param validatorFn - The validator function
 * @param defaultClassName - The default caster class name
 * @returns The parsed prepared spells structure
 */
export function ParsePreparedSpellsStructure(
  items: PreparedSpellEntry[],
  domains: string[],
  validatorFn: SpellValidatorFn,
  defaultClassName: string = ''
): CharacterParsedSpellSlots {
  const preparedSpells: CharacterParsedSpellSlots = {};
  if (defaultClassName) {
    preparedSpells[defaultClassName] = {};
  }
  let currentSpellLevel = 0;
  let currentCasterClassName = defaultClassName;
  let currentSpellLevelName = '';

  items.forEach(entry => {
    const text = entry.text.trim().replace(/’/g, '\'');
    const isStrikeThrough = entry.isStrikeThrough || false;

    if ((SpellcasterClasses as readonly string[]).includes(text)) {  //new caster class
      currentCasterClassName = text;
      if (!preparedSpells[currentCasterClassName]) {
        preparedSpells[currentCasterClassName] = {};
      }
    } else if (text.toLowerCase().startsWith('level')) {  //new spell level
      const num = GetFirstNumberFromALine(text);
      currentSpellLevel = num !== null ? num : 0;
      currentSpellLevelName = String(currentSpellLevel); // Ensure string key
      if (currentCasterClassName === 'Cleric' && text.toLowerCase().includes('domain')) {
        currentSpellLevelName += ' - domain';
      }
      if (currentCasterClassName) {
        if (!preparedSpells[currentCasterClassName]) {
          preparedSpells[currentCasterClassName] = {};
        }
        preparedSpells[currentCasterClassName][currentSpellLevelName] = [];
      }
    } else {  //new spell
      // Only add if we are inside a valid block
      if (currentCasterClassName && preparedSpells[currentCasterClassName] && preparedSpells[currentCasterClassName][currentSpellLevelName]) {
        const isValid = validatorFn ? validatorFn(currentCasterClassName, currentSpellLevel, currentSpellLevelName, text, domains) : true;
        const listItem = entry.listItem;
        preparedSpells[currentCasterClassName][currentSpellLevelName].push({
          spellName: text,
          isUsed: isStrikeThrough,
          isEmpty: text === '',
          isValid: isValid,
          listItem: listItem
        });
      }
    }
  });
  return preparedSpells;
}

/**
 * Parses the raw lines of a character document into structured sections and checks for required fields.
 * @param lines - The raw text lines from the document
 * @returns The parsed structure and validation results
 */
export function ParseDocLines(lines: string[]): ParseDocResult {
  const sectionLines: Record<string, string[]> = {};
  let attackLine: string | null = null;
  let resistanceLine: string | null = null;
  let hpLine: string | null = null;
  const abilitiesLines: Record<string, string> = {};
  const errors: string[] = [];

  let currentSection: string | null = null;

  // Single-pass iteration
  for (const line of lines) {
    // Check for section start
    if (IsSectionLine(line)) {
      currentSection = SECTION_NAMES.find(name => {
        const trimmed = line.trim();
        return trimmed.startsWith(name) || (trimmed.match(/^\d+:\s*/) && trimmed.includes(name + ':'));
      }) || null;

      if (currentSection) {
        sectionLines[currentSection] = [];
        // If the header line contains more than just the section name (e.g. "Domains (Air, Earth)"), include it
        const trimmedLine = line.trim();
        const dataInHeader = trimmedLine.replace(currentSection, '').replace(/[:\s]/g, '');
        if (dataInHeader.length > 0) {
          sectionLines[currentSection].push(line);
        }
      }
      continue; // Header line handled, move to next
    }

    // If we are in a section, add line to it
    if (currentSection) {
      sectionLines[currentSection].push(line);
    } else {
      // We are in the Header (pre-section) area
      // Check for Attack
      if (line.startsWith('Attack')) {
        attackLine = line;
      }
      // Check for Resistance
      else if (line.includes('Resistance')) {
        resistanceLine = line;
      }
      // Check for HP and Speed
      else if (line.includes('Hp') && line.includes('Speed')) {
        hpLine = line;
      }
      else {
        // Check for Abilities
        const abilityName = AbilityNames.find(name => line.startsWith(name));
        if (abilityName) {
          abilitiesLines[abilityName] = line;
        }
      }
    }
  }

  // Validation
  let validationFailed = false;

  if (!attackLine) {
    errors.push('Critical: \'Attack\' line not found.');
    validationFailed = true;
  }

  if (!hpLine) {
    errors.push('Critical: \'Hp\' line not found.');
    validationFailed = true;
  }

  // Check required abilities
  AbilityNames.forEach(name => {
    if (!abilitiesLines[name]) {
      errors.push(`Critical: Ability '${name}' not found.`);
      validationFailed = true;
    }
  });

  // Check required sections
  MUST_HAVE_SECTION_NAMES.forEach(sectionName => {
    if (!sectionLines[sectionName]) {
      errors.push(`Critical: Section '${sectionName}' not found.`);
      validationFailed = true;
    }
  });

  return {
    sectionLines: sectionLines,
    attackLine: attackLine,
    resistanceLine: resistanceLine,
    hpLine: hpLine,
    abilitiesLines: abilitiesLines,
    success: !validationFailed,
    errors: errors
  };
}
