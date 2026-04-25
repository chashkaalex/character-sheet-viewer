import { ClassesData } from './_classes_general_data';
import { ClassData } from './class_types';

export const UnseenSeer: ClassData = {
  name: 'Unseen Seer',
  HD: '1d4',
  skills: [
    'Bluff',
    'Concentration',
    'Decipher Script',
    'Diplomacy',
    'Disguise',
    'Escape Artist',
    'Forgery',
    'Gather Information',
    'Hide',
    'Knowledge (arcana)',
    'Knowledge (architecture and engineering)',
    'Knowledge (dungeoneering)',
    'Knowledge (geography)',
    'Knowledge (history)',
    'Knowledge (local)',
    'Knowledge (nature)',
    'Knowledge (nobility and royalty)',
    'Knowledge (religion)',
    'Knowledge (the planes)',
    'Listen',
    'Move Silently',
    'Profession',
    'Search',
    'Sense Motive',
    'Sleight of Hand',
    'Spellcraft',
    'Spot'
  ],

  acAbilityName: 'Dex',

  levelTable: [
    /*level: 0*/ { bab: 0, Fort: 0, Ref: 0, Will: 0 },
    /*level: 1*/ { bab: 0, Fort: 0, Ref: 0, Will: 2 },
    /*level: 2*/ { bab: 1, Fort: 0, Ref: 0, Will: 3 },
    /*level: 3*/ { bab: 2, Fort: 1, Ref: 1, Will: 3 },
    /*level: 4*/ { bab: 3, Fort: 1, Ref: 1, Will: 4 },
    /*level: 5*/ { bab: 3, Fort: 1, Ref: 1, Will: 4 },
    /*level: 6*/ { bab: 4, Fort: 2, Ref: 2, Will: 5 },
    /*level: 7*/ { bab: 5, Fort: 2, Ref: 2, Will: 5 },
    /*level: 8*/ { bab: 6, Fort: 2, Ref: 2, Will: 6 },
    /*level: 9*/ { bab: 6, Fort: 3, Ref: 3, Will: 6 },
    /*level: 10*/{ bab: 7, Fort: 3, Ref: 3, Will: 7 }
  ],

  spellCastingData: {
    casterClass: 'Beguiler', // Prestige Class that advances an existing class
    type: 'Arcane',
    bonusSpellAbility: 'Int'
  }
};

ClassesData.set('Unseen Seer', UnseenSeer);

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = { UnseenSeer };
}
