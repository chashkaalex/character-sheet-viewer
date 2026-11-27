import { ClassesData } from './classes_general_data';
import { ClassData, createClassData } from './class_types';
import { ICharacter } from '../character/icharacter';
import { DescriptionEffect, EffectFactory, StaticPropertyEffect } from '../character/state/effects';

export const Crusader: ClassData = createClassData({
  name: 'Crusader',
  HD: '1d10',
  skills: [
    'Balance',
    'Concentration',
    'Craft',
    'Diplomacy',
    'Intimidate',
    'Jump',
    'Knowledge (history)',
    'Knowledge (religion)',
    'Martial Lore',
    'Ride'
  ],

  acAbilityName: 'Dex',
  classAbilities: [
    'Furious Counterstrike',
    'Steely Resolve',
    'Indomitable Soul',
    'Zealous Surge',
    'Smite',
    'Die Hard',
    'Mettle',
    'Immortal Fortitude',
    'Weapon Proficiency',
    'Armor Proficiency',
    'Shield Proficiency',
    'Maneuvers Known'
  ],

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
  ],

  AddSpecialProps(character: ICharacter) {
    const level = character.GetClassLevel('Crusader');
    if (level <= 0) return;

    const steelyResolveMax = (Math.floor(level / 4) + 1) * 5;
    character.Special.applyEffect(new DescriptionEffect({
      status: 'Steely Resolve',
      description: `Delayed damage pool up to ${steelyResolveMax} points; empties at the end of your next turn.`
    }));

    character.Special.applyEffect(new DescriptionEffect({
      status: 'Furious Counterstrike',
      description: 'Gain +1 bonus on attack and weapon damage rolls for every 5 points in your delayed damage pool (minimum +1 if pool >= 1).'
    }));
    if (!character.actions.includes('Furious Counterstrike')) {
      character.actions.push('Furious Counterstrike');
    }

    if (level >= 2) {
      character.Special.applyEffect(new DescriptionEffect({
        status: 'Indomitable Soul',
        description: 'Add Charisma bonus (if any) as a bonus on Will saving throws (does not stack with Paladin Divine Grace).'
      }));
      EffectFactory({
        status: 'Indomitable Soul',
        property: 'Weapons',
        callback: (char: ICharacter) => {
          const chaMod = Math.max(0, char.abilities.Cha?.modifier || 0);
          if (chaMod > 0) {
            char.saves.Will.applyEffect(new StaticPropertyEffect({
              status: 'Indomitable Soul',
              property: 'Will',
              modifierType: 'Generic',
              value: chaMod
            }));
          }
        }
      }).ApplyEffect(character);
    }

    if (level >= 3) {
      character.Special.applyEffect(new DescriptionEffect({
        status: 'Zealous Surge',
        description: 'Once per day, you can reroll a saving throw that you have just failed. You must take the new result.'
      }));
    }

    if (level >= 6) {
      const usesPerDay = level >= 18 ? 2 : 1;
      character.Special.applyEffect(new DescriptionEffect({
        status: 'Smite',
        description: `${usesPerDay}/day add Charisma bonus (if any) to attack roll and +${level} to damage on one melee attack.`
      }));
      if (!character.actions.includes('Smite')) {
        character.actions.push('Smite');
      }
    }
  }
});

ClassesData.set('Crusader', Crusader);

