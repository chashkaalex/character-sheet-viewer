import { ClassesData } from '../classes_data/_classes_general_data';
import { ModifiableProperty } from './00_property';
import { Ability } from './properties/abilities/ability';
import { registerStatusEffects } from './_general_effects';
import { EffectData, StaticPropertyEffect } from './state/effects';
import { ParsedLevelSpellSlots, BardicSpecial, KnownSpellEntry, SpellSlotData, CharacterSpellSlots } from './common_types';
import { ICharacter } from './icharacter';
import { SpellCastingData } from '../classes_data/class_types';
import type { DomainNames } from '../classes_data/cleric';

const ROUNDS = 1;
const ROUNDS_PER_MINUTE = 10;

export type CalculateDurationFunction = (spellCasterClassData: SpellCasterClassData) => number;

export interface SpellData {
  calculateDuration: CalculateDurationFunction;
  effects?: EffectData[];
  statusName?: string;
}

const SpellsData: Record<string, SpellData> = {
  'Guidance': {
    effects: [
      { status: 'Guidance', property: 'expendable_action', modifierType: 'Competence', value: 1 }
    ],
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Resistance': {
    effects: [
      { status: 'Resistance', property: 'Fort', modifierType: 'Resistance', value: 1 },
      { status: 'Resistance', property: 'Ref', modifierType: 'Resistance', value: 1 },
      { status: 'Resistance', property: 'Will', modifierType: 'Resistance', value: 1 }
    ],
    calculateDuration: function (_spellCasting) {
      return 1 * ROUNDS_PER_MINUTE;
    }
  },
  'Detect Magic': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },
  'Light': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * 10 * ROUNDS_PER_MINUTE;
    }
  },
  'Mending': {
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Resurgence': {
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Shield of Faith': {
    effects: [
      {
        status: 'Shield of Faith',
        property: 'ac',
        modifierType: 'Deflection',
        valueResolver: (character: ICharacter) => {
          const clericData = character.spellCasting.GetSpellCasterClassData('Cleric');
          const level = clericData ? clericData.level.currentScore : 1;
          return Math.min(5, 2 + Math.floor(level / 6));
        }
      }
    ],
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },
  'Doom': {
    statusName: 'Shaken',
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },
  'Lesser Restoration': {
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Invisibility Purge': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },
  'Divine Favor': {
    calculateDuration: function (_spellCasterClassData) {
      return 1 * ROUNDS_PER_MINUTE;
    }
  },
  'Bless': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },
  'Enlarge Person': {
    effects: [
      { status: 'Enlarge Person', property: 'size', modifierType: 'Size', value: 1 },
      { status: 'Enlarge Person', property: 'Str', modifierType: 'Size', value: 2 },
      {
        status: 'Enlarge Person',
        property: 'Dex',
        modifierType: 'Size',
        valueResolver: (character: ICharacter) => {
          const updated = character.abilities.Dex.score - 2;
          if (updated < 1) {
            return 1 - character.abilities.Dex.score;
          }
          return -2;
        }
      }
    ],
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },
  'Feat of Strength': {
    effects: [
      {
        status: 'Feat of Strength',
        property: 'Str',
        modifierType: 'Enhancement',
        valueResolver: (character: ICharacter) => {
          const clericLevel = character.GetClassLevel('Cleric');
          const sfLevel = character.GetClassLevel('Sacred Fist');
          return clericLevel + Math.floor(sfLevel / 2);
        }
      }
    ],
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Bull\'s Strength': {
    effects: [
      { status: 'Bull\'s Strength', property: 'Str', modifierType: 'Enhancement', value: 4 }
    ],
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },
  'Mage Armor': {
    effects: [
      { status: 'Mage Armor', property: 'ac', modifierType: 'Armor', value: 4 }
    ],
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE * 60;
    }
  },
  'Prayer': {
    effects: [
      {
        status: 'Prayer',
        callback: (character: ICharacter) => {
          const bonus = 1;
          const modifierType = 'Luck';
          const status = 'Prayer';

          // Attack (bab), saves (Fort, Ref, Will), weapon damage (damageBonus)
          const targetProps = ['bab', 'damageBonus', 'Fort', 'Ref', 'Will'];
          targetProps.forEach(propName => {
            const prop = character.GetNamedProperty(propName);
            if (prop) {
              prop.applyEffect(new StaticPropertyEffect({
                status,
                property: propName,
                value: bonus,
                modifierType
              }));
            }
          });

          // All skills
          character.skills.forEach(skill => {
            skill.applyEffect(new StaticPropertyEffect({
              status,
              property: skill.name,
              value: bonus,
              modifierType
            }));
          });
        }
      }
    ],
    calculateDuration: function (spellCasting) {
      return spellCasting.level.currentScore * ROUNDS;
    }
  },
  'Haste': {
    effects: [
      {
        status: 'Haste',
        property: 'speed',
        modifierType: 'Generic',
        valueResolver: (character: ICharacter) => Math.min(30, character.speed.score)
      },
      { status: 'Haste', property: 'bab', modifierType: 'Generic', value: 1 },
      { status: 'Haste', property: 'ac', modifierType: 'Dodge', value: 1 },
      { status: 'Haste', property: 'Ref', modifierType: 'Dodge', value: 1 }
    ],
    calculateDuration: function (spellCasting) {
      return spellCasting.level.currentScore * ROUNDS;
    }
  },
  'Inspire Courage': {
    calculateDuration: function (_spellCasting) {
      return -1;
    }
  },
  'Fascinate': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS;
    }
  },
  'Suggestion': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE * 60; // 1 hr/level
    }
  },
  'Inspire Competence': {
    calculateDuration: function (_spellCasting) {
      return 20; // Up to 2 minutes
    }
  },
  'Inspire Greatness': {
    calculateDuration: function (_spellCasting) {
      return 5; // 5 rounds after stop
    }
  },
  'Inspire Heroics': {
    calculateDuration: function (_spellCasting) {
      return 5; // 5 rounds after stop
    }
  },
  'Dancing Lights': {
    calculateDuration: function (_spellCasting) {
      return 1 * ROUNDS_PER_MINUTE;
    }
  },
  'Ghost Sound': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS;
    }
  },
  'Message': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * 10 * ROUNDS_PER_MINUTE;
    }
  },
  'Prestidigitation': {
    calculateDuration: function (_spellCasting) {
      return 1 * ROUNDS_PER_MINUTE * 60;
    }
  },
  'Cure Light Wounds': {
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Grease': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS;
    }
  },
  'Hideous Laughter': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS;
    }
  },
  'Silent Image': {
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Instant of Power': {
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Inspirational Boost': {
    effects: [
      { status: 'Inspirational Boost', property: 'Inspire Courage', modifierType: 'Generic', value: 1 }
    ],
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Command': {
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Glitterdust': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS;
    }
  },
  'Cure Moderate Wounds': {
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Tongues': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * 10 * ROUNDS_PER_MINUTE;
    }
  },
  'Zone of Truth': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },
  'Cure Serious Wounds': {
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Glibness': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * 10 * ROUNDS_PER_MINUTE;
    }
  },
  'Hesitate': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS;
    }
  },
  'Drums of War': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS;
    }
  },
  'Sending': {
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Mirror Image, Greater': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },
  'Lingering Chorus': {
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS;
    }
  },
  'Mislead': {
    statusName: 'Invisible',
    calculateDuration: function (spellCasterClassData) {
      return spellCasterClassData.level.currentScore * ROUNDS;
    }
  }
};

