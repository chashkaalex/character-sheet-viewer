import { ClassesData } from './_classes_general_data';
import { ClassData, createClassData } from './class_types';
import { ICharacter } from '../character/icharacter';

export const Monk: ClassData = createClassData({
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
  acAbilityName: 'Wis',

  levelTable: [
    /*level: 0*/ { bab: 0, Fort: 0, Ref: 0, Will: 0 },
    /*level: 1*/ { bab: 0, Fort: 2, Ref: 2, Will: 2, ac: 0, speed: 0 },
    /*level: 2*/ { bab: 1, Fort: 3, Ref: 3, Will: 3, ac: 0, speed: 0 },
    /*level: 3*/ { bab: 2, Fort: 3, Ref: 3, Will: 3, ac: 0, speed: 10 },
    /*level: 4*/ { bab: 3, Fort: 4, Ref: 4, Will: 4, ac: 0, speed: 10 },
    /*level: 5*/ { bab: 3, Fort: 4, Ref: 4, Will: 4, ac: 1, speed: 10 },
    /*level: 6*/ { bab: 4, Fort: 5, Ref: 5, Will: 5, ac: 1, speed: 20 },
    /*level: 7*/ { bab: 5, Fort: 5, Ref: 5, Will: 5, ac: 1, speed: 20 },
    /*level: 8*/ { bab: 6, Fort: 6, Ref: 6, Will: 6, ac: 1, speed: 20 },
    /*level: 9*/ { bab: 6, Fort: 6, Ref: 6, Will: 6, ac: 1, speed: 30 },
    /*level: 10*/{ bab: 7, Fort: 7, Ref: 7, Will: 7, ac: 2, speed: 30 },
    /*level: 11*/{ bab: 8, Fort: 7, Ref: 7, Will: 7, ac: 2, speed: 30 },
    /*level: 12*/{ bab: 9, Fort: 8, Ref: 8, Will: 8, ac: 2, speed: 40 },
    /*level: 13*/{ bab: 9, Fort: 8, Ref: 8, Will: 8, ac: 2, speed: 40 },
    /*level: 14*/{ bab: 10, Fort: 9, Ref: 9, Will: 9, ac: 2, speed: 40 },
    /*level: 15*/{ bab: 11, Fort: 9, Ref: 9, Will: 9, ac: 3, speed: 50 },
    /*level: 16*/{ bab: 12, Fort: 10, Ref: 10, Will: 10, ac: 3, speed: 50 },
    /*level: 17*/{ bab: 12, Fort: 10, Ref: 10, Will: 10, ac: 3, speed: 50 },
    /*level: 18*/{ bab: 13, Fort: 11, Ref: 11, Will: 11, ac: 3, speed: 60 },
    /*level: 19*/{ bab: 14, Fort: 11, Ref: 11, Will: 11, ac: 3, speed: 60 },
    /*level: 20*/{ bab: 15, Fort: 12, Ref: 12, Will: 12, ac: 4, speed: 60 }
  ],

  AddSpecialProps(character: ICharacter) {
    const level = character.GetClassLevel('Monk');
    if (level > 0) {
      character.GetModifiableProperty('effectiveMonkLevel').applyPermanentEffect(level);
    }
  },

  GetUnarmedDamage(character: ICharacter, _level: number) {
    const effectiveLevel = character.GetModifiableProperty('effectiveMonkLevel').currentScore;
    const progression = ['1d6', '1d8', '1d10', '2d6', '2d8', '2d10', '4d8'];

    let baseKey = 0;
    if (effectiveLevel < 4) baseKey = 0;
    else if (effectiveLevel < 8) baseKey = 1;
    else if (effectiveLevel < 12) baseKey = 2;
    else if (effectiveLevel < 16) baseKey = 3;
    else if (effectiveLevel < 20) baseKey = 4;
    else baseKey = 5;

    const finalKey = Math.min(baseKey, progression.length - 1);
    return progression[finalKey];
  }
});

ClassesData.set('Monk', Monk);

