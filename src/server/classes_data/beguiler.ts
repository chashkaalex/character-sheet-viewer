import { ClassesData } from './_classes_general_data';
import { ClassData } from './class_types';
import { ParsePreparedSlotsSpontaneous } from '../character/parsers/prepared_spells';

export const Beguiler: ClassData = {
  name: 'Beguiler',
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
    'Disable Device',
    'Disguise',
    'Escape Artist',
    'Forgery',
    'Gather Information',
    'Hide',
    'Intimidate',
    'Jump',
    'Knowledge (arcana)',
    'Knowledge (local)',
    'Knowledge (nobility and royalty)',
    'Listen',
    'Move Silently',
    'Open Lock',
    'Perform',
    'Profession',
    'Search',
    'Sense Motive',
    'Sleight of Hand',
    'Speak Language',
    'Spellcraft',
    'Spot',
    'Swim',
    'Tumble',
    'Use Magic Device',
    'Use Rope'
  ],

  acAbilityName: 'Dex',

  levelTable: [
    /*level: 0*/ { bab: 0, Fort: 0, Ref: 0, Will: 0 },
    /*level: 1*/ { bab: 0, Fort: 0, Ref: 0, Will: 2 },
    /*level: 2*/ { bab: 1, Fort: 0, Ref: 0, Will: 3 },
    /*level: 3*/ { bab: 1, Fort: 1, Ref: 1, Will: 3 },
    /*level: 4*/ { bab: 2, Fort: 1, Ref: 1, Will: 4 },
    /*level: 5*/ { bab: 2, Fort: 1, Ref: 1, Will: 4 },
    /*level: 6*/ { bab: 3, Fort: 2, Ref: 2, Will: 5 },
    /*level: 7*/ { bab: 3, Fort: 2, Ref: 2, Will: 5 },
    /*level: 8*/ { bab: 4, Fort: 2, Ref: 2, Will: 6 },
    /*level: 9*/ { bab: 4, Fort: 3, Ref: 3, Will: 6 },
    /*level: 10*/{ bab: 5, Fort: 3, Ref: 3, Will: 7 },
    /*level: 11*/{ bab: 5, Fort: 3, Ref: 3, Will: 7 },
    /*level: 12*/{ bab: 6, Fort: 4, Ref: 4, Will: 8 },
    /*level: 13*/{ bab: 6, Fort: 4, Ref: 4, Will: 8 },
    /*level: 14*/{ bab: 7, Fort: 4, Ref: 4, Will: 9 },
    /*level: 15*/{ bab: 7, Fort: 5, Ref: 5, Will: 9 },
    /*level: 16*/{ bab: 8, Fort: 5, Ref: 5, Will: 10 },
    /*level: 17*/{ bab: 8, Fort: 5, Ref: 5, Will: 10 },
    /*level: 18*/{ bab: 9, Fort: 6, Ref: 6, Will: 11 },
    /*level: 19*/{ bab: 9, Fort: 6, Ref: 6, Will: 11 },
    /*level: 20*/{ bab: 10, Fort: 6, Ref: 6, Will: 12 }
  ],

  spellCastingData: {
    casterClass: 'Beguiler',
    type: 'Arcane',
    preparation: 'Spontaneous',
    bonusSpellAbility: 'Int',

    spellSlots: [
      //lvl: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // level 0
      [5, 3, 0, 0, 0, 0, 0, 0, 0, 0], // 1st
      [6, 4, 0, 0, 0, 0, 0, 0, 0, 0], // 2nd
      [6, 5, 0, 0, 0, 0, 0, 0, 0, 0], // 3rd
      [6, 6, 3, 0, 0, 0, 0, 0, 0, 0], // 4th
      [6, 6, 4, 0, 0, 0, 0, 0, 0, 0], // 5th
      [6, 6, 5, 3, 0, 0, 0, 0, 0, 0], // 6th
      [6, 6, 6, 4, 0, 0, 0, 0, 0, 0], // 7th
      [6, 6, 6, 5, 3, 0, 0, 0, 0, 0], // 8th
      [6, 6, 6, 6, 4, 0, 0, 0, 0, 0], // 9th
      [6, 6, 6, 6, 5, 3, 0, 0, 0, 0], // 10th
      [6, 6, 6, 6, 6, 4, 0, 0, 0, 0], // 11th
      [6, 6, 6, 6, 6, 5, 3, 0, 0, 0], // 12th
      [6, 6, 6, 6, 6, 6, 4, 0, 0, 0], // 13th
      [6, 6, 6, 6, 6, 6, 5, 3, 0, 0], // 14th
      [6, 6, 6, 6, 6, 6, 6, 4, 0, 0], // 15th
      [6, 6, 6, 6, 6, 6, 6, 5, 3, 0], // 16th
      [6, 6, 6, 6, 6, 6, 6, 6, 4, 0], // 17th
      [6, 6, 6, 6, 6, 6, 6, 6, 5, 3], // 18th
      [6, 6, 6, 6, 6, 6, 6, 6, 6, 4], // 19th
      [6, 6, 6, 6, 6, 6, 6, 6, 6, 5]  // 20th
    ],
    spells: {},
    getAvailableSpells(maxLevel: number) {
      const availableSpells: Record<string, string[]> = {};
      for (let level = 0; level <= maxLevel; level++) {
        availableSpells[level] = (this.spells as any)[level] || [];
      }
      return availableSpells;
    },
    ParsePreparedSpells: ParsePreparedSlotsSpontaneous
  }
};

ClassesData.set('Beguiler', Beguiler);

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = { Beguiler };
}
