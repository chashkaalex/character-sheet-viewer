import { Character, CharacterError } from './character';
import { SpellSlotData } from './common_types';
import { CharacterRep, getCharacterRep } from './character_rep';
import { adapter } from './adapter_selector';

declare let require: any;

import { ClassesData } from '../classes_data/_classes_general_data';
import { SpellsData } from './spells';

/**
 * Retrieves a character object by document ID.
 */
export function GetCharacterByDocId(docId: string): Character | CharacterError {
  const rawlines = adapter.GetCharacterLines(docId);
  const lines = adapter.CleanRawLines(rawlines);

  const character = new Character(lines, docId);
  character.ParseCharacter();
  if (!character.parseSuccess) {
    return new CharacterError('Failed to parse character', character.parseErrors);
  }

  // Fetch Party Members if applicable
  if (character.partyName) {
    character.partyMembers = adapter.GetPartyMembers(character.partyName, docId);
  }

  return character;
}

/**
 * Retrieves a character representation by document ID.
 */
export function GetCharacterRepByDocId(docId: string): CharacterRep | CharacterError {
  const currentCharacter = GetCharacterByDocId(docId);
  if (currentCharacter instanceof CharacterError) {
    return currentCharacter;
  }

  return getCharacterRep(currentCharacter);
}

/**
 * Updates the HP of a character.
 * @param docId The document ID.
 * @param amount The amount to update.
 * @param actionType The type of action (inflict or cure).
 * @returns The character representation or error.
 */
export function UpdateHp(docId: string, amount: number, actionType: 'inflict' | 'cure'): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  const alreadyKeepingGrudge = character.statuses && character.statuses.some((status: any) => status.name === 'Keeping Grudge');

  if (actionType === 'inflict' && !alreadyKeepingGrudge) {
    character.InflictDamage(amount);

    // Check for Grudge Keeper flaw (via the 'Keeping Grudge' dummy effect)
    const grudgeKeeperFlaw = character.flaws && character.flaws.flat().some((effect: any) => effect.status === 'Keeping Grudge');
    if (grudgeKeeperFlaw) {
      _addStatusToCharacter(docId, 'Keeping Grudge', -1);
    }
  } else if (actionType === 'cure') {
    character.CureDamage(amount);
  }
  adapter.UpdateHp(docId, character.hp.current);
  return GetCharacterRepByDocId(docId);
}

/**
 * Adds a status to the character (internal, does not produce a character representation)
 */
function _addStatusToCharacter(docId: string, statusName: string, duration: number, elapsed: number = 1): void {
  const newStatusLine = `${statusName}: ${elapsed} rounds/${duration} rounds`;
  AddStatusLine(docId, newStatusLine);
}

/**
 * Adds a status to the character
 */
export function AddStatusToCharacter(docId: string, statusName: string, duration: number, elapsed: number = 1): CharacterRep | CharacterError {
  _addStatusToCharacter(docId, statusName, duration, elapsed);
  return GetCharacterRepByDocId(docId);
}

export function AddStatusLine(docId: string, statusName: string): void {
  const updateResult = adapter.AddStatus(docId, statusName);
  if (!updateResult.success) {
    console.error('Failed to update document:', updateResult.error);
  }
}

/**
 * Removes a status from the character (internal)
 */
function _removeStatusFromCharacter(docId: string, statusName: string): void {
  RemoveStatusLine(docId, statusName);
}

/**
 * Removes a status from the character
 */
export function RemoveStatusFromCharacter(docId: string, statusName: string): CharacterRep | CharacterError {
  _removeStatusFromCharacter(docId, statusName);
  return GetCharacterRepByDocId(docId);
}

export function RemoveStatusLine(docId: string, statusName: string): void {
  const removeResult = adapter.RemoveStatus(docId, statusName);
  if (!removeResult.success) {
    console.log('Failed to remove status from document:', removeResult.error);
  }
}

/**
 * Called when rounds elapse
 */
export function OnRoundsElapsed(docId: string, amount: number): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  if (character.statuses && character.statuses.length > 0) {
    const statusesToKeep = character.OnRoundsElapsed(amount);
    // remove all the statuses
    character.statuses.forEach((status: any) => {
      _removeStatusFromCharacter(docId, status.name);
    });

    // add the statuses that are still active back
    statusesToKeep.forEach((status: any) => {
      _addStatusToCharacter(docId, status.name, status.duration, status.elapsed);
    });
  }
  return GetCharacterRepByDocId(docId);
}

/**
 * Prepares a spell for a character
 */
