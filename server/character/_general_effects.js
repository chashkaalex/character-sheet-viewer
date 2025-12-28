// Central registry for all status effects
const statusesEffects = {};

// Function to register effects from different modules
function registerStatusEffects(effects) {
  Object.assign(statusesEffects, effects);
}

// Function to get all registered status effects
function getStatusesEffects() {
  return statusesEffects;
}

const EffectExecutionType = Object.freeze({
  IMMEDIATE: 0,   //applied only once, when the 'Elapsed' property is 1
  PERMANENT: 1   //applied each time the status is being applied
});

// Function to validate modifier type
function validateModifierType(type) {
  if (!modifierTypes.hasOwnProperty(type)) {
    throw new Error(`Invalid modifier type: ${type}. Allowed types are: ${Object.keys(modifierTypes).join(', ')}`);
  }
}

class Effect {
  /**
   * @param {string} status
   * @param {string} property
   * @param {ModifierType} modifierType
   * @param {number|function} value
   * @param {number} executionType
   */
  constructor(status, property, modifierType, value, executionType = EffectExecutionType.PERMANENT) {
    validateModifierType(modifierType);
    this.status = status;
    this.property = property;
    this.modifierType = modifierType;
    this.value = value;
  }
}
