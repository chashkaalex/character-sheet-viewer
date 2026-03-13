// Central registry for all status effects
const StatusesEffects = {};

const { ModifierTypes } = require('../_constants');
//const { validateModifierType, registerStatusEffects } = require('./_general_effects');
// Function to register effects from different modules
function registerStatusEffects(effects) {
  Object.assign(StatusesEffects, effects);
}

const { SaveNames, SkillsAbilities, AbilityNames } = require('../_constants');

const keepingGrudgeEffects = [
  {
    status: 'Keeping Grudge',
    property: 'bab',
    modifierType: 'Circumstance',
    value: -2
  }
];

SaveNames.forEach(saveName => {
  keepingGrudgeEffects.push({
    status: 'Keeping Grudge',
    property: saveName,
    modifierType: 'Circumstance',
    value: -2
  });
});

Object.keys(SkillsAbilities).forEach(skillName => {
  keepingGrudgeEffects.push({
    status: 'Keeping Grudge',
    property: skillName,
    modifierType: 'Circumstance',
    value: -2
  });
});

AbilityNames.forEach(abilityName => {
  keepingGrudgeEffects.push({
    status: 'Keeping Grudge',
    property: abilityName,
    modifierType: 'Circumstance',
    value: -2
  });
});

StatusesEffects['Keeping Grudge'] = keepingGrudgeEffects;



const DynamicStatusesEffects = {
  'Inspire Courage': (parsedValue, statusName) => [
    {
      status: statusName,
      property: 'Will',
      modifierType: 'Morale',
      value: function (character) { return character.statuses.includes('Frightful Presence') ? parsedValue : 0; }
    },
    { status: statusName, property: 'bab', modifierType: 'Morale', value: parsedValue },
    { status: statusName, property: 'damageBonus', modifierType: 'Morale', value: parsedValue }
  ]
};

/**
 * Safely retrieving effects from a container, returning a deep copy of the effects array.
 * @param {Object} container - The container object holding the effects (e.g., StatusesEffects, FeatEffects).
 * @param {string} identifier - The key to look up in the container.
 * @returns {Array|null} A new array of copied effect objects, or null if not found.
 */
function GetEffects(container, identifier) {
  // Try exact lookup first
  let effects = container[identifier];

  if (effects) {
    return effects.map(effect => ({ ...effect }));
  }

  // If container is StatusesEffects, try dynamic extraction (e.g., getting +3 out of "Inspire Courage +3")
  if (container === StatusesEffects) {
    const dynamicMatch = identifier.match(/^(.+?)\s+([+-]\d+)$/);
    if (dynamicMatch) {
      const baseName = dynamicMatch[1];
      const numericValue = parseInt(dynamicMatch[2], 10);

      const dynamicEffectGenerator = DynamicStatusesEffects[baseName];
      if (dynamicEffectGenerator) {
        effects = dynamicEffectGenerator(numericValue, identifier);
        return effects.map(effect => ({ ...effect }));
      }
    }
  }

  return null;
}

const EffectExecutionType = Object.freeze({
  IMMEDIATE: 0,   //applied only once, when the 'Elapsed' property is 1
  PERMANENT: 1   //applied each time the status is being applied
});

// Function to validate modifier type
function validateModifierType(type) {
  if (!Object.prototype.hasOwnProperty.call(ModifierTypes, type)) {
    throw new Error(`Invalid modifier type: ${type}. Allowed types are: ${Object.keys(ModifierTypes).join(', ')}`);
  }
}

class ApplicableEffect {
  /**
   * @param {string} status
   * @param {string} property
   * @param {import('../_constants').ModifierType} modifierType
   * @param {number|function} value
   */
  constructor(status, property, modifierType, value) {
    validateModifierType(modifierType);
    this.status = status;
    this.property = property;
    this.modifierType = modifierType;
    this.value = value;
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    ApplicableEffect,
    StatusesEffects,
    registerStatusEffects,
    GetEffects,
    EffectExecutionType,
    validateModifierType
  };
}
