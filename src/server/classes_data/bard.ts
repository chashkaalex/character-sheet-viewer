import { ClassesData } from './classes_general_data';
import { ClassData, createClassData } from './class_types';
import { ModifiableProperty } from '../character/property';
import { BardicSpecial } from '../character/common_types';
import { ParsePreparedSlotsSpontaneous } from '../character/parsers/prepared_spells';
import { ICharacter } from '../character/icharacter';
import { ParseKnownSpellsSpontaneous } from '../character/parsers/known_spells';
import { Skill } from '../character/properties/skills';
import { ActionData, registerActionCategory, registerActions } from '../character/actions/actions_effects';
import { GetSpellData } from '../character/spells';

export const Bard: ClassData = createClassData({
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
    /*level: 0*/ { bab: 0, Fort: 0, Ref: 0, Will: 0 },
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
  acAbilityName: 'Dex',
  classAbilities: [
    'Bardic Knowledge',
    'Bardic Music',
    'Countersong',
    'Fascinate',
    'Inspire Courage',
    'Inspire Competence',
    'Suggestion',
    'Inspire Greatness',
    'Song of Freedom',
    'Inspire Heroics',
    'Mass Suggestion',
    'Weapon Proficiency',
    'Armor Proficiency',
    'Shield Proficiency'
  ],
  spellCastingData: {
    casterClass: 'Bard',
    type: 'Arcane',
    preparation: 'Spontaneous',
    bonusSpellAbility: 'Cha',
    spellSlots: [
      //lvl: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // level 0
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1st
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 2nd: 0 means bonus only
      [3, 1, 0, 0, 0, 0, 0, 0, 0, 0], // 3rd
      [3, 2, 0, 0, 0, 0, 0, 0, 0, 0], // 4th
      [3, 3, 1, 0, 0, 0, 0, 0, 0, 0], // 5th
      [3, 3, 2, 0, 0, 0, 0, 0, 0, 0], // 6th
      [3, 3, 2, 0, 0, 0, 0, 0, 0, 0], // 7th
      [3, 3, 3, 1, 0, 0, 0, 0, 0, 0], // 8th
      [3, 3, 3, 2, 0, 0, 0, 0, 0, 0], // 9th
      [3, 3, 3, 2, 0, 0, 0, 0, 0, 0], // 10th
      [3, 3, 3, 3, 1, 0, 0, 0, 0, 0], // 11th
      [3, 3, 3, 3, 2, 0, 0, 0, 0, 0], // 12th
      [3, 3, 3, 3, 2, 0, 0, 0, 0, 0], // 13th
      [4, 3, 3, 3, 3, 1, 0, 0, 0, 0], // 14th
      [4, 4, 3, 3, 3, 2, 0, 0, 0, 0], // 15th
      [4, 4, 4, 3, 3, 2, 0, 0, 0, 0], // 16th
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
    getKnownSpells(character: Readonly<ICharacter>, maxLevel: number, domains?: string[]) {
      return ParseKnownSpellsSpontaneous(character, 'Bard', domains);
    },

    getBardicSpecials(level: number) {
      return resolveBardicSpecials(level);
    },
    ParsePreparedSpellsMethod: (casterClassName: string, preparedSpellsLines: string[]) => {
      const parsed = ParsePreparedSlotsSpontaneous(casterClassName, preparedSpellsLines);
      delete parsed['songs'];
      return parsed;
    },
    ConsumeSpellSlot: (docId: string, slotData: any, adapter: any) => {
      return adapter.DecrementSpontaneousSlots(docId, slotData.casterClassName, slotData.spellLevel);
    },
    ReplenishSpellSlots: (docId: string, adapter: any) => {
      return adapter.ReplenishSpontaneousSlots(docId, 'Bard');
    },
    AddSpecialProperties(character: ICharacter, runtimeData: any) {

      runtimeData.bardicSpecials = resolveBardicSpecials(runtimeData.level.currentScore);
      runtimeData.bardicSpecials.forEach((special: any) => {
        if (special.value && (character as any).registerProperty) {
          (character as any).registerProperty(special.name, special.value);
        }
        if (character.actions && !character.actions.includes(special.name)) {
          character.actions.push(special.name);
        }
      });

      // Move Bardic Music daily uses ('songs') from Prepared Spells lines to actionCategoryResources
      const preparedLines = character.sectionLines?.['Prepared Spells'] || [];
      const parsedSlots = ParsePreparedSlotsSpontaneous('Bard', preparedLines);
      const songSlots = parsedSlots['songs'];
      if (Array.isArray(songSlots)) {
        const remaining = songSlots.filter((s: any) => !s.isUsed).length;
        const max = songSlots.length;
        if (!character.actionCategoryResources) {
          character.actionCategoryResources = {};
        }
        character.actionCategoryResources['songs'] = { remaining, max, label: 'Uses' };
      }

      // Add Bardic Knowledge skill
      const bardLevel = runtimeData.level.currentScore;
      if (bardLevel > 0) {
        let bk = character.skills.find(s => s.name === 'Bardic Knowledge');
        if (!bk) {
          bk = new Skill('Bardic Knowledge', bardLevel, character.abilities.Int!, character.acp);
          character.skills.push(bk);
        } else {
          bk.score = bardLevel;
          bk.currentScore = bardLevel;
        }

        // Set up synergy for Bardic Knowledge
        const historySkill = character.skills.find(s => s.name === 'Knowledge (history)');
        if (historySkill && !bk.synergySkills.some(s => s.name === historySkill.name)) {
          bk.synergySkills.push(historySkill);
        }
      }

      character.manipulationCallbacks.OnCastSpell.push((char, slotData, context, helpers) => {
        if (slotData.casterClassName === 'Bard' && slotData.spellLevel === 'songs') {
          const bardCasterData = char.spellCasting.GetSpellCasterClassData('Bard');
          if (bardCasterData && bardCasterData.bardicSpecials) {
            const matchedSpecial = bardCasterData.bardicSpecials.find((s) => s.name === slotData.spellName);
            if (matchedSpecial && matchedSpecial.value) {
              const modifierVal = matchedSpecial.value.currentScore;
              if (modifierVal) {
                context.statusName = `${slotData.spellName} +${modifierVal}`;
              }
              if (slotData.spellName === 'Inspire Courage' && char.HasStatus('Inspirational Boost')) {
                helpers.removeStatus('Inspirational Boost');
              }
            }
          }
        }
      });
    }
  }
});

function resolveBardicSpecials(level: number): BardicSpecial[] {
  const bardicSpecials: BardicSpecial[] = [];

  //basics
  bardicSpecials.push({ name: 'Countersong' });
  bardicSpecials.push({ name: 'Fascinate' });

  //Inspire Courage
  let inspireCourageBonus = 1;
  if (level >= 20) {
    inspireCourageBonus = 4;
  } else if (level >= 14) {
    inspireCourageBonus = 3;
  } else if (level >= 8) {
    inspireCourageBonus = 2;
  }
  bardicSpecials.push({ name: 'Inspire Courage', value: new ModifiableProperty(inspireCourageBonus) });

  //Inspire Competence
  if (level > 2) {
    bardicSpecials.push({ name: 'Inspire Competence', value: new ModifiableProperty(2) });
  }

  //Suggestion
  if (level > 5) {
    bardicSpecials.push({ name: 'Suggestion' });
  }

  //Inspire greatness
  if (level > 9) {
    bardicSpecials.push({ name: 'Inspire Greatness', value: new ModifiableProperty(2) });
  }

  //Song of freedom
  if (level > 11) {
    bardicSpecials.push({ name: 'Song of Freedom' });
  }

  //Inspire heroics
  if (level > 14) {
    bardicSpecials.push({ name: 'Inspire Heroics', value: new ModifiableProperty(4) });
  }

  //Mass Suggestion
  if (level > 17) {
    bardicSpecials.push({ name: 'Mass Suggestion' });
  }

  return bardicSpecials;
}

const ALL_BARD_SONGS = [
  'Countersong',
  'Fascinate',
  'Inspire Courage',
  'Inspire Competence',
  'Suggestion',
  'Inspire Greatness',
  'Song of Freedom',
  'Inspire Heroics',
  'Mass Suggestion'
] as const;

function createBardSongAction(songName: string): ActionData {
  const spellMeta = GetSpellData(songName);
  return {
    statusName: songName,
    category: 'songs',
    actionType: 'standard',
    target: spellMeta?.target || 'Self',
    getModifier: (character: ICharacter) => {
      const bardCasterData = character.spellCasting.GetSpellCasterClassData('Bard');
      const matchedSpecial = bardCasterData?.bardicSpecials?.find((s: any) => s.name === songName);
      if (matchedSpecial?.value) {
        return {
          value: matchedSpecial.value.currentScore,
          string: matchedSpecial.value.string
        };
      }
      return null;
    },
    calculateDuration: (character: ICharacter) => {
      const bardData = character.spellCasting.GetSpellCasterClassData('Bard');
      if (spellMeta && bardData) {
        return spellMeta.calculateDuration(bardData);
      }
      return 1;
    },
    onUse: (character, docId, actionName, _targets, helpers) => {
      const songResource = character.actionCategoryResources?.['songs'];
      if (songResource && songResource.remaining <= 0) {
        return { error: 'No Bardic Music uses remaining' };
      }

      const decrementResult = helpers.adapter.DecrementSpontaneousSlots(docId, 'Bard', 'songs');
      if (decrementResult && decrementResult.success === false) {
        return { error: decrementResult.error || 'Failed to consume Bardic Music use' };
      }

      let resolvedStatusName = actionName;
      const bardCasterData = character.spellCasting.GetSpellCasterClassData('Bard');
      if (bardCasterData && bardCasterData.bardicSpecials) {
        const matchedSpecial = bardCasterData.bardicSpecials.find((s: any) => s.name === actionName);
        if (matchedSpecial && matchedSpecial.value) {
          const modifierVal = matchedSpecial.value.currentScore;
          if (modifierVal) {
            resolvedStatusName = `${actionName} +${modifierVal}`;
          }
          if (actionName === 'Inspire Courage' && character.HasStatus('Inspirational Boost')) {
            helpers.removeStatus('Inspirational Boost');
          }
        }
      }

      return { statusName: resolvedStatusName };
    }
  };
}

registerActionCategory('songs', 'Songs');
const bardSongActions: Record<string, ActionData> = {};
ALL_BARD_SONGS.forEach(songName => {
  bardSongActions[songName] = createBardSongAction(songName);
});
registerActions(bardSongActions);

ClassesData.set('Bard', Bard);

