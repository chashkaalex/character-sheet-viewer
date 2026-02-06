
const { ClassesData } = require('./_classes_general_data');

const Bard = {
  name: 'Bard',
  HD: '1d6',
  skills: [
    'Appraise',
    'Balance',
    'Bluff',
    'Climb',
    'Concentration',
    'Craft',
    'Decipher Script',
    'Diplomacy',
    'Disguise',
    'Escape Artist',
    'Gather Information',
    'Hide',
    'Jump',
    'Knowledge',
    'Listen',
    'Move Silently',
    'Perform',
    'Profession',
    'Sense Motive',
    'Sleight of Hand',
    'Speak Language',
    'Spellcraft',
    'Swim',
    'Tumble',
    'Use Magic Device'
  ],
  levelTable: [
    /*level: 0*/ {},
    /*level: 1*/ { bab: 0, Fort: 0, Ref: 2, Will: 2 },
    /*level: 2*/ { bab: 1, Fort: 0, Ref: 3, Will: 3 },
    /*level: 3*/ { bab: 2, Fort: 1, Ref: 3, Will: 3 },
    /*level: 4*/ { bab: 3, Fort: 1, Ref: 4, Will: 4 },
    /*level: 5*/ { bab: 3, Fort: 1, Ref: 4, Will: 4 },
    /*level: 6*/ { bab: 4, Fort: 2, Ref: 5, Will: 5 },
    /*level: 7*/ { bab: 5, Fort: 2, Ref: 5, Will: 5 },
    /*level: 8*/ { bab: 6, Fort: 2, Ref: 6, Will: 6 },
    /*level: 9*/ { bab: 6, Fort: 3, Ref: 6, Will: 6 },
    /*level: 10*/{ bab: 7, Fort: 3, Ref: 7, Will: 7 },
    /*level: 11*/{ bab: 8, Fort: 3, Ref: 7, Will: 7 },
    /*level: 12*/{ bab: 9, Fort: 4, Ref: 8, Will: 8 },
    /*level: 13*/{ bab: 9, Fort: 4, Ref: 8, Will: 8 },
    /*level: 14*/{ bab: 10, Fort: 4, Ref: 9, Will: 9 },
    /*level: 15*/{ bab: 11, Fort: 5, Ref: 9, Will: 9 },
    /*level: 16*/{ bab: 12, Fort: 5, Ref: 10, Will: 10 },
    /*level: 17*/{ bab: 12, Fort: 5, Ref: 10, Will: 10 },
    /*level: 18*/{ bab: 13, Fort: 6, Ref: 11, Will: 11 },
    /*level: 19*/{ bab: 14, Fort: 6, Ref: 11, Will: 11 },
    /*level: 20*/{ bab: 15, Fort: 6, Ref: 12, Will: 12 }
  ],
  spellCastingData: {
    casterClass: 'Bard',
    type: 'Arcane',
    preparation: 'Spontaneous',
    bonusSpellAbility: 'Char',
    spellSlots: [
      //lvl: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // level 0
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1st
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 2nd: 0 means bonus only
      [3, 1, 0, 0, 0, 0, 0, 0, 0, 0], // 3rd
      [3, 2, 0, 0, 0, 0, 0, 0, 0, 0], // 4th
      [3, 3, 1, 0, 0, 0, 0, 0, 0, 0], // 5th
      [3, 3, 2, 0, 0, 0, 0, 0, 0, 0], // 6th
      [3, 3, 2, 0, 0, 0, 0, 0, 0, 0], // 7th: "3 3 2 0" -> 0 spells at lvl 3
      [3, 3, 3, 1, 0, 0, 0, 0, 0, 0], // 8th
      [3, 3, 3, 2, 0, 0, 0, 0, 0, 0], // 9th
      [3, 3, 3, 2, 0, 0, 0, 0, 0, 0], // 10th "3 3 3 2 0"
      [3, 3, 3, 3, 1, 0, 0, 0, 0, 0], // 11th
      [3, 3, 3, 3, 2, 0, 0, 0, 0, 0], // 12th
      [3, 3, 3, 3, 2, 0, 0, 0, 0, 0], // 13th "3 3 3 3 2 0"
      [4, 3, 3, 3, 3, 1, 0, 0, 0, 0], // 14th
      [4, 4, 3, 3, 3, 2, 0, 0, 0, 0], // 15th
      [4, 4, 4, 3, 3, 2, 0, 0, 0, 0], // 16th "4 4 4 3 3 2 0"
      [4, 4, 4, 4, 3, 3, 1, 0, 0, 0], // 17th
      [4, 4, 4, 4, 4, 3, 2, 0, 0, 0], // 18th
      [4, 4, 4, 4, 4, 4, 3, 0, 0, 0], // 19th
      [4, 4, 4, 4, 4, 4, 4, 0, 0, 0]  // 20th
    ],
    spellsKnown: [
      //lvl: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // level 0
      [4, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1st
      [5, 2, 0, 0, 0, 0, 0, 0, 0, 0], // 2nd
      [6, 3, 0, 0, 0, 0, 0, 0, 0, 0], // 3rd
      [6, 3, 2, 0, 0, 0, 0, 0, 0, 0], // 4th
      [6, 4, 3, 0, 0, 0, 0, 0, 0, 0], // 5th
      [6, 4, 3, 0, 0, 0, 0, 0, 0, 0], // 6th
      [6, 4, 4, 2, 0, 0, 0, 0, 0, 0], // 7th
      [6, 4, 4, 3, 0, 0, 0, 0, 0, 0], // 8th
      [6, 4, 4, 3, 0, 0, 0, 0, 0, 0], // 9th
      [6, 4, 4, 4, 2, 0, 0, 0, 0, 0], // 10th
      [6, 4, 4, 4, 3, 0, 0, 0, 0, 0], // 11th
      [6, 4, 4, 4, 3, 0, 0, 0, 0, 0], // 12th
      [6, 4, 4, 4, 4, 2, 0, 0, 0, 0], // 13th
      [6, 4, 4, 4, 4, 3, 0, 0, 0, 0], // 14th
      [6, 4, 4, 4, 4, 3, 0, 0, 0, 0], // 15th
      [6, 5, 4, 4, 4, 4, 2, 0, 0, 0], // 16th
      [6, 5, 5, 4, 4, 4, 3, 0, 0, 0], // 17th
      [6, 5, 5, 5, 4, 4, 3, 0, 0, 0], // 18th
      [6, 5, 5, 5, 5, 4, 4, 0, 0, 0], // 19th
      [6, 5, 5, 5, 5, 5, 4, 0, 0, 0]  // 20th
    ],
    spells: {},
    getAvailableSpells(maxLevel) {
      const availableSpells = {};
      for (let level = 0; level <= maxLevel; level++) {
        availableSpells[level] = this.spells[level] || [];
      }
      return availableSpells;
    }
  }
};

ClassesData.set('Bard', Bard);
