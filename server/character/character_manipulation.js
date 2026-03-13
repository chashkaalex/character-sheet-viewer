const { GetCharacterByDocId, GetCharacterRepByDocId } = require('../server.js');
const { Character, CharacterError } = require('./character');
const { SpellsData } = require('./spells');
const { adapter } = require('./adapter');
const { ClassesData } = require('../classes_data/_classes_general_data');

/**
 * @param {string} docId - The document ID of the character
 * @param {number} amount - The amount of damage to inflict or cure
 * @param {string} actionType - The type of action to perform ("inflict" or "cure")
 * @returns {Object} The character representation
 */
function UpdateHp(docId, amount, actionType) {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }
  if (actionType === 'inflict') {
    character.InflictDamage(amount);

    // Check for Grudge Keeper flaw (via the 'Keeping Grudge' dummy effect)
    const grudgeKeeperFlaw = character.flaws && character.flaws.flat().some(effect => effect.status === 'Keeping Grudge');
    if (grudgeKeeperFlaw) {
      AddStatusToCharacter(docId, 'Keeping Grudge', -1);
    }
  } else if (actionType === 'cure') {
    character.CureDamage(amount);
  }
  adapter.UpdateHp(docId, character.hp.current);
  return GetCharacterRepByDocId(docId);
}

/**
 * Adds a status to the character
 * @param {string} docId - The document ID of the character
 * @param {string} statusName - The name of the status to add
 * @param {number} duration - The duration of the status
 * @param {number} elapsed - The elapsed rounds of the status
 * @returns {Object} The character representation
 */
function AddStatusToCharacter(docId, statusName, duration, elapsed = 1) {
  // Add the single new status line to the document
  const newStatusLine = `${statusName}: ${elapsed} rounds/${duration} rounds`;

  const updateResult = adapter.AddStatus(docId, newStatusLine);
  if (!updateResult.success) {
    console.error('Failed to update document:', updateResult.error);
  }

  // return the updated character representation even if document update fails
  return GetCharacterRepByDocId(docId);
}

/**
 * Removes a status from the character
 * @param {string} docId - The document ID of the character
 * @param {string} statusName - The name of the status to remove
 * @returns {Object} The character representation
 */
function RemoveStatusFromCharacter(docId, statusName) {
  RemoveStatusLine(docId, statusName);
  return GetCharacterRepByDocId(docId);
}

/**
 * Removes a status line from the character
 * @param {string} docId - The document ID of the character
 * @param {string} statusName - The name of the status to remove
 * @returns {Object} The character representation
 */
function RemoveStatusLine(docId, statusName) {
  const removeResult = adapter.RemoveStatus(docId, statusName);
  if (!removeResult.success) {
    console.log('Failed to remove status from document:', removeResult.error);
  }
}

/**
 * Called when the rounds elapsed
 * @param {string} docId - The document ID of the character
 * @param {number} amount - The amount of rounds elapsed
 * @returns {Object} The character representation
 */
function OnRoundsElapsed(docId, amount) {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  if (character.statuses && character.statuses.length > 0) {
    const statusesToKeep = character.OnRoundsElapsed(amount);
    //remove all the statuses
    character.statuses.forEach(status => {
      RemoveStatusLine(docId, status.name);
    });

    //add the statuses that are still active back
    statusesToKeep.forEach(status => {
      AddStatusToCharacter(docId, status.name, status.duration, status.elapsed);
    });
  }
  return GetCharacterRepByDocId(docId);
}


/**
 * Prepares a spell for a character
 * @param {string} docId - The document ID of the character
 * @param {SlotData} slotData - The data of the slot to prepare the spell in
 * @param {string} selectedSpell - The name of the spell to prepare
 * @returns {Object} The character representation
 */
function OnPrepareSpell(docId, slotData, selectedSpell) {
  console.log('OnPrepareSpell called with:', { docId, slotData, selectedSpell });

  //get all the spell slots with the correct hierarchy
  const preparedSpells = adapter.GetPreparedSpellsStructure(docId, Character.ValidatePreparedSpell);

  //find the first available spell slot index for the selected spell
  const slotIndex = preparedSpells[slotData.casterClassName][slotData.spellLevel].findIndex(
    spellItem => spellItem.isValid === false
  );
  if (slotIndex !== -1) {
    const result = adapter.SetPreparedSpell(docId, slotData.casterClassName, slotData.spellLevel, slotIndex, selectedSpell);
    if (!result.success) {
      console.error('Failed to prepare spell:', result.error);
    }
  }

  //TODO: after the types are deduced correctly, add warning in case the spell wasn't prepared
  return GetCharacterRepByDocId(docId);
}

