import { ICharacter } from '@server/character/icharacter';
import { Weapon } from './weapons';
import { ClassesData } from '../../../classes_data/_classes_general_data';

export interface FullAttackEntry {
  atkValue: string;
  dmgValue: string;
  tooltip: string;
  rolzAtkRollMessage?: string;
  rolzDmgRollMessage?: string;
}

export interface FullAttackSequence {
  attacks: FullAttackEntry[];
  summaryString: string;
}

export interface WeaponFullAttackData {
  normal: FullAttackSequence;
  twfMain: Record<number, FullAttackSequence>; // keyed by offWeaponIndex
  twfOff: Record<number, FullAttackSequence>;  // keyed by mainWeaponIndex
}

/**
 * Calculates the base BAB summing only the contributions from classes.
 */
export function getBaseBab(character: ICharacter): number {
  let baseBab = 0;
  if (!character.classes) return 0;
  for (const charClass of character.classes) {
    const classData = ClassesData.get(charClass.name);
    if (classData && classData.levelTable[charClass.level]) {
      baseBab += classData.levelTable[charClass.level].bab || 0;
    }
  }
  return baseBab;
}

/**
 * Calculates the number of iterative attacks based on D&D 3.5 rules.
 */
function getNumIterativeAttacks(bab: number): number {
  if (bab <= 0) return 1;
  return Math.min(4, Math.max(1, Math.floor((bab - 1) / 5) + 1));
}

/**
 * Formats the attack bonus to include a "+" if positive.
 */
function formatAtkBonus(bonus: number): string {
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
}

/**
 * Formats the damage bonus display.
 */
function formatDmgValue(dice: string, bonus: number): string {
  if (bonus === 0) return dice;
  const sign = bonus > 0 ? '+' : '-';
  return `${dice} ${sign} ${Math.abs(bonus)}`;
}

/**
 * Calculates the normal full attack sequence (no TWF).
 */
