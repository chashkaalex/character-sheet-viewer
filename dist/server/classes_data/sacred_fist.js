

const SacredFist = {
  name: 'Sacred Fist',
  HD: '1d8',
  skills: [
    'Balance',
    'Concentration',
    'Escape Artist',
    'Heal',
    'Jump',
    'Profession',
    'Spellcraft',
    'Tumble'
  ],

  spellCastingData: {
    casterClass: 'Cleric', //levels of Scared Fist are counted towards Cleric spell slots
    type: 'Divine',
    preparation: 'In Advance',
    bonusSpellAbility: 'Wis'
  },

  levelTable: [
    /*level: 0*/ {}, //nothing on level 0
    /*level: 1*/ { bab: 1, Fort: 2, Ref: 2, Will: 0, ac: 1, speed: 0 },
    /*level: 2*/ { bab: 2, Fort: 3, Ref: 3, Will: 0, ac: 1, speed: 0 },
    /*level: 3*/ { bab: 3, Fort: 3, Ref: 3, Will: 1, ac: 1, speed: 10 },
    /*level: 4*/ { bab: 4, Fort: 4, Ref: 4, Will: 1, ac: 1, speed: 10 },
    /*level: 5*/ { bab: 5, Fort: 4, Ref: 4, Will: 1, ac: 2, speed: 10 },
    /*level: 6*/ { bab: 6, Fort: 5, Ref: 5, Will: 2, ac: 2, speed: 20 },
    /*level: 7*/ { bab: 7, Fort: 5, Ref: 5, Will: 2, ac: 2, speed: 20 },
    /*level: 8*/ { bab: 8, Fort: 6, Ref: 6, Will: 2, ac: 2, speed: 30 },
    /*level: 9*/ { bab: 9, Fort: 6, Ref: 6, Will: 3, ac: 2, speed: 30 },
    /*level: 10*/{ bab: 10, Fort: 7, Ref: 7, Will: 3, ac: 3, speed: 30 }
  ]
};

ClassesData.set('Sacred Fist', SacredFist);