export function OnPrepareSpell(docId: string, slotData: SpellSlotData, selectedSpell: string): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  // Validate caster class prepares spells in advance (not Spontaneous)
  const classData = ClassesData.get(slotData.casterClassName);
  if (!classData || !classData.spellCastingData || classData.spellCastingData.preparation === 'Spontaneous') {
    return new CharacterError(`${slotData.casterClassName} does not prepare spells in advance`);
  }

  // Validate the caster class exists on the character
  const spellCasterClassData = character.spellCasting.GetSpellCasterClassData(slotData.casterClassName);
  if (!spellCasterClassData) {
    return new CharacterError(`${character.name} does not have spell caster class data for ${slotData.casterClassName}`);
  }

  // Validate the selected spell fits the slot level
  const spellLevelNum = parseFloat(slotData.spellLevel);
  if (!Character.ValidatePreparedSpell(
    slotData.casterClassName, spellLevelNum, slotData.spellLevel, selectedSpell, spellCasterClassData.domains || []
  )) {
    return new CharacterError(`${selectedSpell} is not a valid spell for ${slotData.casterClassName} at level ${slotData.spellLevel}`);
  }

  // Validate the slot exists and is empty
  const levelSpells = spellCasterClassData.preparedSpells[slotData.spellLevel];
  if (!levelSpells || slotData.slotIndex >= levelSpells.length) {
    return new CharacterError(`Slot ${slotData.slotIndex} is out of bounds for ${slotData.casterClassName} level ${slotData.spellLevel}`);
  }
  if (!levelSpells[slotData.slotIndex].isEmpty) {
    return new CharacterError(`Slot ${slotData.slotIndex} for ${slotData.casterClassName} level ${slotData.spellLevel} is not empty`);
  }

  // Write the spell to the document
  const result = adapter.SetPreparedSpell(docId, slotData.casterClassName, slotData.spellLevel, slotData.slotIndex, selectedSpell);
  if (!result.success) {
    console.error('Failed to prepare spell:', result.error);
    return new CharacterError(`Failed to prepare spell: ${result.error}`);
  }

  return GetCharacterRepByDocId(docId);
}

/**
 * Casts a spell for a character
 */
export function OnCastSpell(docId: string, slotData: SpellSlotData): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  const spellObject = SpellsData[slotData.spellName];
  if (!spellObject) {
    return new CharacterError('Spell description was not found');
  }

  if (character.statuses && character.statuses.some((status: any) => status.name === slotData.spellName)) {
    return new CharacterError('Spell already active');
  }

  const spellCasterClassData = character.spellCasting.GetSpellCasterClassData(slotData.casterClassName);
  if (!spellCasterClassData) {
    return new CharacterError(`${character.name} does not have a spell caster class data for ${slotData.casterClassName}`);
  }

  const classData = ClassesData.get(slotData.casterClassName);
  const isSpontaneous = classData && classData.spellCastingData && classData.spellCastingData.preparation === 'Spontaneous';

  if (!isSpontaneous) {
    if (!character.spellCasting.IsSpellPrepared(slotData.casterClassName, slotData.spellName, slotData.spellLevel)) {
      return new CharacterError('Spell not prepared');
    }
  }

  const duration = spellObject.calculateDuration(spellCasterClassData);

  if (isSpontaneous && (!spellCasterClassData || !spellCasterClassData[slotData.spellLevel])) {
    const result = adapter.DecrementSpontaneousSlots(docId, slotData.casterClassName, slotData.spellLevel);
    if (!result.success) {
      console.error('Failed to decrement spontaneous slots:', result.error);
      return new CharacterError(`Failed to cast spontaneous spell: ${result.error}`);
    }
  } else {
    if (!spellCasterClassData) {
      return new CharacterError(`No available spell slots found for ${slotData.casterClassName}`);
    }

    const classAndLevelSpells = spellCasterClassData.preparedSpells[slotData.spellLevel];
    if (!classAndLevelSpells || classAndLevelSpells.length === 0) {
      return new CharacterError(`No level ${slotData.spellLevel} spell slots found for ${slotData.casterClassName}`);
    }

    const result = adapter.MarkSpellAsCast(
      docId,
      slotData.casterClassName,
      slotData.spellLevel,
      slotData.slotIndex,
      slotData.spellName,
      isSpontaneous
    );
    if (!result.success) {
      console.error('Failed to mark spell as cast:', result.error);
      return new CharacterError('Failed to cast spell in document');
    }
  }

  let statusName = slotData.spellName;
  if (slotData.casterClassName === 'Bard' && slotData.spellLevel === 'songs') {
    if ((character as any).bardicSpecials) {
      const matchedSpecial = (character as any).bardicSpecials.find((s: any) => s.name === slotData.spellName);
      if (matchedSpecial && matchedSpecial.value) {
        let modifierVal = matchedSpecial.value;
        if (typeof modifierVal === 'object' && modifierVal.currentScore !== undefined) {
          modifierVal = modifierVal.currentScore;
        }

        if (modifierVal) {
          statusName = `${slotData.spellName} +${modifierVal}`;
        }
      }
    }
  }

  _addStatusToCharacter(docId, statusName, duration);
  return GetCharacterRepByDocId(docId);
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = {
    GetCharacterByDocId,
    GetCharacterRepByDocId,
    UpdateHp,
    AddStatusToCharacter,
    RemoveStatusFromCharacter,
    RemoveStatusLine,
    OnRoundsElapsed,
    OnPrepareSpell,
    OnCastSpell
  };
}