export function calculateNormalFullAttack(weapon: Weapon, character: ICharacter): FullAttackSequence {
  const baseBab = getBaseBab(character);
  const isRanged = weapon.rangeType === 'Ranged';
  const hasHaste = character.HasStatus('Haste');
  const hasRapidShot = character.HasFeat('Rapid Shot') && isRanged;

  // Monk Flurry of Blows check
  const monkLevel = character.GetClassLevel('Monk');
  const isMonkWeapon = weapon.isMonkWeapon();
  const flurrying = monkLevel > 0 && isMonkWeapon;

  let flurryPenalty = 0;
  let flurryExtraAttacks = 0;

  if (flurrying) {
    // Flurry penalty
    if (monkLevel >= 1 && monkLevel <= 4) flurryPenalty = -2;
    else if (monkLevel >= 5 && monkLevel <= 8) flurryPenalty = -1;
    else flurryPenalty = 0;

    // Flurry extra attacks
    flurryExtraAttacks = monkLevel >= 11 ? 2 : 1;
  }

  // Iterative attacks from BAB
  const numIteratives = getNumIterativeAttacks(baseBab);
  const attacks: FullAttackEntry[] = [];

  const weaponBaseAtk = weapon.attackBonus.bonus;
  const weaponDmgBonus = weapon.damageBonus.bonus;
  const dice = (weapon.damage || '1d3').split(' ')[0];
  const dmgRoll = `#${formatDmgValue(dice, weaponDmgBonus).replace(/\s+/g, '').replace(/[+-]0$/, '')} #${weapon.name} Damage`;

  // 1. Primary attack and extra attacks (Flurry, Rapid Shot, Haste)
  // All extra attacks are made at the highest attack bonus.
  const highestBonus = weaponBaseAtk + (flurrying ? flurryPenalty : (hasRapidShot ? -2 : 0));

  // We add the primary attack
  attacks.push({
    atkValue: formatAtkBonus(highestBonus),
    dmgValue: formatDmgValue(dice, weaponDmgBonus),
    tooltip: `${highestBonus}: ${weaponBaseAtk} normal` +
      (flurrying && flurryPenalty !== 0 ? ` - ${Math.abs(flurryPenalty)} flurry penalty` : '') +
      (!flurrying && hasRapidShot ? ' - 2 Rapid Shot penalty' : ''),
    rolzAtkRollMessage: `#d20${highestBonus >= 0 ? '+' : ''}${highestBonus} #${weapon.name} Attack`,
    rolzDmgRollMessage: dmgRoll
  });

  // Add extra flurry attacks
  for (let i = 0; i < flurryExtraAttacks; i++) {
    attacks.push({
      atkValue: formatAtkBonus(highestBonus),
      dmgValue: formatDmgValue(dice, weaponDmgBonus),
      tooltip: `${highestBonus}: Flurry extra attack`,
      rolzAtkRollMessage: `#d20${highestBonus >= 0 ? '+' : ''}${highestBonus} #${weapon.name} Flurry Attack`,
      rolzDmgRollMessage: dmgRoll
    });
  }

  // Add Rapid Shot extra attack
  if (hasRapidShot) {
    attacks.push({
      atkValue: formatAtkBonus(highestBonus),
      dmgValue: formatDmgValue(dice, weaponDmgBonus),
      tooltip: `${highestBonus}: Rapid Shot extra attack`,
      rolzAtkRollMessage: `#d20${highestBonus >= 0 ? '+' : ''}${highestBonus} #${weapon.name} Rapid Shot Attack`,
      rolzDmgRollMessage: dmgRoll
    });
  }

  // Add Haste extra attack (made at highest bonus)
  if (hasHaste) {
    attacks.push({
      atkValue: formatAtkBonus(highestBonus),
      dmgValue: formatDmgValue(dice, weaponDmgBonus),
      tooltip: `${highestBonus}: Haste extra attack`,
      rolzAtkRollMessage: `#d20${highestBonus >= 0 ? '+' : ''}${highestBonus} #${weapon.name} Haste Attack`,
      rolzDmgRollMessage: dmgRoll
    });
  }

  // 2. Iterative attacks (2nd, 3rd, 4th at -5, -10, -15 penalties)
  for (let i = 1; i < numIteratives; i++) {
    const penalty = -5 * i;
    const bonus = highestBonus + penalty;
    attacks.push({
      atkValue: formatAtkBonus(bonus),
      dmgValue: formatDmgValue(dice, weaponDmgBonus),
      tooltip: `${bonus}: Iterative attack (${i + 1}st) with ${penalty} penalty`,
      rolzAtkRollMessage: `#d20${bonus >= 0 ? '+' : ''}${bonus} #${weapon.name} Attack (${i + 1}st)`,
      rolzDmgRollMessage: dmgRoll
    });
  }

  const summaryString = attacks.map(a => a.atkValue).join('/');

  return {
    attacks,
    summaryString
  };
}

/**
 * Calculates the TWF full attack sequences.
 */
