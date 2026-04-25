import { RaceData } from './race_types';

/**
 * Registry of all available racial data in the system.
 */
export const RacesData = new Map<string, RaceData>();

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = { RacesData };
}