// Register effects
const spellsEffectsForRegistration: Record<string, EffectData[]> = {};
Object.keys(SpellsData).forEach(spellName => {
  if (SpellsData[spellName].effects) {
    spellsEffectsForRegistration[spellName] = SpellsData[spellName].effects!;
  }
});
registerStatusEffects(spellsEffectsForRegistration);

class SpellCasterClassData {
  public className: string;
  public level: ModifiableProperty;
  public ability: Ability | null;
  public domains: DomainNames[] | null;
  public spellSlots: number[];
  public knownSpells: Record<string, KnownSpellEntry[]>;
  public preparedSpells: ParsedLevelSpellSlots;
  public bardicSpecials?: BardicSpecial[];
  private specialPropsHandler?: (character: ICharacter, runtimeData: SpellCasterClassData) => void;

  constructor(className: string, level: number, ability: Ability | null, config?: SpellCastingData) {
    this.className = className;
    this.level = new ModifiableProperty(level, 'casterLevel ' + className);
    this.ability = ability;
    this.domains = null;
    this.spellSlots = [];
    this.knownSpells = {};
    this.preparedSpells = {};
    this.specialPropsHandler = config?.AddSpecialProperties;
  }

  public AddSpecialProperties(character: ICharacter): void {
    if (this.specialPropsHandler) {
      this.specialPropsHandler(character, this);
    }
  }
}

