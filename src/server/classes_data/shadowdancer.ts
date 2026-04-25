import { ClassesData } from './_classes_general_data';
import { ClassData } from './class_types';

export const Shadowdancer: ClassData = {
  name: 'Shadowdancer',
  HD: '1d8',
  skills: [
    'Balance',
    'Bluff',
    'Decipher Script',
    'Diplomacy',
    'Disguise',
    'Escape Artist',
    'Hide',
    'Jump',
    'Listen',
    'Move Silently',
    'Perform',
    'Profession',
    'Search',
    'Sense Motive',
    'Sleight of Hand',
    'Spot',
    'Tumble',
    'Use Rope'
  ],

  acAbilityName: 'Dex',

  levelTable: [
    /*level: 0*/ { bab: 0, Fort: 0, Ref: 0, Will: 0 },
    /*level: 1*/ { bab: 0, Fort: 0, Ref: 2, Will: 0 },
    /*level: 2*/ { bab: 1, Fort: 0, Ref: 3, Will: 0 },
    /*level: 3*/ { bab: 2, Fort: 1, Ref: 3, Will: 1 },
    /*level: 4*/ { bab: 3, Fort: 1, Ref: 4, Will: 1 },
    /*level: 5*/ { bab: 3, Fort: 1, Ref: 4, Will: 1 },
    /*level: 6*/ { bab: 4, Fort: 2, Ref: 5, Will: 2 },
    /*level: 7*/ { bab: 5, Fort: 2, Ref: 5, Will: 2 },
    /*level: 8*/ { bab: 6, Fort: 2, Ref: 6, Will: 2 },
    /*level: 9*/ { bab: 6, Fort: 3, Ref: 6, Will: 3 },
    /*level: 10*/{ bab: 7, Fort: 3, Ref: 7, Will: 3 }
  ]
};

ClassesData.set('Shadowdancer', Shadowdancer);

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = { Shadowdancer };
}
