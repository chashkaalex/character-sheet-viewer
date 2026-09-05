import { Character, CharacterError } from './character';
import { SpellSlotData } from './common_types';
import { CharacterRep, getCharacterRep } from './character_rep';
import { adapter } from './adapter_selector';

declare let require: any;

import { ClassesData } from '../classes_data/_classes_general_data';
import { SpellsData } from './spells';
import { ActionsData, NumberAction } from './actions/actions_effects';
import { GetScriptProperty } from '../services/gdoc_utilities';
import { sanitizeDbLink } from './parser_utils';

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

  // Fetch Party Data if applicable
  if (character.partyName) {
    const partyData = adapter.GetPartyData(character.partyName, docId);
    character.partyMembers = partyData.memberNames;
    character.quickStatuses = partyData.quickStatuses;
    character.partyNickname = partyData.partyNickname ?? null;
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

  if (actionType === 'inflict') {
    character.InflictDamage(amount);
  } else if (actionType === 'cure') {
    character.CureDamage(amount);
  }

  // Execute registered callbacks with runtime helpers
  const helpers = {
    addStatus: (statusName: string, duration: number) => _addStatusToCharacter(docId, statusName, duration),
    removeStatus: (statusName: string) => _removeStatusFromCharacter(docId, statusName)
  };
  character.manipulationCallbacks.UpdateHp.forEach(cb => cb(character, amount, actionType, helpers));

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

/**
 * Removes all active statuses from the character
 */
export function RemoveAllStatusesFromCharacter(docId: string): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }
  if (character.statuses && character.statuses.length > 0) {
    character.statuses.forEach(status => {
      _removeStatusFromCharacter(docId, status.name);
    });
  }
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

  const targets = (slotData.targets && slotData.targets.length > 0) ? slotData.targets : ['Self'];
  const selfNames = ['Self', character.name, character.partyNickname].filter(Boolean) as string[];
  const isTargetingSelf = targets.some(t => selfNames.includes(t));

  const targetStatusName = spellObject.statusName || slotData.spellName;
  if (isTargetingSelf && character.HasStatus(targetStatusName)) {
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

  const classAndLevelSpells = spellCasterClassData.preparedSpells[slotData.spellLevel];
  if (!classAndLevelSpells || classAndLevelSpells.length === 0) {
    return new CharacterError(`No level ${slotData.spellLevel} spell slots found for ${slotData.casterClassName}`);
  }

  const spellCastingData = classData && classData.spellCastingData;
  if (!spellCastingData || typeof spellCastingData.ConsumeSpellSlot !== 'function') {
    return new CharacterError(`ConsumeSpellSlot method not implemented for caster class ${slotData.casterClassName}`);
  }

  const result = spellCastingData.ConsumeSpellSlot(docId, slotData, adapter);
  if (!result.success) {
    console.error('Failed to cast spell:', result.error);
    return new CharacterError(`Failed to cast spell: ${result.error}`);
  }

  const context = {
    statusName: spellObject.statusName || slotData.spellName,
    duration: duration
  };

  // Execute registered OnCastSpell callbacks with runtime helpers
  const helpers = {
    addStatus: (statusName: string, duration: number) => _addStatusToCharacter(docId, statusName, duration),
    removeStatus: (statusName: string) => _removeStatusFromCharacter(docId, statusName)
  };
  character.manipulationCallbacks.OnCastSpell.forEach(cb => cb(character, slotData, context, helpers));

  // Apply to self if targeted
  if (isTargetingSelf) {
    _addStatusToCharacter(docId, context.statusName, context.duration);
  }

  // Push status to remote party members
  const remoteTargets = targets.filter(t => !selfNames.includes(t));
  if (remoteTargets.length > 0 && character.partyName) {
    const rawDbLink = GetScriptProperty('DB_LINK') || (typeof PropertiesService === 'undefined' ? 'https://local-test-db.firebaseio.com' : null);
    const dbLink = sanitizeDbLink(rawDbLink);
    if (dbLink) {
      const senderName = character.partyNickname || character.name;
      remoteTargets.forEach(targetMember => {
        const payload = {
          statusId: `status_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          statusName: context.statusName,
          senderName: senderName,
          duration: context.duration,
          durationUnit: 'rounds' as const,
          timestamp: Date.now()
        };
        adapter.PushPartyMemberStatus(dbLink, character.partyName!, targetMember, payload);
      });
    } else {
      console.warn('[PartySync] Cannot push status to party members: DB_LINK not configured');
    }
  }

  return GetCharacterRepByDocId(docId);
}

/**
 * Replenishes spell slots for a specific caster class of a character.
 */
export function OnReplenishClassSpellSlots(docId: string, className: string): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  const classData = ClassesData.get(className);
  if (classData && classData.spellCastingData && typeof classData.spellCastingData.ReplenishSpellSlots === 'function') {
    const result = classData.spellCastingData.ReplenishSpellSlots(docId, adapter);
    if (!result.success) {
      console.error(`Failed to replenish spell slots for ${className}:`, result.error);
      return new CharacterError(`Failed to replenish spell slots for ${className}: ${result.error}`);
    }
  } else {
    return new CharacterError(`No replenishment definition found for ${className}`);
  }

  return GetCharacterRepByDocId(docId);
}

/**
 * Uses a general action for a character.
 */
export function OnUseAction(docId: string, actionName: string): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  const action = ActionsData[actionName];
  if (!action) {
    return new CharacterError(`Action '${actionName}' not found in registry`);
  }

  if (!character.actions.includes(actionName)) {
    return new CharacterError(`Character does not have action '${actionName}' available`);
  }

  if (character.HasStatus(action.statusName)) {
    return new CharacterError(`Action '${actionName}' is already active`);
  }

  const duration = action.calculateDuration(character);
  _addStatusToCharacter(docId, action.statusName, duration);

  return GetCharacterRepByDocId(docId);
}

/**
 * Triggers a move action for a character.
 */
export function OnMoveAction(docId: string, feet: number): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  if (typeof feet !== 'number' || isNaN(feet) || feet <= 0) {
    return new CharacterError('Move action requires a positive feet distance');
  }

  const speed = character.speed.currentScore;
  if (feet > speed) {
    return new CharacterError(`Cannot move ${feet} feet; speed is only ${speed} feet`);
  }

  _addStatusToCharacter(docId, `Moved ${feet} feet`, 1);
  return GetCharacterRepByDocId(docId);
}

/**
 * Triggers a generic number-accepting action.
 */
export function OnUseNumberAction(docId: string, actionName: string, value: number): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  const action = ActionsData[actionName];
  if (!action) {
    return new CharacterError(`Action '${actionName}' not found`);
  }

  if (!(action instanceof NumberAction)) {
    return new CharacterError(`Action '${actionName}' does not accept a numeric value`);
  }

  if (typeof value !== 'number' || isNaN(value) || value < action.minNumber) {
    return new CharacterError(`Invalid value for action '${actionName}'`);
  }

  const maxVal = action.maxNumberResolver(character);
  if (value > maxVal) {
    return new CharacterError(`Value ${value} exceeds maximum allowed of ${maxVal} for action '${actionName}'`);
  }

  if (actionName === 'Move') {
    return OnMoveAction(docId, value);
  }

  const duration = action.calculateDuration(character);
  const targetStatusName = actionName === 'Combat Expertise' ? `Combat Expertise -${value}` : `${action.statusName} ${value}`;

  if (character.HasStatus(targetStatusName)) {
    return new CharacterError(`Action '${actionName}' with value ${value} is already active`);
  }

  _addStatusToCharacter(docId, targetStatusName, duration);
  return GetCharacterRepByDocId(docId);
}

/**
 * Moves an item between Battle Gear and Possessions sections.
 */
export function MoveInventoryItem(docId: string, itemName: string, fromSection: string, toSection: string): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  if (fromSection !== 'Battle Gear' && fromSection !== 'Possessions') {
    return new CharacterError(`Invalid source section: ${fromSection}`);
  }
  if (toSection !== 'Battle Gear' && toSection !== 'Possessions') {
    return new CharacterError(`Invalid target section: ${toSection}`);
  }

  const result = adapter.MoveItem(docId, itemName, fromSection, toSection);
  if (!result.success) {
    console.error('Failed to move item in document:', result.error);
    return new CharacterError(`Failed to move item in document: ${result.error}`);
  }

  return GetCharacterRepByDocId(docId);
}

export function RollWithRolz(room: string, formula: string, characterName: string): { total: number; detail: string } | null {
  const rollText = `Potion Heal [${formula}]`;
  const responseText = adapter.PostRollToRolz(room, rollText, characterName);
  if (!responseText) return null;

  try {
    const data = JSON.parse(responseText);
    if (data && data.message && data.message.content) {
      const item = data.message.content.items?.[0];
      if (item && item.type === 'dicemsg') {
        const result = parseInt(item.result);
        const details = item.details || '';
        if (isNaN(result)) {
          console.error('Rolz returned invalid result:', item.result);
          return null;
        }
        return {
          total: result,
          detail: `rolled ${formula} ${details} = ${result}`
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse Rolz response:', e, 'Response was:', responseText);
  }

  return null;
}

/**
 * Uses a potion from the character's Battle Gear.
 * Heals the character (if it is a healing potion) and decrements/removes it from the sheet.
 */
export function UsePotion(docId: string, potionName: string): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  // Ensure Rolz Room ID is configured
  if (!character.rolzRoomId || character.rolzRoomId.trim() === '') {
    return new CharacterError('Potion consumption requires a Rolz Room ID to be configured in your character sheet.');
  }

  const potion = character.battleGear.find(item => item.name === potionName && item.isPotion);
  if (!potion) {
    return new CharacterError(`Potion '${potionName}' not found in Battle Gear`);
  }

  // Determine healing formula first (so we roll before consuming)
  let healingMessage = '';
  const isHealing = potionName.toLowerCase().includes('cure') || potionName.toLowerCase().includes('healing');
  let roll: { total: number; detail: string } | null = null;

  if (isHealing) {
    let formula = '';
    // Check parsed description or fallback
    const formulaMatch = potion.description.match(/(\d+d\d+\s*(?:[+-]\s*\d+)?)/i);
    if (formulaMatch) {
      formula = formulaMatch[1];
    } else {
      // Fallback standard formulas
      if (potionName.toLowerCase().includes('light')) {
        formula = '1d8+1';
      } else if (potionName.toLowerCase().includes('moderate')) {
        formula = '2d8+3';
      } else if (potionName.toLowerCase().includes('serious')) {
        formula = '3d8+5';
      } else if (potionName.toLowerCase().includes('critical')) {
        formula = '4d8+7';
      } else {
        formula = '1d8+1';
      }
    }

    // Roll via Rolz. If fails, disable the consuming action completely!
    roll = RollWithRolz(character.rolzRoomId, formula, character.name);
    if (!roll) {
      return new CharacterError('Rolz API is unavailable. Potion consumption has been disabled.');
    }
  }

  // Consume the potion from the document
  const result = adapter.ConsumeItem(docId, potionName, 'Battle Gear');
  if (!result.success) {
    return new CharacterError(`Failed to consume potion: ${result.error}`);
  }

  // Apply healing if roll was made
  if (isHealing && roll) {
    const oldHp = character.hp.current;
    const updateResult = UpdateHp(docId, roll.total, 'cure');
    if (updateResult instanceof CharacterError) {
      return updateResult;
    }

    const newChar = GetCharacterByDocId(docId);
    const newHp = !(newChar instanceof CharacterError) ? newChar.hp.current : oldHp;
    const healedAmount = newHp - oldHp;

    healingMessage = `Healed for ${healedAmount} HP (${roll.detail}). HP is now ${newHp}/${character.hp.max}.`;
  }

  const updatedRep = GetCharacterRepByDocId(docId);
  if (updatedRep instanceof CharacterError) {
    return updatedRep;
  }

  updatedRep.mutationMessage = `Successfully consumed ${potionName}. ` + healingMessage;
  return updatedRep;
}

