import { CreatureSize } from '../character/00_property';
import { ModifierType } from '../character/_constants';
import {
    StaticPropertyEffectData,
    PermanentPropertyEffectData,
    DynamicPropertyEffectData,
    MutatingEffectData,
    DescriptionEffectData
} from '../character/state/effects';

export interface SpecialEffect extends Omit<DescriptionEffectData, 'status'> {
    property: 'Special';
    description: string;
    status?: string;
    // For Special properties, these might be missing in legacy data
    modifierType?: ModifierType;
    value?: unknown;
}

export type RacialEffectData =
    (Omit<StaticPropertyEffectData, 'status'> & { status?: string }) |
    (Omit<PermanentPropertyEffectData, 'status'> & { status?: string }) |
    (Omit<DynamicPropertyEffectData, 'status'> & { status?: string }) |
    (Omit<MutatingEffectData, 'status'> & { status?: string }) |
    (Omit<DescriptionEffectData, 'status'> & { status?: string }) |
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
