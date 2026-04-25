import { ClassData } from './class_types';

/**
 * Registry of all available class data in the system.
 */
export const ClassesData = new Map<string, ClassData>();

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = { ClassesData };
}