/**
 * Casts a spell for a character
 * @param {string} docId - The document ID of the character
 * @param {SlotData} slotData - The data of the slot containing the spell to cast (includes spellName)
 * @returns {Character|CharacterError} The character representation
 */
function OnCastSpell(docId, slotData) {
  console.log('OnCastSpell called with:', { docId, slotData });

  //get current character
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  //calculate the duration.
  const spellObject = SpellsData[slotData.spellName];
  if (!spellObject) {
    return new CharacterError('Spell description was not found');
  }

  //check if this spells' status is already active
  //TODO: this check shoud be performed on spell's real target
  if (character.statuses && character.statuses.some(status => status.name === slotData.spellName)) {
    return new CharacterError('Spell already active');
  }

  const spellCasterClassData = character.spellCasting.GetSpellCasterClassData(slotData.casterClassName);
  if (!spellCasterClassData) {
    return new CharacterError(`${character.name} does not have a spell caster class data for ${slotData.casterClassName}`);
  }

  const classData = ClassesData.get(slotData.casterClassName);
  const isSpontaneous = classData && classData.spellCastingData && classData.spellCastingData.preparation === 'Spontaneous';

  //check if the spell is available for the character based on cast type
  if (!isSpontaneous) {
    if (!character.spellCasting.IsSpellPrepared(slotData.casterClassName, slotData.spellName, slotData.spellLevel)) {
      return new CharacterError('Spell not prepared');
    }
  }

  const duration = spellObject.calculateDuration(spellCasterClassData);

  //signify the spell as used
  if (isSpontaneous) {
    //TODO: update available slots count
  } else {

    const preparedSpells = adapter.GetPreparedSpellsStructure(docId, Character.ValidatePreparedSpell);
    const classSpellsStructure = preparedSpells[slotData.casterClassName];
    if (!classSpellsStructure) {
      return new CharacterError(`No available spell slots found for ${slotData.casterClassName}`);
    }

    const classAndLevelSpells = classSpellsStructure[slotData.spellLevel];
    if (!classAndLevelSpells || classAndLevelSpells.length === 0) {
      return new CharacterError(`No level ${slotData.spellLevel} spell slots found for ${slotData.casterClassName}`);
    }

    const result = adapter.MarkSpellAsCast(
      docId,
      slotData.casterClassName,
      slotData.spellLevel,
      slotData.slotIndex,
      slotData.spellName,
      isSpontaneous);
    if (!result.success) {
      console.error('Failed to mark spell as cast:', result.error);
      return new CharacterError('Failed to cast spell in document');
    }

  }

  let statusName = slotData.spellName;
  if (slotData.casterClassName === 'BardicSpecial') {
    if (character.bardicSpecials) {
      const matchedSpecial = character.bardicSpecials.find(s => s.name === slotData.spellName);
      // Since bard.js was modified by user, matchedSpecial.value is now a ModifiableProperty
      if (matchedSpecial && matchedSpecial.value) {
        let modifierVal = matchedSpecial.value;
        if (typeof modifierVal === 'object' && modifierVal.currentScore !== undefined) {
          modifierVal = modifierVal.currentScore;
        }

        // Only append +X if the value is truthy (e.g., Inspire Courage has a value, Fascinate does not)
        if (modifierVal) {
          statusName = `${slotData.spellName} +${modifierVal}`;
        }
      }
    }
  }

  //TODO: implement target logic, for now casting on self
  return AddStatusToCharacter(docId, statusName, duration);
}

if (typeof module !== 'undefined') {
  module.exports = {
    UpdateHp,
    AddStatusToCharacter,
    RemoveStatusFromCharacter,
    RemoveStatusLine,
    OnRoundsElapsed,
    OnPrepareSpell,
    OnCastSpell
  };
}
