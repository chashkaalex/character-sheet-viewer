const { ClassesData } = require('./_classes_general_data');

const Monk = {
  name: 'Monk',
  HD: '1d8',
  skills: [
    'Balance',
    'Climb',
    'Concentration',
    'Craft',
    'Diplomacy',
    'Escape Artist',
    'Hide',
    'Jump',
    'Knowledge',
    'Listen',
    'Move Silently',
    'Perform',
    'Profession',
    'Sense Motive',
    'Spot',
    'Swim',
    'Tumble'
  ],

  levelTable: [
    /*level: 0*/ {}, //nothing on level 0
    /*level: 1*/ { bab: 0, Fort: 2, Ref: 2, Will: 2,  /*flurry: -2, dmg: "1d6",  */ac: 0, speed: 0 },
    /*level: 2*/ { bab: 1, Fort: 3, Ref: 3, Will: 3,  /*flurry: -1, dmg: "1d6",  */ac: 0, speed: 0 },
    /*level: 3*/ { bab: 2, Fort: 3, Ref: 3, Will: 3,  /*flurry: 0,  dmg: "1d6",  */ac: 0, speed: 10 },
    /*level: 4*/ { bab: 3, Fort: 4, Ref: 4, Will: 4,  /*flurry: 1,  dmg: "1d8",  */ac: 0, speed: 10 },
    /*level: 5*/ { bab: 3, Fort: 4, Ref: 4, Will: 4,  /*flurry: 2,  dmg: "1d8",  */ac: 1, speed: 10 },
    /*level: 6*/ { bab: 4, Fort: 5, Ref: 5, Will: 5,  /*flurry: 3,  dmg: "1d8",  */ac: 1, speed: 20 },
    /*level: 7*/ { bab: 5, Fort: 5, Ref: 5, Will: 5,  /*flurry: 4,  dmg: "1d8",  */ac: 1, speed: 20 },
    /*level: 8*/ { bab: 6, Fort: 6, Ref: 6, Will: 6,  /*flurry: 5,  dmg: "1d10", */ac: 1, speed: 20 },
    /*level: 9*/ { bab: 6, Fort: 6, Ref: 6, Will: 6,  /*flurry: 6,  dmg: "1d10", */ac: 1, speed: 30 },
    /*level: 10*/{ bab: 7, Fort: 7, Ref: 7, Will: 7,  /*flurry: 7,  dmg: "1d10", */ac: 2, speed: 30 },
    /*level: 11*/{ bab: 8, Fort: 7, Ref: 7, Will: 7,  /*flurry: 8,  dmg: "1d10", */ac: 2, speed: 30 },
    /*level: 12*/{ bab: 9, Fort: 8, Ref: 8, Will: 8,  /*flurry: 9,  dmg: "2d6",  */ac: 2, speed: 40 },
    /*level: 13*/{ bab: 9, Fort: 8, Ref: 8, Will: 8,  /*flurry: 9,  dmg: "2d6",  */ac: 2, speed: 40 },
    /*level: 14*/{ bab: 10, Fort: 9, Ref: 9, Will: 9,  /*flurry: 10, dmg: "2d6",  */ac: 2, speed: 40 },
    /*level: 15*/{ bab: 11, Fort: 9, Ref: 9, Will: 9,  /*flurry: 11, dmg: "2d6",  */ac: 3, speed: 50 },
    /*level: 16*/{ bab: 12, Fort: 10, Ref: 10, Will: 10, /*flurry: 12, dmg: "2d8",  */ac: 3, speed: 50 },
    /*level: 17*/{ bab: 12, Fort: 10, Ref: 10, Will: 10, /*flurry: 12, dmg: "2d8",  */ac: 3, speed: 50 },
    /*level: 18*/{ bab: 13, Fort: 11, Ref: 11, Will: 11, /*flurry: 13, dmg: "2d8",  */ac: 3, speed: 60 },
    /*level: 19*/{ bab: 14, Fort: 11, Ref: 11, Will: 11, /*flurry: 14, dmg: "2d8",  */ac: 3, speed: 60 },
    /*level: 20*/{ bab: 15, Fort: 12, Ref: 12, Will: 12, /*flurry: 15, dmg: "2d10", */ac: 4, speed: 60 }
  ]

};


ClassesData.set('Monk', Monk);

if (typeof module !== 'undefined') {
  module.exports = {
    Monk
  };
}
