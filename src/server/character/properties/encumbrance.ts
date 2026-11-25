import { ICharacter } from '../icharacter';
import { StaticPropertyEffect } from '../state/effects';

export type LoadCategory = 'Light' | 'Medium' | 'Heavy' | 'Overloaded';

export interface CarryingCapacityThresholds {
  lightLoadMax: number;
  mediumLoadMax: number;
  heavyLoadMax: number;
}

export interface EncumbranceState extends CarryingCapacityThresholds {
  totalWeight: number;
  loadCategory: LoadCategory;
  maxDexCap: number | null;
  acpPenalty: number;
  reducesSpeed: boolean;
}

/**
 * PHB Table 9-1 (p. 162): Carrying Capacity for Medium Biped Creatures (Str 1..29).
 * Each entry is [lightLoadMax, mediumLoadMax, heavyLoadMax].
 */
const PHB_CARRYING_CAPACITY_TABLE: Record<number, [number, number, number]> = {
  1: [3, 6, 10],
  2: [6, 13, 20],
  3: [10, 20, 30],
  4: [13, 26, 40],
  5: [16, 33, 50],
  6: [20, 40, 60],
  7: [23, 46, 70],
  8: [26, 53, 80],
  9: [30, 60, 90],
  10: [33, 66, 100],
  11: [38, 76, 115],
  12: [43, 86, 130],
  13: [50, 100, 150],
  14: [58, 116, 175],
  15: [66, 133, 200],
  16: [76, 153, 230],
  17: [86, 173, 260],
  18: [100, 200, 300],
  19: [116, 233, 350],
  20: [133, 266, 400],
  21: [153, 306, 460],
  22: [173, 346, 520],
  23: [200, 400, 600],
  24: [233, 466, 700],
  25: [266, 533, 800],
  26: [306, 613, 920],
  27: [346, 693, 1040],
  28: [400, 800, 1200],
  29: [466, 933, 1400]
};

/**
 * PHB p. 162: Biped Carrying Capacity Multipliers by Creature Size.
 */
const SIZE_CARRYING_MULTIPLIERS: Record<string, number> = {
  Fine: 0.125,
  Diminutive: 0.25,
  Tiny: 0.5,
  Small: 0.75,
  Medium: 1,
  Large: 2,
  Huge: 4,
  Gargantuan: 8,
  Colossal: 16
};

/**
 * Calculates D&D 3.5 Carrying Capacity thresholds (Light, Medium, Heavy max weight in lb.)
 * for a given Strength score and creature size (PHB p. 162, Table 9-1).
 */
export function CalculateCarryingCapacity(strengthScore: number, sizeName: string = 'Medium'): CarryingCapacityThresholds {
  if (strengthScore <= 0) {
    return { lightLoadMax: 0, mediumLoadMax: 0, heavyLoadMax: 0 };
  }

  let baseRow: [number, number, number];
  if (strengthScore <= 29) {
    baseRow = PHB_CARRYING_CAPACITY_TABLE[Math.floor(strengthScore)] || [33, 66, 100];
  } else {
    // PHB p. 162 Tremendous Strength: find score between 20..29 with same ones digit, multiply by 4 for every 10 points above
    const floored = Math.floor(strengthScore);
    const lookupScore = 20 + (floored % 10);
    const tenSteps = Math.floor((floored - 20) / 10);
    const mult = Math.pow(4, tenSteps);
    const row20 = PHB_CARRYING_CAPACITY_TABLE[lookupScore];
    baseRow = [row20[0] * mult, row20[1] * mult, row20[2] * mult];
  }

  const sizeMultiplier = SIZE_CARRYING_MULTIPLIERS[sizeName] ?? 1;
  return {
    lightLoadMax: Number((baseRow[0] * sizeMultiplier).toFixed(2)),
    mediumLoadMax: Number((baseRow[1] * sizeMultiplier).toFixed(2)),
    heavyLoadMax: Number((baseRow[2] * sizeMultiplier).toFixed(2))
  };
}

