import { ICharacter } from '@server/character/icharacter';
import { Weapon } from './weapons';

/**
 * TWF penalty data for a specific (main-hand, off-hand) weapon combination.
 */
export interface TwfCombination {
  mainWeaponIndex: number;
  offWeaponIndex: number;
  mainAttackBonus: number;
  offAttackBonus: number;
  mainPenalty: number;
  offPenalty: number;
  offDamageBonus: number;
  // Display strings
  mainAtkValue: string;
  offAtkValue: string;
  offDmgValue: string;
  // Tooltip strings
  mainAttackString: string;
  offAttackString: string;
  offDamageString: string;
}

/**
 * TWF data for a character. Null if the character doesn't have TWF feat.
 */
export interface TwfData {
  hasTWF: boolean;
  hasImprovedTWF: boolean;
  hasGreaterTWF: boolean;
  combinations: TwfCombination[];
}

/**
 * D&D 3.5 TWF penalty table.
 *
 * | Situation                          | Main Hand | Off-Hand |
 * |------------------------------------|-----------|----------|
 * | No TWF feat, one-handed off-hand   |    -6     |   -10    |
 * | No TWF feat, light off-hand        |    -4     |    -8    |
 * | TWF feat, one-handed off-hand      |    -4     |    -4    |
 * | TWF feat, light off-hand           |    -2     |    -2    |
 */
function getTwfPenalties(hasTWF: boolean, offHandIsLight: boolean): { mainPenalty: number; offPenalty: number } {
  if (hasTWF) {
    return offHandIsLight
      ? { mainPenalty: -2, offPenalty: -2 }
      : { mainPenalty: -4, offPenalty: -4 };
  } else {
    return offHandIsLight
      ? { mainPenalty: -4, offPenalty: -8 }
      : { mainPenalty: -6, offPenalty: -10 };
  }
}

/**
 * Determines if a weapon is eligible for off-hand TWF use (melee only).
 */
function isEligibleForTwf(weapon: Weapon): boolean {
  return weapon.rangeType === 'Melee';
}

/**
 * Off-hand damage gets half Str modifier (rounded down), plus all other bonuses
 * (enhancement, weapon-specific, feat damage).
 */
function calculateOffHandDamageBonus(weapon: Weapon, strModifier: number): number {
  const halfStr = Math.floor(strModifier / 2);
  const otherBonuses =
    weapon.damageBonus.globalDmgBonus.currentScore +
    weapon.damageBonus.weaponSpecificBonus +
    weapon.damageBonus.featBonus.currentScore;
  return halfStr + otherBonuses;
}

/**
 * Calculates TWF data for a character. Returns null if the character doesn't
 * have the TWF feat or doesn't have enough melee weapons.
 */
export function calculateTwf(character: ICharacter, weapons: Weapon[]): TwfData | null {
  const hasTWF = character.HasFeat('Two-Weapon Fighting');

  // Even without the TWF feat, a character can fight with two weapons
  // (just with bigger penalties). However, we only show the off-hand dropdown
  // when the character has the TWF feat for now.
  if (!hasTWF) {
    return null;
  }

  const hasImprovedTWF = character.HasFeat('Improved Two-Weapon Fighting');
  const hasGreaterTWF = character.HasFeat('Greater Two-Weapon Fighting');

  // Find melee weapons eligible for TWF
  const meleeWeapons = weapons
    .map((w, i) => ({ weapon: w, index: i }))
    .filter(entry => isEligibleForTwf(entry.weapon));

  if (meleeWeapons.length < 2) {
    return {
      hasTWF,
      hasImprovedTWF,
      hasGreaterTWF,
      combinations: []
    };
  }

  const strModifier = character.abilities.Str ? character.abilities.Str.modifier : 0;
  const combinations: TwfCombination[] = [];

  // Generate all ordered (main, off) pairs
  for (const main of meleeWeapons) {
    for (const off of meleeWeapons) {
      if (main.index === off.index) continue;

      const offHandIsLight = off.weapon.encumbrance === 'Light';
      const { mainPenalty, offPenalty } = getTwfPenalties(hasTWF, offHandIsLight);

      const mainAttackBonus = main.weapon.attackBonus.bonus + mainPenalty;
      const offAttackBonus = off.weapon.attackBonus.bonus + offPenalty;
      const offDamageBonus = calculateOffHandDamageBonus(off.weapon, strModifier);

      // Format display values
      const mainAtkValue = `${mainAttackBonus}`;
      const offAtkValue = `${offAttackBonus}`;

      const offDice = (off.weapon.damage || '1d3').split(' ')[0];
      const offDmgSign = offDamageBonus >= 0 ? '+' : '-';
      const offDmgAbs = Math.abs(offDamageBonus);
      const offDmgValue = `${offDice} ${offDmgSign} ${offDmgAbs}`;

      // Format tooltip strings
      const mainAttackString =
        `${mainAttackBonus}: ${main.weapon.attackBonus.bonus} base ${mainPenalty} TWF penalty` +
        (offHandIsLight ? ' (light off-hand)' : ' (one-handed off-hand)');
      const offAttackString =
        `${offAttackBonus}: ${off.weapon.attackBonus.bonus} base ${offPenalty} TWF penalty` +
        (offHandIsLight ? ' (light off-hand)' : ' (one-handed off-hand)');
      const halfStr = Math.floor(strModifier / 2);
      const offDamageString =
        `${offDamageBonus}: ${halfStr} Str (half of ${strModifier})` +
        (off.weapon.damageBonus.weaponSpecificBonus !== 0
          ? `, +${off.weapon.damageBonus.weaponSpecificBonus} weapon`
          : '') +
        (off.weapon.damageBonus.featBonus.currentScore !== 0
          ? `, +${off.weapon.damageBonus.featBonus.currentScore} feat`
          : '') +
        (off.weapon.damageBonus.globalDmgBonus.currentScore !== 0
          ? `, +${off.weapon.damageBonus.globalDmgBonus.currentScore} global`
          : '');

      combinations.push({
        mainWeaponIndex: main.index,
        offWeaponIndex: off.index,
        mainAttackBonus,
        offAttackBonus,
        mainPenalty,
        offPenalty,
        offDamageBonus,
        mainAtkValue,
        offAtkValue,
        offDmgValue,
        mainAttackString,
        offAttackString,
        offDamageString
      });
    }
  }

  return {
    hasTWF,
    hasImprovedTWF,
    hasGreaterTWF,
    combinations
  };
}
