import { ClassesData } from './classes_general_data';
import { ClassData, createClassData } from './class_types';
import { ICharacter } from '../character/icharacter';
import { StaticPropertyEffect } from '../character/state/effects';

export const UnseenSeer: ClassData = createClassData({
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
  },

  AddSpecialProps(character: ICharacter) {
    const level = character.GetClassLevel('Unseen Seer');
    if (level > 0 && (character.HasClass('Rogue') || character.GetModifiableProperty('sneakAttackDice').currentScore > 0)) {
      const bonusDice = Math.floor((level + 2) / 3); // +1d6 at 1st, 4th, 7th, 10th level
      if (bonusDice > 0) {
        character.GetModifiableProperty('sneakAttackDice').applyEffect(
          new StaticPropertyEffect({
            status: 'Unseen Seer',
            property: 'sneakAttackDice',
            modifierType: 'Generic',
            value: bonusDice
          })
        );
      }
    }

    // Divination Spell Power (Complete Mage p. 81, or variant school e.g. "Illusion Spell Power (+1 CL to Illusion, -1 CL to other schools)")
    if (level >= 3) {
      const spellPowerTier = Math.floor(level / 3); // +1/-1 at 3rd, +2/-2 at 6th, +3/-3 at 9th
      const specialLines = character.sectionLines?.['Special Abilities'] || [];
      let targetSchool = 'Divination';
      let bonusCl = spellPowerTier;
      let penaltyCl = -spellPowerTier;

      for (const rawLine of specialLines) {
        const schoolMatch = rawLine.match(/\b(Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation)\s+Spell\s+Power\b/i);
        if (schoolMatch) {
          targetSchool = schoolMatch[1].charAt(0).toUpperCase() + schoolMatch[1].slice(1).toLowerCase();
          const bonusMatch = rawLine.match(/\+(\d+)\s*CL\s+to\s+[A-Za-z]+/i);
          const penaltyMatch = rawLine.match(/(-\d+)\s*CL\s+to\s+other\s+schools/i);
          if (bonusMatch) bonusCl = parseInt(bonusMatch[1], 10);
          if (penaltyMatch) penaltyCl = parseInt(penaltyMatch[1], 10);
          break;
        }
      }

      const statusLabel = `${targetSchool} Spell Power`;
      const allSchools = [
        'Abjuration',
        'Conjuration',
        'Divination',
        'Enchantment',
        'Evocation',
        'Illusion',
        'Necromancy',
        'Transmutation',
        'Universal'
      ];
      allSchools.forEach(school => {
        const propName = `casterLevelSchool (${school})`;
        const prop = character.GetModifiableProperty(propName);
        if (!character.HasPropertyInitialized(propName)) {
          character.registerProperty(propName, prop);
        }
        prop.applyEffect(
          new StaticPropertyEffect({
            status: statusLabel,
            property: propName,
            modifierType: 'Generic',
            value: school === targetSchool ? bonusCl : penaltyCl
          })
        );
      });
    }
  }
});

ClassesData.set('Unseen Seer', UnseenSeer);