class SpellCasting {
  public classSpellCastingData: Map<string, SpellCasterClassData>;

  constructor() {
    this.classSpellCastingData = new Map();
  }

  public isActive(): boolean {
    return this.classSpellCastingData.size > 0;
  }

  public GetSpellCasterClassData(className: string): SpellCasterClassData | null {
    return this.classSpellCastingData.get(className) || null;
  }

  public GetCasterLevel(className: string): ModifiableProperty {
    const data = this.classSpellCastingData.get(className);
    if (!data) {
      throw new Error(`Could not find class data for ${className} when trying to get its caster level.`);
    }
    return data.level;
  }

  public AddSpellCasterClass(className: string, level: number, ability: Ability, config?: SpellCastingData): void {
    const existing = this.classSpellCastingData.get(className);
    if (existing) {
      existing.level.applyPermanentEffect(level);
    } else {
      this.classSpellCastingData.set(className, new SpellCasterClassData(className, level, ability, config));
    }
  }

  public IsSpellPrepared(className: string, spellName: string, level: string): boolean {
    const spellCasterClassData = this.GetSpellCasterClassData(className);
    if (!spellCasterClassData) {
      return false;
    }
    const levelSpells = spellCasterClassData.preparedSpells[level];
    if (levelSpells) {
      return levelSpells.some(spellData => spellData.spellName === spellName && !spellData.isUsed);
    }
    return false;
  }

  public get state(): any {
    return {
      classSpellCastingData: Array.from(this.classSpellCastingData.entries())
        .map(([className, casterClassData]) => ({
          className: className,
          level: casterClassData.level.currentScore,
          domains: casterClassData.domains,
          spellSlots: casterClassData.spellSlots,
          knownSpells: casterClassData.knownSpells,
          preparedSpells: Object.fromEntries(
            Object.entries(casterClassData.preparedSpells).map(([level, spells]) => [
              level,
              spells.map(({ spellName, isUsed, isEmpty, isValid }) => ({ spell: spellName, used: isUsed, isEmpty, isValid }))
            ])
          ),
          preparation: ClassesData.get(className)?.spellCastingData?.preparation || 'Prepared'
        }))
    };
  }

  public updateSpellsData(character: ICharacter): void {
    this.classSpellCastingData.forEach((casterClassData, casterClassName) => {
      const classData = ClassesData.get(casterClassName);
      if (!classData || !classData.spellCastingData) return;

      const classSpellcastingData = classData.spellCastingData;
      const baseSlots = classSpellcastingData.spellSlots[casterClassData.level.score];
      if (!baseSlots) return;

      casterClassData.spellSlots = [...baseSlots];
      const bonusSpells = casterClassData.ability ? getBonusSpells(casterClassData.ability.modifier) : new Array(10).fill(0);

      casterClassData.spellSlots.forEach((_spellSlot, index) => {
        const isUnlocked = baseSlots[index] > 0 || (
          classSpellcastingData.spellsKnown &&
          classSpellcastingData.spellsKnown[casterClassData.level.score] &&
          classSpellcastingData.spellsKnown[casterClassData.level.score][index] > 0
        );
        if (isUnlocked) {
          casterClassData.spellSlots[index] += bonusSpells[index];
        }
      });

      let maxSpellLevel = -1;
      for (let i = casterClassData.spellSlots.length - 1; i >= 0; i--) {
        if (casterClassData.spellSlots[i] > 0) {
          maxSpellLevel = i;
          break;
        }
      }
      casterClassData.knownSpells = classSpellcastingData.getKnownSpells ? classSpellcastingData.getKnownSpells(character, maxSpellLevel, casterClassData.domains || []) : {};
    });
  }

