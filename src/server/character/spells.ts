import { ClassesData } from '../classes_data/_classes_general_data';
import { ModifiableProperty, Ability } from './property';
import { registerStatusEffects, ApplicableEffectData } from './_general_effects';
import { ParsedLevelSpellSlots } from './common_types';

const ROUNDS = 1;
const ROUNDS_PER_MINUTE = 10;

export type CalculateDurationFunction = (spellCasterClassData: SpellCasterClassData) => number;

export interface SpellData {
  calculateDuration: CalculateDurationFunction;
  effects?: ApplicableEffectData[];
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
  'Enlarge Person': {
    effects: [
      { status: 'Enlarge Person', property: 'size', modifierType: 'Size', value: 1 },
      { status: 'Enlarge Person', property: 'Str', modifierType: 'Ability', value: 2 },
      {
        status: 'Enlarge Person',
        property: 'Dex',
        modifierType: 'Ability',
        value: (character: any) => {
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
        value: (character: any) => {
          const clericLevel = character.spellCasting.classSpellCastingData.get('Cleric').level.currentScore;
          return clericLevel;
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
      { status: 'Prayer', property: 'Will', modifierType: 'Luck', value: 1 },
      { status: 'Prayer', property: 'bab', modifierType: 'Luck', value: 1 },
      { status: 'Prayer', property: 'damageBonus', modifierType: 'Luck', value: 1 }
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
        value: (character: any) => Math.min(30, character.speed.score)
      },
      { status: 'Haste', property: 'bab', modifierType: 'Generic', value: 1 },
      { status: 'Haste', property: 'ac', modifierType: 'Dodge', value: 1 },
      { status: 'Haste', property: 'Ref', modifierType: 'Dodge', value: 1 }
    ],
    calculateDuration: function (_spellCasting) {
      return 1;
    }
  },
  'Inspire Courage': {
    calculateDuration: function (_spellCasting) {
      return 5;
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
  }
};

// Register effects
const spellsEffectsForRegistration: Record<string, ApplicableEffectData[]> = {};
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
  public domains: string[] | null;
  public spellSlots: number[];
  public availableSpells: Record<string, string[]>;
  public preparedSpells: ParsedLevelSpellSlots;

  constructor(className: string, level: number, ability: Ability | null, domains: string[] | null = null) {
    this.className = className;
    this.level = new ModifiableProperty(level);
    this.ability = ability;
    this.domains = domains;
    this.spellSlots = [];
    this.availableSpells = {};
    this.preparedSpells = {};
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

  public GetCasterLevel(className: string): ModifiableProperty | number {
    const data = this.classSpellCastingData.get(className);
    return data ? data.level : 0;
  }

  public addSpellCasterClass(className: string, level: number, ability: Ability, domains: string[] | null = null): void {
    const existing = this.classSpellCastingData.get(className);
    if (existing) {
      existing.level.applyPermanentEffect(level);
    } else {
      this.classSpellCastingData.set(className, new SpellCasterClassData(className, level, ability, domains));
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
          availableSpells: casterClassData.availableSpells,
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

  public updateSpellsData(): void {
    this.classSpellCastingData.forEach((casterClassData, casterClassName) => {
      const classData = ClassesData.get(casterClassName);
      if (!classData || !classData.spellCastingData) return;

      const classSpellcastingData = classData.spellCastingData;
      const baseSlots = classSpellcastingData.spellSlots[casterClassData.level.score];
      if (!baseSlots) return;

      casterClassData.spellSlots = [...baseSlots];
      const bonusSpells = casterClassData.ability ? getBonusSpells(casterClassData.ability.modifier) : new Array(10).fill(0);

      casterClassData.spellSlots.forEach((_spellSlot, index) => {
        if (casterClassData.spellSlots[index] > 0) {
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
      casterClassData.availableSpells = classSpellcastingData.getAvailableSpells ? classSpellcastingData.getAvailableSpells(maxSpellLevel, casterClassData.domains || []) : {};
    });
  }

  public updatePreparedSpells(preparedSpells: Record<string, ParsedLevelSpellSlots>): void {
    this.classSpellCastingData.forEach((casterClassData, casterClassName) => {
      if (preparedSpells[casterClassName]) {
        casterClassData.preparedSpells = preparedSpells[casterClassName];
      }
    });
  }

  public updateKnownSpells(knownSpells: Record<string, ParsedLevelSpellSlots>): void {
    this.classSpellCastingData.forEach((casterClassData, casterClassName) => {
      if (knownSpells[casterClassName]) {
        const flatSpells: Record<string, string[]> = {};
        Object.keys(knownSpells[casterClassName]).forEach(level => {
          flatSpells[level] = knownSpells[casterClassName][level].map(s => s.spellName);
        });
        casterClassData.availableSpells = flatSpells;
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

export { SpellsData, SpellCasterClassData, SpellCasting };

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = {
    SpellCasting,
    SpellsData,
    SpellCasterClassData
  };
}