/**
 * Computes total carried battle gear weight and resulting D&D 3.5 load category and penalties (PHB Table 9-2).
 */
export function CalculateCharacterEncumbrance(character: Readonly<ICharacter>): EncumbranceState {
  const strScore = character.abilities?.Str?.currentScore ?? 10;
  const sizeName = character.size?.currentSize?.name || 'Medium';
  const thresholds = CalculateCarryingCapacity(strScore, sizeName);

  const totalWeight = Number(
    (character.battleGear || [])
      .filter(item => item.isEquipped !== false)
      .reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.amount) || 1), 0)
      .toFixed(2)
  );

  let loadCategory: LoadCategory = 'Light';
  let maxDexCap: number | null = null;
  let acpPenalty = 0;
  let reducesSpeed = false;

  if (totalWeight <= thresholds.lightLoadMax) {
    loadCategory = 'Light';
  } else if (totalWeight <= thresholds.mediumLoadMax) {
    loadCategory = 'Medium';
    maxDexCap = 3;
    acpPenalty = -3;
    reducesSpeed = true;
  } else if (totalWeight <= thresholds.heavyLoadMax) {
    loadCategory = 'Heavy';
    maxDexCap = 1;
    acpPenalty = -6;
    reducesSpeed = true;
  } else {
    loadCategory = 'Overloaded';
    maxDexCap = 0;
    acpPenalty = -6;
    reducesSpeed = true;
  }

  return {
    ...thresholds,
    totalWeight,
    loadCategory,
    maxDexCap,
    acpPenalty,
    reducesSpeed
  };
}

/**
 * Calculates and applies D&D 3.5 encumbrance penalties (PHB p. 162, Table 9-2) to AC (Max Dex),
 * ACP (using the worse of armor ACP or load ACP), and Speed (using the worse of armor or load speed reduction,
 * except for Dwarves).
 */
export function ApplyEncumbranceEffects(character: ICharacter): EncumbranceState {
  const enc = CalculateCharacterEncumbrance(character);
  character.encumbrance = enc;

  if (enc.loadCategory === 'Light') {
    return enc;
  }

  if (enc.loadCategory === 'Overloaded' && Array.isArray(character.parseWarnings)) {
    character.parseWarnings.push(
      `Character is overloaded: ${enc.totalWeight} lb carried (max heavy load: ${enc.heavyLoadMax} lb)`
    );
  }

  const statusLabel = `${enc.loadCategory} Load`;

  // 1. Max Dexterity Cap (PHB Table 9-2: Medium Load +3, Heavy Load +1, Overloaded +0; uses worse of armor or load)
  if (enc.maxDexCap !== null && character.ac && typeof character.ac.applyMaxDexCap === 'function') {
    character.ac.applyMaxDexCap(enc.maxDexCap, statusLabel);
  }

  // 2. Check Penalty (PHB p. 162: "If your character is wearing armor, use the worse figure (from armor or from load), not both.")
  if (enc.acpPenalty < 0 && character.acp) {
    const currentAcp = character.acp.currentScore;
    if (enc.acpPenalty < currentAcp) {
      const additionalPenalty = enc.acpPenalty - currentAcp;
      character.acp.applyEffect(
        new StaticPropertyEffect({
          status: statusLabel,
          property: 'acp',
          modifierType: 'Generic',
          value: additionalPenalty
        })
      );
    }
  }

  // 3. Speed Reduction (PHB p. 162: "If your character is wearing armor, use the worse figure (from armor or from load), not both.")
  // Dwarves ignore speed reduction from medium or heavy load.
  if (enc.reducesSpeed && character.race !== 'Dwarf' && character.speed) {
    const alreadyHasSpeedReduction = character.speed.activeEffects.some(e => e.value < 0);
    if (!alreadyHasSpeedReduction) {
      const penalty = character.speed.score <= 20 ? -5 : -10;
      character.speed.applyEffect(
        new StaticPropertyEffect({
          status: statusLabel,
          property: 'speed',
          modifierType: 'Generic',
          value: penalty
        })
      );
    }
  }

  return enc;
}
