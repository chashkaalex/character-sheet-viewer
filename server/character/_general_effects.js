// Central registry for all status effects
const StatusesEffects = {};

const { ModifierTypes } = require('../_constants');
//const { validateModifierType, registerStatusEffects } = require('./_general_effects');
// Function to register effects from different modules
function registerStatusEffects(effects) {
  Object.assign(StatusesEffects, effects);
}

// Function to get all registered status effects
function getStatusesEffects() {
  return StatusesEffects;
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

// class Effect {
//   /**
//    * @param {string} status
//    * @param {string} property
//    * @param {import('../_constants').ModifierType} modifierType
//    * @param {number|function} value
//    * @param {number} executionType
//    */
//   constructor(status, property, modifierType, value, executionType = EffectExecutionType.PERMANENT) {
//     validateModifierType(modifierType);
//     this.status = status;
//     this.property = property;
//     this.modifierType = modifierType;
//     this.value = value;
//   }
// }

if (typeof module !== 'undefined') {
  module.exports = {
    //Effect,
    StatusesEffects,
    registerStatusEffects,
    getStatusesEffects,
    EffectExecutionType,
    validateModifierType
  };
}
