import { GetEffects } from '../../general_effects';
import { ICharacter } from '../../icharacter';
import { EffectData, EffectFactory } from '../../state/effects';
import {
  BonusAbilitiesEffects,
  extractSpecialAbilityBaseName,
  isClassDerivedSpecialAbility,
  SpecialAbilitiesEffects
} from './special_abilities_effects';

/**
 * Parses 'Special Abilities' and 'Bonus Abilities' sections from the character document.
 * Distinguishes class-derived summary lines (e.g. "AC Bonus (+3)," on a Monk/Sacred Fist)
 * from non-class / variant / campaign special abilities (e.g. "Illusion Spell Power").
 */
export function ParseSpecialAbilities(character: ICharacter): void {
  const specialLines = character.sectionLines['Special Abilities'];
  if (specialLines && specialLines.length > 0) {
    specialLines.forEach((rawLine: string) => {
      const trimmedLine = rawLine.trim();
      if (!trimmedLine) return;

      const baseName = extractSpecialAbilityBaseName(trimmedLine);
      if (!baseName) return;

      // 1. Check if this line is an explicit SpecialAbilitiesEffects entry that overrides/customizes a feature
      //    (e.g. "Illusion Spell Power (+1 CL to Illusion, -1 CL to other schools)")
      const exactEffectKey = Object.keys(SpecialAbilitiesEffects).find(
        key => key.toLowerCase() === baseName.toLowerCase() || trimmedLine.toLowerCase().startsWith(key.toLowerCase())
      );

      // 2. If it is a standard class-derived ability (and not an explicit SpecialAbilitiesEffects override), skip it
      if (isClassDerivedSpecialAbility(character, baseName) && !exactEffectKey) {
        return;
      }

      if (exactEffectKey) {
        const effects = GetEffects(SpecialAbilitiesEffects, exactEffectKey);
        if (effects) {
          effects.forEach((eff: EffectData) => {
            if ('callback' in eff && typeof eff.callback === 'function') {
              eff.args = { ...(eff.args || {}), rawLine: trimmedLine, baseName };
            }
            EffectFactory(eff).ApplyEffect(character);
          });
        }
      } else if (!isClassDerivedSpecialAbility(character, baseName)) {
        character.parseWarnings.push(`Special Ability ${trimmedLine} not found`);
      }
    });
  }

  ParseBonusAbilities(character);
}

/**
 * Parses 'Bonus Abilities' section from the character document.
 */
export function ParseBonusAbilities(character: ICharacter): void {
  const bonusLines = character.sectionLines['Bonus Abilities'];
  if (!bonusLines || bonusLines.length === 0) return;

  bonusLines.forEach((rawLine: string) => {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) return;

    const baseName = extractSpecialAbilityBaseName(trimmedLine);
    const matchedKey = Object.keys(BonusAbilitiesEffects).find(
      key => key.toLowerCase() === baseName.toLowerCase() || trimmedLine.toLowerCase().startsWith(key.toLowerCase())
    );

    if (matchedKey) {
      const effects = GetEffects(BonusAbilitiesEffects, matchedKey);
      if (effects) {
        effects.forEach((eff: EffectData) => {
          if ('callback' in eff && typeof eff.callback === 'function') {
            eff.args = { ...(eff.args || {}), rawLine: trimmedLine, baseName };
          }
          EffectFactory(eff).ApplyEffect(character);
        });
      }
    } else {
      character.parseWarnings.push(`Bonus Ability ${trimmedLine} not found`);
    }
  });
}
