import { ParsePreparedSlotsDivine } from '../character/parsers/prepared_spells';
import { ClassesData } from './_classes_general_data';
import { ClassData, createClassData } from './class_types';
import { GetLineThatContainsOneOfTheseTokens, GetParenthesesContent } from '../character/parser_utils';
import { ICharacter } from '../character/icharacter';
import { ExtractAndValidateSpell } from '../character/spells';
import { KnownSpellEntry } from '../character/common_types';

export type DomainNames =
  | 'Air'
  | 'Animal'
  | 'Chaos'
  | 'Death'
  | 'Destruction'
  | 'Earth'
  | 'Evil'
  | 'Fire'
  | 'Good'
  | 'Healing'
  | 'Knowledge'
  | 'Law'
  | 'Luck'
  | 'Magic'
  | 'Plant'
  | 'Protection'
  | 'Strength'
  | 'Sun'
  | 'Travel'
  | 'Trickery'
  | 'War'
  | 'Water';

const clericDomainsData: Record<DomainNames, { spells: string[]; action?: string }> = {
  Air: {
    spells: [
      'Obscuring Mist',
      'Wind Wall',
      'Gaseous Form',
      'Air Walk',
      'Control Winds',
      'Chain Lightning',
      'Control Weather',
      'Whirlwind',
      'Elemental Swarm'
    ]
  },
  Animal: {
    spells: [
      'Calm Animals',
      'Hold Animal',
      'Dominate Animal',
      'Summon Nature\'s Ally IV',
      'Commune with Nature',
      'Antilife Shell',
      'Animal Shapes',
      'Summon Nature\'s Ally VIII',
      'Shapechange'
    ]
  },
  Chaos: {
    spells: [
      'Protection from Law',
      'Shatter',
      'Magic Circle against Law',
      'Chaos Hammer',
      'Dispel Law',
      'Animate Objects',
      'Word of Chaos',
      'Cloak of Chaos',
      'Summon Monster IX'
    ]
  },
  Death: {
    spells: [
      'Cause Fear',
      'Death Knell',
      'Animate Dead',
      'Death Ward',
      'Slay Living',
      'Create Undead',
      'Destruction',
      'Create Greater Undead',
      'Wail of the Banshee'
    ]
  },
  Destruction: {
    spells: [
      'Inflict Light Wounds',
      'Shatter',
      'Contagion',
      'Inflict Critical Wounds',
      'Inflict Light Wounds, Mass',
      'Harm',
      'Disintegrate',
      'Earthquake',
      'Implosion'
    ]
  },
  Earth: {
    spells: [
      'Magic Stone',
      'Soften Earth and Stone',
      'Stone Shape',
      'Spike Stones',
      'Wall of Stone',
      'Stoneskin',
      'Earthquake',
      'Iron Body',
      'Elemental Swarm'
    ]
  },
  Evil: {
    spells: [
      'Protection from Good',
      'Desecrate',
      'Magic Circle against Good',
      'Unholy Blight',
      'Dispel Good',
      'Create Undead',
      'Blasphemy',
      'Unholy Aura',
      'Summon Monster IX'
    ]
  },
  Fire: {
    spells: [
      'Burning Hands',
      'Produce Flame',
      'Resist Energy',
      'Wall of Fire',
      'Fire Shield',
      'Fire Seeds',
      'Fire Storm',
      'Incendiary Cloud',
      'Elemental Swarm'
    ]
  },
  Good: {
    spells: [
      'Protection from Evil',
      'Aid',
      'Magic Circle against Evil',
      'Holy Smite',
      'Dispel Evil',
      'Blade Barrier',
      'Holy Word',
      'Holy Aura',
      'Summon Monster IX'
    ]
  },
  Healing: {
    spells: [
      'Cure Light Wounds',
      'Cure Moderate Wounds',
      'Cure Serious Wounds',
      'Cure Critical Wounds',
      'Cure Light Wounds, Mass',
      'Heal',
      'Regenerate',
      'Cure Critical Wounds, Mass',
      'Heal, Mass'
    ]
  },
  Knowledge: {
    spells: [
      'Detect Secret Doors',
      'Detect Thoughts',
      'Clairaudience/Clairvoyance',
      'Divination',
      'True Seeing',
      'Find the Path',
      'Legend Lore',
      'Discern Location',
      'Foresight'
    ]
  },
  Law: {
    spells: [
      'Protection from Chaos',
      'Calm Emotions',
      'Magic Circle against Chaos',
      'Order\'s Wrath',
      'Dispel Chaos',
      'Hold Monster',
      'Dictum',
      'Shield of Law',
      'Summon Monster IX'
    ]
  },
  Luck: {
    spells: [
      'Entropic Shield',
      'Aid',
      'Protection from Energy',
      'Freedom of Movement',
      'Break Enchantment',
      'Mislead',
      'Spell Turning',
      'Moment of Prescience',
      'Miracle'
    ]
  },
  Magic: {
    spells: [
      'Magic Aura',
      'Identify',
      'Dispel Magic',
      'Imbue with Spell Ability',
      'Spell Resistance',
      'Antimagic Field',
      'Spell Turning',
      'Protection from Spells',
      'Mordenkainen\'s Disjunction'
    ]
  },
  Plant: {
    spells: [
      'Entangle',
      'Barkskin',
      'Plant Growth',
      'Command Plants',
      'Wall of Thorns',
      'Repel Wood',
      'Animate Plants',
      'Control Plants',
      'Shambler'
    ]
  },
  Protection: {
    spells: [
      'Sanctuary',
      'Shield Other',
      'Protection from Energy',
      'Spell Immunity',
      'Spell Resistance',
      'Antimagic Field',
      'Repulsion',
      'Mind Blank',
      'Prismatic Sphere'
    ],
    action: 'Protective Ward'
  },
  Strength: {
    spells: [
      'Enlarge Person',
      'Bull\'s Strength',
      'Magic Vestment',
      'Spell Immunity',
      'Righteous Might',
      'Stoneskin',
      'Grasping Hand',
      'Clenched Fist',
      'Crushing Hand'
    ],
    action: 'Feat of Strength'
  },
  Sun: {
    spells: [
      'Endure Elements',
      'Heat Metal',
      'Searing Light',
      'Fire Shield',
      'Flame Strike',
      'Fire Seeds',
      'Sunbeam',
      'Sunburst',
      'Prismatic Sphere'
    ]
  },
  Travel: {
    spells: [
      'Longstrider',
      'Locate Object',
      'Fly',
      'Dimension Door',
      'Teleport',
      'Find the Path',
      'Teleport, Greater',
      'Phase Door',
      'Astral Projection'
    ]
  },
  Trickery: {
    spells: [
      'Disguise Self',
      'Invisibility',
      'Nondetection',
      'Confusion',
      'False Vision',
      'Mislead',
      'Screen',
      'Polymorph Any Object',
      'Time Stop'
    ]
  },
  War: {
    spells: [
      'Magic Weapon',
      'Spiritual Weapon',
      'Magic Vestment',
      'Divine Power',
      'Flame Strike',
      'Blade Barrier',
      'Power Word Blind',
      'Power Word Stun',
      'Power Word Kill'
    ]
  },
  Water: {
    spells: [
      'Obscuring Mist',
      'Fog Cloud',
      'Water Breathing',
      'Control Water',
      'Ice Storm',
      'Cone of Cold',
      'Acid Fog',
      'Horrid Wilting',
      'Elemental Swarm'
    ]
  }
};