export function calculateTwfFullAttack(
  character: ICharacter,
  weapons: Weapon[],
  twfData: any
): { twfMain: Record<number, Record<number, FullAttackSequence>>; twfOff: Record<number, Record<number, FullAttackSequence>> } {
  const twfMain: Record<number, Record<number, FullAttackSequence>> = {};
  const twfOff: Record<number, Record<number, FullAttackSequence>> = {};

  if (!twfData || !twfData.combinations) {
    return { twfMain, twfOff };
  }

  const baseBab = getBaseBab(character);
  const numIteratives = getNumIterativeAttacks(baseBab);
  const hasHaste = character.HasStatus('Haste');

  twfData.combinations.forEach((combo: any) => {
    const mainWeapon = weapons[combo.mainWeaponIndex];
    const offWeapon = weapons[combo.offWeaponIndex];

    // Compute main-hand sequence
    const mainAttacks: FullAttackEntry[] = [];
    const mainBaseAtk = mainWeapon.attackBonus.bonus;
    const mainDmgBonus = mainWeapon.damageBonus.bonus;
    const mainDice = (mainWeapon.damage || '1d3').split(' ')[0];
    const mainHighestBonus = mainBaseAtk + combo.mainPenalty;
    const mainDmgRoll = `#${formatDmgValue(mainDice, mainDmgBonus).replace(/\s+/g, '').replace(/[+-]0$/, '')} #${mainWeapon.name} Damage`;

    // MH 1st attack
    mainAttacks.push({
      atkValue: formatAtkBonus(mainHighestBonus),
      dmgValue: formatDmgValue(mainDice, mainDmgBonus),
      tooltip: `${mainHighestBonus}: ${mainBaseAtk} normal + ${combo.mainPenalty} TWF penalty`,
      rolzAtkRollMessage: `#d20${mainHighestBonus >= 0 ? '+' : ''}${mainHighestBonus} #${mainWeapon.name} Attack (MH)`,
      rolzDmgRollMessage: mainDmgRoll
    });

    // Haste extra attack (if any)
    if (hasHaste) {
      mainAttacks.push({
        atkValue: formatAtkBonus(mainHighestBonus),
        dmgValue: formatDmgValue(mainDice, mainDmgBonus),
        tooltip: `${mainHighestBonus}: Haste extra attack (main hand)`,
        rolzAtkRollMessage: `#d20${mainHighestBonus >= 0 ? '+' : ''}${mainHighestBonus} #${mainWeapon.name} Haste Attack (MH)`,
        rolzDmgRollMessage: mainDmgRoll
      });
    }

    // MH Iterative attacks
    for (let i = 1; i < numIteratives; i++) {
      const penalty = -5 * i;
      const bonus = mainHighestBonus + penalty;
      mainAttacks.push({
        atkValue: formatAtkBonus(bonus),
        dmgValue: formatDmgValue(mainDice, mainDmgBonus),
        tooltip: `${bonus}: MH Iterative (${i + 1}st) with ${penalty} penalty`,
        rolzAtkRollMessage: `#d20${bonus >= 0 ? '+' : ''}${bonus} #${mainWeapon.name} Attack (MH ${i + 1}st)`,
        rolzDmgRollMessage: mainDmgRoll
      });
    }

    if (!twfMain[combo.mainWeaponIndex]) {
      twfMain[combo.mainWeaponIndex] = {};
    }
    twfMain[combo.mainWeaponIndex][combo.offWeaponIndex] = {
      attacks: mainAttacks,
      summaryString: mainAttacks.map(a => a.atkValue).join('/')
    };

    // Compute off-hand sequence
    const offAttacks: FullAttackEntry[] = [];
    const offBaseAtk = offWeapon.attackBonus.bonus;
    const offDice = (offWeapon.damage || '1d3').split(' ')[0];
    const offHighestBonus = offBaseAtk + combo.offPenalty;
    const offDmgRoll = `#${formatDmgValue(offDice, combo.offDamageBonus).replace(/\s+/g, '').replace(/[+-]0$/, '')} #${offWeapon.name} Damage (OH)`;

    // OH 1st attack
    offAttacks.push({
      atkValue: formatAtkBonus(offHighestBonus),
      dmgValue: formatDmgValue(offDice, combo.offDamageBonus),
      tooltip: `${offHighestBonus}: ${offBaseAtk} normal + ${combo.offPenalty} TWF penalty`,
      rolzAtkRollMessage: `#d20${offHighestBonus >= 0 ? '+' : ''}${offHighestBonus} #${offWeapon.name} Attack (OH)`,
      rolzDmgRollMessage: offDmgRoll
    });

    // OH 2nd attack (Improved TWF)
    if (twfData.hasImprovedTWF) {
      const bonus = offHighestBonus - 5;
      offAttacks.push({
        atkValue: formatAtkBonus(bonus),
        dmgValue: formatDmgValue(offDice, combo.offDamageBonus),
        tooltip: `${bonus}: OH second attack (Improved TWF)`,
        rolzAtkRollMessage: `#d20${bonus >= 0 ? '+' : ''}${bonus} #${offWeapon.name} Attack (OH 2nd)`,
        rolzDmgRollMessage: offDmgRoll
      });
    }

    // OH 3rd attack (Greater TWF)
    if (twfData.hasGreaterTWF) {
      const bonus = offHighestBonus - 10;
      offAttacks.push({
        atkValue: formatAtkBonus(bonus),
        dmgValue: formatDmgValue(offDice, combo.offDamageBonus),
        tooltip: `${bonus}: OH third attack (Greater TWF)`,
        rolzAtkRollMessage: `#d20${bonus >= 0 ? '+' : ''}${bonus} #${offWeapon.name} Attack (OH 3rd)`,
        rolzDmgRollMessage: offDmgRoll
      });
    }

    if (!twfOff[combo.offWeaponIndex]) {
      twfOff[combo.offWeaponIndex] = {};
    }
    twfOff[combo.offWeaponIndex][combo.mainWeaponIndex] = {
      attacks: offAttacks,
      summaryString: offAttacks.map(a => a.atkValue).join('/')
    };
  });

  return { twfMain, twfOff };
}
