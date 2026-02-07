
// Calculate available spell slots based on spellcaster level







const ROUNDS = 1;
const ROUNDS_PER_MINUTE = 10;
/**
 * @typedef {Object} SpellData
 * @property {function(SpellCasterClassData): number} calculateDuration
 */

/**
 * @type {Object.<string, SpellData>}
 */
const SpellsData = {


  'Guidance': {
    effects: [   //TODO: this requires to define an expendable action property in the character class
      { status: 'Guidance', property: 'expendable_action', modifierType: 'Competence', value: 1 }
    ],
    calculateDuration: function (_spellCasting) {
      // TODO: implement duration calculation
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
      // always 1 minute (10 rounds)
      return 1 * ROUNDS_PER_MINUTE;
    }
  },

  'Enlarge Person': {
    effects: [
      { status: 'Enlarge Person', property: 'size', modifierType: 'Size', value: 1 },   //changes the size modifier, hence the attack bonus and ac
      { status: 'Enlarge Person', property: 'Str', modifierType: 'Ability', value: 2 },
      {
        status: 'Enlarge Person',
        property: 'Dex',
        modifierType: 'Ability',
        value: function (character) {
          const updated = character.abilities.Dex.score - 2;
          if (updated < 1) {
            return 1 - character.abilities.Dex.score;
          }
          return -2;
        }
      }
    ],
    calculateDuration: function (spellCasting) {
      // 1 min./level
      return spellCasting.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },

  'Bull\'s Strength': {
    effects: [
      { status: 'Bull\'s Strength', property: 'Str', modifierType: 'Enhancement', value: 4 }
    ],
    calculateDuration: function (spellCasting) {
      // 1 min./level
      return spellCasting.level.currentScore * ROUNDS_PER_MINUTE;
    }
  },

  'Prayer': {
    effects: [
      { status: 'Prayer', property: 'Will', modifierType: 'Luck', value: 1 },
      { status: 'Prayer', property: 'bab', modifierType: 'Luck', value: 1 },
      { status: 'Prayer', property: 'damageBonus', modifierType: 'Luck', value: 1 }
    ],
    calculateDuration: function (spellCasting) {
      // TODO: implement duration calculation
      return spellCasting.level.currentScore * ROUNDS;
    }
  },

  'Haste': {
    effects: [
      {
        status: 'Haste',
        property: 'speed',
        modifierType: 'Generic',
        value: function (character) { return Math.min(30, character.speed.score); }
      },
      { status: 'Haste', property: 'bab', modifierType: 'Generic', value: 1 },
      { status: 'Haste', property: 'ac', modifierType: 'Dodge', value: 1 },
      { status: 'Haste', property: 'Ref', modifierType: 'Dodge', value: 1 }
    ],
    calculateDuration: function (_spellCasting) {
      // TODO: implement duration calculation
      return 1;
    }
  },

  'Inspire Courage +3': {
    effects: [
      {
        status: 'Inspire Courage',
        property: 'Will',
        modifierType: 'Morale',
        value: function (character) { return character.statuses.includes('Frightful Presence') ? 3 : 0; }
      },
      { status: 'Inspire Courage', property: 'bab', modifierType: 'Morale', value: 3 },
      { status: 'Inspire Courage', property: 'damageBonus', modifierType: 'Morale', value: 3 }
    ],
    calculateDuration: function (_spellCasting) {
      // TODO: implement duration calculation
      return 1;
    }
  },
  'Inspire Courage +4': {
    effects: [
      {
        status: 'Inspire Courage',
        property: 'Will',
        modifierType: 'Morale',
        value: function (character) { return character.statuses.includes('Frightful Presence') ? 4 : 0; }
      },
      { status: 'Inspire Courage', property: 'bab', modifierType: 'Morale', value: 4 },
      { status: 'Inspire Courage', property: 'damageBonus', modifierType: 'Morale', value: 4 }
    ],
    calculateDuration: function (_spellCasting) {
      // TODO: implement duration calculation
      return 1;
    }
  }
};

// Extract effects from spellsData and register with the central status effects system
// This maintains compatibility with the existing status effects system
const spellsEffectsForRegistration = {};
Object.keys(SpellsData).forEach(spellName => {
  const effects = SpellsData[spellName].effects;
  // Validate modifier types for all effects
  effects.forEach(effect => {
    validateModifierType(effect.modifierType);
  });
  spellsEffectsForRegistration[spellName] = effects;
});
registerStatusEffects(spellsEffectsForRegistration);

class SpellCasting {
  constructor() {
    /**
         * @type {Map<string, SpellCasterClassData>}
         */
    this.classSpellCastingData = new Map();
  }

  isActive() {
    return this.classSpellCastingData.size > 0;
  }

  GetSpellCasterClassData(className) {
    if (this.classSpellCastingData.has(className)) {
      return this.classSpellCastingData.get(className);
    }
    return null;
  }

  GetCasterLevel(className) {
    if (this.classSpellCastingData.has(className)) {
      return this.classSpellCastingData.get(className).level;
    }
    return 0;
  }

  /**
     * Adds a spell caster class to the spell casting data
     * @param {string} className - The name of the class
     * @param {number} level - The level of the class
     * @param {Ability} ability - The ability of the class
     * @param {string[]} domains - The domains of the class
     */
  addSpellCasterClass(className, level, ability, domains = null) {
    if (this.classSpellCastingData.has(className)) {
      this.classSpellCastingData.get(className).level.applyPermanentEffect(level);
    } else {
      this.classSpellCastingData.set(className, new SpellCasterClassData(className, level, ability, domains));
    }
  }

  IsSpellPrepared(className, spellName, level) {
    const spellCasterClassData = this.GetSpellCasterClassData(className);
    if (!spellCasterClassData) {
      return false;
    }
    const levelSpells = spellCasterClassData.preparedSpells[level];
    if (levelSpells) {
      return levelSpells.some(spellData => spellData.spell === spellName && !spellData.used);
    }
    return false;
  }

  get state() {
    return {
      classSpellCastingData: Array.from(this.classSpellCastingData.entries())
        .map(([className, casterClassData]) => ({
          className: className,
          level: casterClassData.level.currentScore,
          domains: casterClassData.domains,
          spellSlots: casterClassData.spellSlots,
          availableSpells: casterClassData.availableSpells,
          preparedSpells: casterClassData.preparedSpells
        }))
    };
  }

  updateSpellsData() {
    this.classSpellCastingData.forEach((casterClassData, casterClassName) => {
      const classSpellcastingData = ClassesData.get(casterClassName).spellCastingData;
      casterClassData.spellSlots = [...classSpellcastingData.spellSlots[casterClassData.level.score]];
      const bonusSpells = getBonusSpells(casterClassData.ability.modifier);
      casterClassData.spellSlots.forEach((spellSlot, index) => {
        casterClassData.spellSlots[index] += casterClassData.spellSlots[index] > 0 ? bonusSpells[index] : 0;
      });

      const maxSpellLevel = casterClassData.spellSlots.findLastIndex(spellSlot => spellSlot > 0);
      casterClassData.availableSpells = classSpellcastingData.getAvailableSpells(maxSpellLevel, casterClassData.domains);
    });
  }

  updatePreparedSpells(preparedSpells) {
    this.classSpellCastingData.forEach((casterClassData, casterClassName) => {
      if (preparedSpells[casterClassName]) {
        casterClassData.preparedSpells = preparedSpells[casterClassName];
      }
    });
  }

  updateKnownSpells(knownSpells) {
    this.classSpellCastingData.forEach((casterClassData, casterClassName) => {
      if (knownSpells[casterClassName]) {
        // Map known spells to just string array for availableSpells
        // knownSpells structure is { level: [ {spell, used, ...} ] }
        const flatSpells = {};
        Object.keys(knownSpells[casterClassName]).forEach(level => {
          flatSpells[level] = knownSpells[casterClassName][level].map(s => s.spell);
        });
        casterClassData.availableSpells = flatSpells;
      }
    });
  }
}


/**
 * Data class for a spell caster class
 * @param {string} className - The name of the class
 * @param {number} level - The level of the class
 * @param {Ability} ability - The ability of the class
 * @param {string[]} domains - The domains of the class
 */
class SpellCasterClassData {
  constructor(className, level, ability, domains = null) {
    /**
         * @type {string}
         */
    this.className = className;
    /**
         * @type {ModifiableProperty}
         */
    this.level = new ModifiableProperty(level);
    /**
         * @type {Ability}
         */
    this.ability = ability;
    /**
         * @type {string[]}
         */
    this.domains = domains;
    /**
         * @type {number[]}
         */
    this.spellSlots = [];
    this.availableSpells = {};
    this.preparedSpells = {};
  }
}

function getBonusSpells(modifier) {
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



if (typeof module !== 'undefined') {
  module.exports = {
    SpellCasting,
    SpellsData
  };
}
