import { ClassesData } from './_classes_general_data';
import { ClassData } from './class_types';

export const Rogue: ClassData = {
  name: 'Rogue',
  HD: '1d6',
  skills: [
    'Appraise',
    'Balance',
    'Bluff',
    'Climb',
    'Craft',
    'Decipher Script',
    'Diplomacy',
    'Disable Device',
    'Disguise',
    'Escape Artist',
    'Forgery',
    'Gather Information',
    'Hide',
    'Intimidate',
    'Jump',
    'Knowledge (local)',
    'Listen',
    'Move Silently',
    'Open Lock',
    'Perform',
    'Profession',
    'Search',
    'Sense Motive',
    'Sleight of Hand',
    'Spot',
    'Swim',
    'Tumble',
    'Use Magic Device',
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
    /*level: 10*/{ bab: 7, Fort: 3, Ref: 7, Will: 3 },
    /*level: 11*/{ bab: 8, Fort: 3, Ref: 7, Will: 3 },
    /*level: 12*/{ bab: 9, Fort: 4, Ref: 8, Will: 4 },
    /*level: 13*/{ bab: 9, Fort: 4, Ref: 8, Will: 4 },
    /*level: 14*/{ bab: 10, Fort: 4, Ref: 9, Will: 4 },
    /*level: 15*/{ bab: 11, Fort: 5, Ref: 9, Will: 5 },
    /*level: 16*/{ bab: 12, Fort: 5, Ref: 10, Will: 5 },
    /*level: 17*/{ bab: 12, Fort: 5, Ref: 10, Will: 5 },
    /*level: 18*/{ bab: 13, Fort: 6, Ref: 11, Will: 6 },
    /*level: 19*/{ bab: 14, Fort: 6, Ref: 11, Will: 6 },
    /*level: 20*/{ bab: 15, Fort: 6, Ref: 12, Will: 6 }
  ]
};

ClassesData.set('Rogue', Rogue);

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = { Rogue };
}