export const Cleric: ClassData = createClassData({
  name: 'Cleric',
  HD: '1d8',
  skills: [
    'Concentration',
    'Craft',
    'Diplomacy',
    'Heal',
    'Knowledge',
    'Knowledge (arcana)',
    'Knowledge (history)',
    'Knowledge (religion)',
    'Knowledge (the planes)',
    'Profession',
    'Spellcraft'
  ],
  acAbilityName: 'Dex',
  levelTable: [
    /*level: 0*/ { bab: 0, Fort: 0, Ref: 0, Will: 0 },
    /*level: 1*/ { bab: 0, Fort: 2, Ref: 0, Will: 2 },
    /*level: 2*/ { bab: 1, Fort: 3, Ref: 0, Will: 3 },
    /*level: 3*/ { bab: 2, Fort: 3, Ref: 1, Will: 3 },
    /*level: 4*/ { bab: 3, Fort: 4, Ref: 1, Will: 4 },
    /*level: 5*/ { bab: 3, Fort: 4, Ref: 1, Will: 4 },
    /*level: 6*/ { bab: 4, Fort: 5, Ref: 2, Will: 5 },
    /*level: 7*/ { bab: 5, Fort: 5, Ref: 2, Will: 5 },
    /*level: 8*/ { bab: 6, Fort: 6, Ref: 2, Will: 6 },
    /*level: 9*/ { bab: 6, Fort: 6, Ref: 3, Will: 6 },
    /*level: 10*/{ bab: 7, Fort: 7, Ref: 3, Will: 7 },
    /*level: 11*/{ bab: 8, Fort: 7, Ref: 3, Will: 7 },
    /*level: 12*/{ bab: 9, Fort: 8, Ref: 4, Will: 8 },
    /*level: 13*/{ bab: 9, Fort: 8, Ref: 4, Will: 8 },
    /*level: 14*/{ bab: 10, Fort: 9, Ref: 4, Will: 9 },
    /*level: 15*/{ bab: 11, Fort: 9, Ref: 5, Will: 9 },
    /*level: 16*/{ bab: 12, Fort: 10, Ref: 5, Will: 10 },
    /*level: 17*/{ bab: 12, Fort: 10, Ref: 5, Will: 10 },
    /*level: 18*/{ bab: 13, Fort: 11, Ref: 6, Will: 11 },
    /*level: 19*/{ bab: 14, Fort: 11, Ref: 6, Will: 11 },
    /*level: 20*/{ bab: 15, Fort: 12, Ref: 6, Will: 12 }
  ],
  domainsData: clericDomainsData,
  spellCastingData: {
    casterClass: 'Cleric',
    type: 'Divine',
    preparation: 'In Advance',
    bonusSpellAbility: 'Wis',
    AddSpecialProperties: (character: ICharacter, runtimeData: any) => {
      const domainsLines = character.sectionLines['Domains'];
      let domainLine = '';
      if (domainsLines && domainsLines.length > 0) {
        domainLine = domainsLines.join(' ');
      } else {
        // Fallback to searching the whole document (legacy behavior)
        domainLine = GetLineThatContainsOneOfTheseTokens(character.lines, ['Domain', 'domains']) || '';
      }

      if (domainLine) {
        const parsedDomains = GetParenthesesContent(domainLine).split(',').map(domain => domain.trim());
        const validDomains = parsedDomains.filter(d => clericDomainsData[d as keyof typeof clericDomainsData]) as DomainNames[];
        runtimeData.domains = validDomains;
      } else {
        character.LogParseError('No domains found for Cleric class');
        character.parseSuccess = false;
      }

      if (!character.actions.includes('Turn Undead')) {
        character.actions.push('Turn Undead');
      }

      if (runtimeData.domains) {
        runtimeData.domains.forEach((domain: DomainNames) => {
          const domainInfo = clericDomainsData[domain];
          if (domainInfo && domainInfo.action) {
            if (!character.actions.includes(domainInfo.action)) {
              character.actions.push(domainInfo.action);
            }
          }
        });
      }
    },

    spellSlots: [
      //lvl: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], //nothing on level 0
      [3, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
      [4, 2, 1, 0, 0, 0, 0, 0, 0, 0],
      [5, 3, 2, 0, 0, 0, 0, 0, 0, 0],
      [5, 3, 2, 1, 0, 0, 0, 0, 0, 0],
      [5, 3, 3, 2, 0, 0, 0, 0, 0, 0],
      [6, 4, 3, 2, 1, 0, 0, 0, 0, 0],
      [6, 4, 3, 3, 2, 0, 0, 0, 0, 0],
      [6, 4, 4, 3, 2, 1, 0, 0, 0, 0],
      [6, 4, 4, 3, 3, 2, 0, 0, 0, 0],
      [6, 5, 4, 4, 3, 2, 1, 0, 0, 0],
      [6, 5, 4, 4, 3, 3, 2, 0, 0, 0],
      [6, 5, 5, 4, 4, 3, 2, 1, 0, 0],
      [6, 5, 5, 4, 4, 3, 3, 2, 0, 0],
      [6, 5, 5, 5, 4, 4, 3, 2, 1, 0],
      [6, 5, 5, 5, 4, 4, 3, 3, 2, 0],
      [6, 5, 5, 5, 5, 4, 4, 3, 2, 1],
      [6, 5, 5, 5, 5, 4, 4, 3, 3, 2],
      [6, 5, 5, 5, 5, 5, 4, 4, 3, 3],
      [6, 5, 5, 5, 5, 5, 4, 4, 4, 4]
    ],
    spells: {
      0: [
        'Create Water',
        'Cure Minor Wounds',
        'Detect Magic',
        'Detect Poison',
        'Guidance',
        'Inflict Minor Wounds',
        'Light',
        'Mending',
        'Purify Food and Drink',
        'Read Magic',
        'Resistance',
        'Virtue'
      ],
      1: [
        'Bane',
        'Bless',
        'Bless Water',
        'Cause Fear',
        'Command',
        'Comprehend Languages',
        'Cure Light Wounds',
        'Curse Water',
        'Deathwatch',
        'Detect Chaos/Evil/Good/Law',
        'Detect Undead',
        'Divine Favor',
        'Doom',
        'Endure Elements',
        'Entropic Shield',
        'Hide from Undead',
        'Inflict Light Wounds',
        'Magic Stone',
        'Magic Weapon',
        'Obscuring Mist',
        'Protection from Chaos/Evil/Good/Law',
        'Ray of Hope',
        'Remove Fear',
        'Resurgence',
        'Sanctuary',
        'Shield of Faith',
        'Summon Monster I'
      ],
      2: [
        'Aid',
        'Align Weapon',
        'Augury',
        'Bear\'s Endurance',
        'Bull\'s Strength',
        'Calm Emotions',
        'Consecrate',
        'Cure Moderate Wounds',
        'Darkness',
        'Death Knell',
        'Delay Poison',
        'Desecrate',
        'Eagle\'s Splendor',
        'Enthrall',
        'Find Traps',
        'Gentle Repose',
        'Hold Person',
        'Inflict Moderate Wounds',
        'Make Whole',
        'Owl\'s Wisdom',
        'Remove Paralysis',
        'Resist Energy',
        'Lesser Restoration',
        'Share Talents',
        'Shatter',
        'Shield Other',
        'Silence',
        'Sound Burst',
        'Spiritual Weapon',
        'Status',
        'Summon Monster II',
        'Undetectable Alignment',
        'Zone of Truth'
      ],
      3: [
        'Animate Dead',
        'Bestow Curse',
        'Blindness/Deafness',
        'Contagion',
        'Continual Flame',
        'Create Food and Water',
        'Cure Serious Wounds',
        'Daylight',
        'Deeper Darkness',
        'Dispel Magic',
        'Glyph of Warding',
        'Helping Hand',
        'Inflict Serious Wounds',
        'Invisibility Purge',
        'Locate Object',
        'Magic Circle against Chaos/Evil/Good/Law',
        'Magic Vestment',
        'Meld into Stone',
        'Obscure Object',
        'Prayer',
        'Protection from Energy',
        'Remove Blindness/Deafness',
        'Remove Curse',
        'Remove Disease',
        'Searing Light',
        'Speak with Dead',
        'Stone Shape',
        'Summon Monster III',
        'Water Breathing',
        'Water Walk',
        'Wind Wall'
      ],
      4: [
        'Air Walk',
        'Control Water',
        'Cure Critical Wounds',
        'Death Ward',
        'Dimensional Anchor',
        'Discern Lies',
        'Dismissal',
        'Divination',
        'Divine Power',
        'Freedom of Movement',
        'Giant Vermin',
        'Imbue with Spell Ability',
        'Inflict Critical Wounds',
        'Magic Weapon, Greater',
        'Neutralize Poison',
        'Planar Ally, Lesser',
        'Poison',
        'Repel Vermin',
        'Restoration',
        'Sending',
        'Spell Immunity',
        'Summon Monster IV',
        'Tongues'
      ],
      5: [
        'Atonement',
        'Break Enchantment',
        'Command, Greater',
        'Commune',
        'Cure Light Wounds, Mass',
        'Dispel Chaos/Evil/Good/Law',
        'Disrupting Weapon',
        'Flame Strike',
        'Hallow',
        'Inflict Light Wounds, Mass',
        'Insect Plague',
        'Mark of Justice',
        'Plane Shift',
        'Raise Dead',
        'Righteous Might',
        'Scrying',
        'Slay Living',
        'Spell Resistance',
        'Summon Monster V',
        'Symbol of Pain',
        'Symbol of Sleep',
        'True Seeing',
        'Unhallow',
        'Wall of Stone'
      ],
      6: [
        'Animate Objects',
        'Antilife Shell',
        'Banishment',
        'Bear\'s Endurance, Mass',
        'Blade Barrier',
        'Bull\'s Strength, Mass',
        'Create Undead',
        'Cure Moderate Wounds, Mass',
        'Dispel Magic, Greater',
        'Eagle\'s Splendor, Mass',
        'Find the Path',
        'Forbiddance',
        'Geas/Quest',
        'Glyph of Warding, Greater',
        'Harm',
        'Heal',
        'Heroes\' Feast',
        'Inflict Moderate Wounds, Mass',
        'Owl\'s Wisdom, Mass',
        'Planar Ally',
        'Summon Monster VI',
        'Symbol of Fear',
        'Symbol of Persuasion',
        'Undeath to Death',
        'Wind Walk',
        'Word of Recall'
      ],
      7: [
        'Blasphemy',
        'Control Weather',
        'Cure Serious Wounds, Mass',
        'Destruction',
        'Dictum',
        'Ethereal Jaunt',
        'Holy Word',
        'Inflict Serious Wounds, Mass',
        'Refuge',
        'Regenerate',
        'Repulsion',
        'Restoration, Greater',
        'Resurrection',
        'Scrying, Greater',
        'Summon Monster VII',
        'Symbol of Stunning',
        'Symbol of Weakness',
        'Word of Chaos'
      ],
      8: [
        'Antimagic Field',
        'Cloak of Chaos',
        'Create Greater Undead',
        'Cure Critical Wounds, Mass',
        'Dimensional Lock',
        'Discern Location',
        'Earthquake',
        'Fire Storm',
        'Holy Aura',
        'Planar Ally, Greater',
        'Inflict Critical Wounds, Mass',
        'Shield of Law',
        'Spell Immunity, Greater',
        'Summon Monster VIII',
        'Symbol of Death',
        'Symbol of Insanity',
        'Unholy Aura'
      ],
      9: [
        'Astral Projection',
        'Energy Drain',
        'Etherealness',
        'Gate',
        'Heal, Mass',
        'Implosion',
        'Miracle',
        'Soul Bind',
        'Storm of Vengeance',
        'Summon Monster IX',
        'True Resurrection'
      ]
    },
    getKnownSpells(character: Readonly<ICharacter>, maxLevel: number, domains?: string[]) {
      const knownSpells: Record<string, KnownSpellEntry[]> = {};
      for (let level = 0; level <= maxLevel; level++) {
        const levelName = String(level);
        knownSpells[levelName] = ((this.spells as any)[level] || []).map((spellName: string) => {
          const { extractedName, isValid } = ExtractAndValidateSpell('Cleric', level, levelName, spellName, domains || []);
          return { spellName: extractedName, isValid };
        });
      }
      if (domains) {
        for (let domainSpellLevel = 1; domainSpellLevel <= maxLevel; domainSpellLevel++) {
          const domainLevelName = domainSpellLevel + ' - domain';
          knownSpells[domainLevelName] = [];
          for (const domain of domains) {
            const domainList = clericDomainsData[domain as keyof typeof clericDomainsData]?.spells;
            if (domainList) {
              const domainSpell = domainList[domainSpellLevel - 1];
              if (domainSpell) {
                const { extractedName, isValid } = ExtractAndValidateSpell('Cleric', domainSpellLevel, domainLevelName, domainSpell, domains || []);
                knownSpells[domainLevelName].push({ spellName: extractedName, isValid });
              }
            }
          }
        }
      }
      return knownSpells;
    },
    ParsePreparedSpellsMethod: ParsePreparedSlotsDivine,
    ConsumeSpellSlot: (docId: string, slotData: any, adapter: any) => {
      return adapter.MarkSpellAsCast(
        docId,
        slotData.casterClassName,
        slotData.spellLevel,
        slotData.slotIndex,
        slotData.spellName,
        false
      );
    },
    ReplenishSpellSlots: (docId: string, adapter: any) => {
      return adapter.ReplenishPreparedSpells(docId, 'Cleric');
    }
  }
});

ClassesData.set('Cleric', Cleric);
