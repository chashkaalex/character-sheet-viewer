import { CreatureSize } from '../character/property';
import { StaticallyApplicableEffect, DynamicallyApplicableEffect, BaseEffect } from '../character/state';
import { ModifierType } from '../character/_constants';

export interface SpecialEffect extends Omit<BaseEffect, 'status'> {
    property: 'Special';
    description: string;
    status?: string;
    // For Special properties, these might be missing in legacy data
    modifierType?: ModifierType;
    value?: any;
}

export type RacialEffectData =
    (Omit<StaticallyApplicableEffect, 'status'> & { status?: string }) |
    (Omit<DynamicallyApplicableEffect, 'status'> & { status?: string }) |
    SpecialEffect;

/**
 * Foundational data for a D&D 3.5 race
 */
export interface RaceData {
    /**
     * The default size of the creature (e.g., Medium, Small)
     */
    size: CreatureSize;
    /**
     * Base land speed in feet
     */
    speed: number;
    /**
     * Optional racial effects (bonuses, immunities, special abilities)
     */
    effects?: RacialEffectData[];
}
