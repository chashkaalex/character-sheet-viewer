/**
 * Utilities for parsing HP information from character document lines.
 */

/**
 * Parses current and max HP from an HP line.
 * Supports signed current HP (e.g. "Hp: -3/40" or "Hp: 45/60").
 * @param hpLine - The line containing 'Hp' and 'Speed' information.
 * @returns An object with current and max HP values.
 */
export function ParseHp(hpLine: string): { current: number; max: number } {
  const hpPartOfTheLine = hpLine.substring(hpLine.indexOf('Hp'), hpLine.indexOf('Speed'));
  const hpDigits = hpPartOfTheLine.match(/-?\d+/g);

  if (hpDigits && hpDigits.length >= 2) {
    return {
      current: Number(hpDigits[0]),
      max: Math.abs(Number(hpDigits[1]))
    };
  }

  return { current: 0, max: 0 };
}
