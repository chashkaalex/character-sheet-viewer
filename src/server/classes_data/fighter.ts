import { ClassesData } from './_classes_general_data';
import { ClassData } from './class_types';

export const Fighter: ClassData = {
  name: 'Fighter',
  HD: '1d10',
  skills: [
    'Climb',
    'Craft',
    'Handle Animal',
    'Intimidate',
    'Jump',
    'Ride',
    'Swim'
  ],

  acAbilityName: 'Dex',

  levelTable: [
    /*level: 0*/ { bab: 0, Fort: 0, Ref: 0, Will: 0 },
    /*level: 1*/ { bab: 1, Fort: 2, Ref: 0, Will: 0 },
    /*level: 2*/ { bab: 2, Fort: 3, Ref: 0, Will: 0 },
    /*level: 3*/ { bab: 3, Fort: 3, Ref: 1, Will: 1 },
    /*level: 4*/ { bab: 4, Fort: 4, Ref: 1, Will: 1 },
    /*level: 5*/ { bab: 5, Fort: 4, Ref: 1, Will: 1 },
    /*level: 6*/ { bab: 6, Fort: 5, Ref: 2, Will: 2 },
    /*level: 7*/ { bab: 7, Fort: 5, Ref: 2, Will: 2 },
    /*level: 8*/ { bab: 8, Fort: 6, Ref: 2, Will: 2 },
    /*level: 9*/ { bab: 9, Fort: 6, Ref: 3, Will: 3 },
    /*level: 10*/{ bab: 10, Fort: 7, Ref: 3, Will: 3 },
    /*level: 11*/{ bab: 11, Fort: 7, Ref: 3, Will: 3 },
    /*level: 12*/{ bab: 12, Fort: 8, Ref: 4, Will: 4 },
    /*level: 13*/{ bab: 13, Fort: 8, Ref: 4, Will: 4 },
    /*level: 14*/{ bab: 14, Fort: 9, Ref: 4, Will: 4 },
    /*level: 15*/{ bab: 15, Fort: 9, Ref: 5, Will: 5 },
    /*level: 16*/{ bab: 16, Fort: 10, Ref: 5, Will: 5 },
    /*level: 17*/{ bab: 17, Fort: 10, Ref: 5, Will: 5 },
    /*level: 18*/{ bab: 18, Fort: 11, Ref: 6, Will: 6 },
    /*level: 19*/{ bab: 19, Fort: 11, Ref: 6, Will: 6 },
    /*level: 20*/{ bab: 20, Fort: 12, Ref: 6, Will: 6 }
  ]
};

ClassesData.set('Fighter', Fighter);

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = { Fighter };
}