  public updatePreparedSpells(preparedSpells: Record<string, Record<string, SpellSlotData[]>>, character: Readonly<ICharacter>): void {
    this.classSpellCastingData.forEach((casterClassData, casterClassName) => {
      const classPrepared = preparedSpells[casterClassName];
      if (classPrepared) {
        const updatedLevelSlots: Record<string, SpellSlotData[]> = {};
        Object.entries(classPrepared).forEach(([levelName, slots]) => {
          const levelNum = parseInt(levelName) || 0;
          updatedLevelSlots[levelName] = slots.map(slot => {
            if (slot.isEmpty) {
              return { ...slot, isValid: true };
            }
            const { extractedName, isValid } = ExtractAndValidateSpell(
              casterClassName,
              levelNum,
              levelName,
              slot.spellName,
              casterClassData.domains || []
            );
            return {
              ...slot,
              spellName: extractedName,
              isValid: isValid
            };
          });
        });
        casterClassData.preparedSpells = updatedLevelSlots as any;
      }
    });
  }
}

function getBonusSpells(modifier: number): number[] {
  const bonusSpells = new Array(10).fill(0);
  if (modifier > 0) {
    for (let level = 1; level < 10; level++) {
      if (modifier >= level) {
        const effectiveModifier = modifier - level;
        bonusSpells[level] = Math.floor(effectiveModifier / 4) + 1;
      }
    }
  }
  return bonusSpells;
}

function normalizeQuotes(str: string): string {
  return str.replace(/[\u2018\u2019]/g, '\'').replace(/[\u201C\u201D]/g, '"');
}

export function ExtractAndValidateSpell(
  casterClassName: string,
  spellLevel: number,
  spellLevelName: string,
  spellLineText: string,
  domains: string[]
): { extractedName: string; isValid: boolean } {
  if (typeof spellLineText !== 'string') {
    return { extractedName: '', isValid: false };
  }
  const cleanLine = spellLineText.trim();
  if (cleanLine === '') {
    return { extractedName: '', isValid: true };
  }

  const classData = ClassesData.get(casterClassName);
  const hasStaticSpells = classData && classData.spellCastingData && classData.spellCastingData.spells && Object.keys(classData.spellCastingData.spells).length > 0;

  let candidateSpells: string[] = [];

  if (hasStaticSpells) {
    // Prepared caster: must be in the class static list/domains AND exist in SpellsData
    const casterClassSpells = classData!.spellCastingData!.spells!;
    const correctSpells: string[] = [];
    if (spellLevelName.includes('domain')) {
      domains.forEach(domain => {
        if (classData!.domainsData && classData!.domainsData[domain]) {
          correctSpells.push(...classData!.domainsData[domain].spells.slice(0, spellLevel));
        }
      });
    } else {
      for (let level = 0; level <= spellLevel; level++) {
        if (casterClassSpells[level]) {
          correctSpells.push(...casterClassSpells[level]);
        }
      }
    }
    candidateSpells = correctSpells.map(spell => {
      const normalizedSpell = normalizeQuotes(spell).toLowerCase();
      const dbKey = Object.keys(SpellsData).find(key => normalizeQuotes(key).toLowerCase() === normalizedSpell);
      return dbKey || '';
    }).filter(key => key !== '');
  } else {
    // Spontaneous caster: candidates are all implemented database spells
    candidateSpells = Object.keys(SpellsData);
  }

  // Sort candidates by length descending
  const sortedCandidates = [...candidateSpells].sort((a, b) => b.length - a.length);

  const normalizedLine = normalizeQuotes(cleanLine).toLowerCase();

  for (const candidate of sortedCandidates) {
    const normalizedCandidate = normalizeQuotes(candidate).toLowerCase();
    if (normalizedLine.startsWith(normalizedCandidate)) {
      const matchLength = candidate.length;
      if (cleanLine.length === matchLength || !/[a-zA-Z0-9]/.test(cleanLine.charAt(matchLength))) {
        return { extractedName: candidate, isValid: true };
      }
    }
  }

  // Keep the original string as the name, but mark it invalid
  return { extractedName: cleanLine, isValid: false };
}

export { SpellsData, SpellCasterClassData, SpellCasting };
