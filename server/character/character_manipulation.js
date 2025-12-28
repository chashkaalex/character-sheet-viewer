
/**
 * @param {string} docId - The document ID of the character
 * @param {number} amount - The amount of damage to inflict or cure
 * @param {string} actionType - The type of action to perform ("inflict" or "cure")
 * @returns {Object} The character representation
 */
function UpdateHp(docId, amount, actionType) {
  const character = GetCharacterByDocId(docId);
  if (character.error) {
    return character;
  }
  if (actionType === 'inflict') {
    character.InflictDamage(amount);
  } else if (actionType === 'cure') {
    character.CureDamage(amount);
  }
  UpdateProperty(docId, 'Hp', character.hp.current);
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

  const updateResult = UpdateSection(docId, 'Statuses', newStatusLine);
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
  const removeResult = RemoveLineFromSection(docId, 'Statuses', statusName);
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
  if (character.error) {
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
  const preparedSpells = ParserUtils.GetPreparedSpellsStructure(docId);

  //find the first available spell slot for the selected spell
  const spellSlot = preparedSpells[slotData.casterClassName][slotData.spellLevel].find(
    spellItem => spellItem.isValid === false
  );
  if (spellSlot) {
    spellSlot.item.editAsText().setText(selectedSpell);
  }

  //TODO: after the types are deduced correctly, add warning in case the spell wasn't prepared
  return GetCharacterRepByDocId(docId);
}

/**
 * Casts a spell for a character
 * @param {string} docId - The document ID of the character
 * @param {SlotData} slotData - The data of the slot containing the spell to cast (includes spellName)
 * @returns {Character} The character representation
 */
function OnCastSpell(docId, slotData) {
  console.log('OnCastSpell called with:', { docId, slotData });
  // TODO: Implement spell casting logic

  //get current character
  const character = GetCharacterByDocId(docId);
  if (character.error) {
    return character;
  }

  //calculate the duration.
  const spellObject = spellsData[slotData.spellName];
  if (!spellObject) {
    return { error: 'Spell not found' };
  }

  //check if this spells'sstatus is already active
  if (character.statuses && character.statuses.some(status => status.name === slotData.spellName)) {
    return { error: 'Spell already active' };
  }

  //check if the spell is available for the character
  if (!character.spellCasting.IsSpellPrepared(slotData.casterClassName, slotData.spellName, slotData.spellLevel)) {
    return { error: 'Spell not prepared' };
  }


  const spellCasterClassData = character.spellCasting.GetSpellCasterClassData(slotData.casterClassName);
  if (!spellCasterClassData) {
    return { error: 'Spell caster class data not found' };
  }

  const duration = spellObject.calculateDuration(spellCasterClassData);

  //signify the spell as used
  const preparedSpells = ParserUtils.GetPreparedSpellsStructure(docId);
  /**
     * @type {PreparedSpellDocData[]}
     */
  const classAndLevelSpells = preparedSpells[slotData.casterClassName][slotData.spellLevel];
  const availableToCastSpell = classAndLevelSpells.find(
    spellItem => spellItem.spell === slotData.spellName && !spellItem.used
  );
  if (availableToCastSpell) {
    availableToCastSpell.item.editAsText().setStrikethrough(true);
  }

  return AddStatusToCharacter(docId, slotData.spellName, duration);
}
