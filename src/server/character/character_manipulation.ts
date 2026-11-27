import { Character, CharacterError } from './character';
import { SpellSlotData } from './common_types';
import { CharacterRep, getCharacterRep } from './character_rep';
import { getPinnedSpecialAttack, getSkillFilterPreference, getSpellLayoutPreference } from './character_preferences';
import { getStatusesRemovedBy } from './state/conditions';
import { adapter } from './adapter_selector';

declare let require: any;

import { ClassesData } from '../classes_data/classes_general_data';
import { resolveSpellDuration, SpellsData, SpellTarget } from './spells';
import { ActionsData, getActionDailyPoolState, NumberAction } from './actions/actions_effects';
import { GetScriptProperty } from '../services/gdoc_utilities';
import { sanitizeDbLink } from './parser_utils';
import { CharacterSession } from './character_session';

/**
 * Retrieves a character object by document ID.
 */
export function GetCharacterByDocId(docId: string): Character | CharacterError {
  adapter.EnsureSessionCurrent(docId);
  const cached = CharacterSession.get(docId);
  if (cached) {
    return cached;
  }

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

  CharacterSession.set(docId, character);
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

  const rep = getCharacterRep(currentCharacter);
  rep.pinnedSpecialAttack = getPinnedSpecialAttack(docId);
  rep.skillFilter = getSkillFilterPreference(docId);
  rep.spellLayout = getSpellLayoutPreference(docId);
  return rep;
}

/**
 * Updates the HP of a character.
 * @param docId The document ID.
 * @param amount The amount to update.
 * @param actionType The type of action (inflict or cure).
 * @returns The character representation or error.
 */
export function UpdateHp(
  docId: string,
  amount: number,
  actionType: 'inflict' | 'cure',
  energyDamage?: Record<string, number>
): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  const prevTempHp = character.temporaryHp;
  const prevNonlethal = character.nonlethalDamage;

  // Capture existing Temp HP status metadata (including named temp-HP spell statuses like "Virtue")
  const tempStatusRegex = /^(?:(Temp\s+HP|Temporary\s+HP)\s+[+-]?\d+|Virtue)$/i;
  const existingTempStatuses = (character.statuses || []).filter(s => tempStatusRegex.test(s.name));
  const primaryTempStatus = existingTempStatuses[0];

  const nonlethalStatusRegex = /^(Nonlethal(?:\s+Damage)?)\s+[+-]?\d+$/i;
  const existingNonlethalStatuses = (character.statuses || []).filter(s => nonlethalStatusRegex.test(s.name));

  let effectiveAmount = amount;
  if (actionType === 'inflict') {
    effectiveAmount = character.InflictDamage(amount, energyDamage);
  } else if (actionType === 'cure') {
    character.CureDamage(amount);
  }

  // Execute registered callbacks with runtime helpers
  const helpers = {
    addStatus: (statusName: string, duration: number) => _addStatusToCharacter(docId, statusName, duration),
    removeStatus: (statusName: string) => _removeStatusFromCharacter(docId, statusName)
  };
  character.manipulationCallbacks.UpdateHp.forEach(cb => cb(character, effectiveAmount, actionType, helpers));

  // Persist lethal current HP on the GDoc Hp line
  adapter.UpdateHp(docId, character.hp.current);

  // Sync status-driven Temp HP if it changed
  if (character.temporaryHp !== prevTempHp) {
    existingTempStatuses.forEach(st => _removeStatusFromCharacter(docId, st.name, true));
    if (character.temporaryHp > 0) {
      const duration = primaryTempStatus ? primaryTempStatus.duration : -1;
      const elapsed = primaryTempStatus ? primaryTempStatus.elapsed : 1;
      _addStatusToCharacter(docId, `Temp HP ${character.temporaryHp}`, duration, elapsed);
    }
  }

  // Sync status-driven Nonlethal Damage if it changed
  if (character.nonlethalDamage !== prevNonlethal) {
    existingNonlethalStatuses.forEach(st => _removeStatusFromCharacter(docId, st.name, true));
    if (character.nonlethalDamage > 0) {
      _addStatusToCharacter(docId, `Nonlethal ${character.nonlethalDamage}`, -1, 1);
    }
  }

  // Evaluate D&D 3.5 Lethal & Nonlethal HP threshold conditions (PHB pp. 145–146)
  const curHp = character.hp.current;
  const curNl = character.nonlethalDamage;
  const hasDiehard = character.HasFeat('Diehard');

  if (curHp <= -10) {
    _addStatusToCharacter(docId, 'Dead', -1);
  } else if (curHp < 0) {
    // -1 to -9 HP: Dying, or Disabled if character has Diehard feat
    _addStatusToCharacter(docId, hasDiehard ? 'Disabled' : 'Dying', -1);
  } else if (curHp === 0) {
    _addStatusToCharacter(docId, 'Disabled', -1);
  } else {
    // curHp > 0: clear Disabled and Dying if present
    _removeStatusFromCharacter(docId, 'Disabled', true);
    _removeStatusFromCharacter(docId, 'Dying', true);
  }

  // Evaluate Nonlethal threshold conditions when character is alive (curHp > 0)
  if (curHp > 0) {
    if (curNl > 0 && curNl > curHp) {
      _addStatusToCharacter(docId, 'Unconscious', -1);
    } else if (curNl > 0 && curNl === curHp) {
      _addStatusToCharacter(docId, 'Staggered', -1);
    } else {
      _removeStatusFromCharacter(docId, 'Staggered', true);
      _removeStatusFromCharacter(docId, 'Unconscious', true);
    }
  }

  return GetCharacterRepByDocId(docId);
}

/**
 * Adds a status to the character (internal, does not produce a character representation)
 */
function _addStatusToCharacter(docId: string, statusName: string, duration: number, elapsed: number = 1): void {
  const normalizedStatus = statusName.trim().toLowerCase();

  // Special D&D 3.5 rule: Lesser Restoration downgrades Exhausted to Fatigued (or removes Fatigued if not Exhausted)
  if (normalizedStatus === 'lesser restoration') {
    const currentChar = GetCharacterByDocId(docId);
    if (!(currentChar instanceof CharacterError) && currentChar.HasStatus('Exhausted')) {
      _removeStatusFromCharacter(docId, 'Exhausted', true);
      _removeStatusFromCharacter(docId, 'Fatigued', true);
      AddStatusLine(docId, 'Fatigued: 1 rounds/-1 rounds');
      return;
    }
  }

  // Remove any conflicting/cured statuses (e.g. Remove Fear removes Shaken/Frightened/Panicked, Heal removes conditions)
  getStatusesRemovedBy(statusName).forEach(targetStatus => {
    _removeStatusFromCharacter(docId, targetStatus, true);
  });
  // Refresh status: remove any existing instance of this status (or its base name) first
  _removeStatusFromCharacter(docId, statusName, true);
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
function _removeStatusFromCharacter(docId: string, statusName: string, quiet: boolean = false): void {
  RemoveStatusLine(docId, statusName, quiet);
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
  const clearResult = adapter.RemoveAllStatuses(docId);
  if (!clearResult.success) {
    console.log('Failed to remove all statuses from document:', clearResult.error);
  }
  return GetCharacterRepByDocId(docId);
}

export function RemoveStatusLine(docId: string, statusName: string, quiet: boolean = false): void {
  const removeResult = adapter.RemoveStatus(docId, statusName);
  if (!removeResult.success && !quiet) {
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
    const ROUNDS_PER_HOUR = 600;
    const nonlethalRegex = /^(Nonlethal(?:\s+Damage)?)\s+([+-]?\d+)$/i;
    const statusesToKeep = character.OnRoundsElapsed(amount);

    let updatedNonlethalValue: number | null = null;
    const processedStatuses: Array<{ name: string; elapsed: number; duration: number }> = [];

    statusesToKeep.forEach((status: any) => {
      const nlMatch = status.name.match(nonlethalRegex);
      if (nlMatch) {
        const currentNl = Math.max(0, parseInt(nlMatch[2], 10));
        // Elapsed starts at 1 when added; full hours elapsed = floor((elapsed - 1) / 600)
        const netRoundsElapsed = Math.max(0, status.elapsed - 1);
        const fullHours = Math.floor(netRoundsElapsed / ROUNDS_PER_HOUR);
        if (fullHours > 0) {
          const healPerHour = Math.max(1, character.HD || 1);
          const remainingNl = Math.max(0, currentNl - fullHours * healPerHour);
          const remainderRounds = (netRoundsElapsed % ROUNDS_PER_HOUR) + 1;
          updatedNonlethalValue = (updatedNonlethalValue ?? 0) + remainingNl;
          if (remainingNl > 0) {
            processedStatuses.push({
              name: `Nonlethal ${remainingNl}`,
              elapsed: remainderRounds,
              duration: status.duration
            });
          }
          return;
        }
        updatedNonlethalValue = (updatedNonlethalValue ?? 0) + currentNl;
      }
      processedStatuses.push(status);
    });

    // If nonlethal damage was reduced by hourly recovery, re-evaluate Staggered / Unconscious conditions
    const finalStatuses = processedStatuses.filter(st => {
      if (updatedNonlethalValue !== null && character.hp.current > 0) {
        if (st.name === 'Unconscious' && updatedNonlethalValue <= character.hp.current) {
          return false;
        }
        if (st.name === 'Staggered' && updatedNonlethalValue !== character.hp.current) {
          return false;
        }
      }
      return true;
    });

    if (
      updatedNonlethalValue !== null &&
      character.hp.current > 0 &&
      updatedNonlethalValue === character.hp.current &&
      !finalStatuses.some(s => s.name === 'Staggered')
    ) {
      finalStatuses.push({ name: 'Staggered', elapsed: 1, duration: -1 });
    }

    // remove all the statuses in one pass
    adapter.RemoveAllStatuses(docId);

    // add the statuses that are still active back
    finalStatuses.forEach((status: any) => {
      AddStatusLine(docId, `${status.name}: ${status.elapsed} rounds/${status.duration} rounds`);
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

function pushStatusToRemoteTargets(
  character: Character,
  remoteTargets: string[],
  statusName: string,
  duration: number
): void {
  if (remoteTargets.length === 0 || !character.partyName) return;
  const rawDbLink = GetScriptProperty('DB_LINK') || (typeof PropertiesService === 'undefined' ? 'https://local-test-db.firebaseio.com' : null);
  const dbLink = sanitizeDbLink(rawDbLink);
  if (dbLink) {
    const senderName = character.partyNickname || character.name;
    remoteTargets.forEach(targetMember => {
      const payload = {
        statusId: `status_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        statusName: statusName,
        senderName: senderName,
        duration: duration,
        durationUnit: 'rounds' as const,
        timestamp: Date.now()
      };
      adapter.PushPartyMemberStatus(dbLink, character.partyName!, targetMember, payload);
    });
  } else {
    console.warn('[PartySync] Cannot push status to party members: DB_LINK not configured');
  }
}

/**
 * Casts a spell for a character
 */
export function OnCastSpell(docId: string, slotData: SpellSlotData): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  const spellObject = SpellsData[slotData.spellName] || {
    range: 'Close',
    target: SpellTarget.OneCreature,
    durationFormula: '1 min/level' as const,
    calculateDuration: (casterData: any) => (casterData?.level?.currentScore || 1) * 10
  };

  const targets = (slotData.targets && slotData.targets.length > 0) ? slotData.targets : ['Self'];
  const selfNames = ['Self', character.name, character.partyNickname].filter(Boolean) as string[];
  const isTargetingSelf = targets.some(t => selfNames.includes(t));

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

  const duration = resolveSpellDuration(spellObject, spellCasterClassData, character);

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
    const selfStatusName = (spellObject.requiresWeaponSelection && slotData.targetWeapon)
      ? `${context.statusName} (${slotData.targetWeapon})`
      : context.statusName;
    _addStatusToCharacter(docId, selfStatusName, context.duration);
  }

  // Push status to remote party members (remote recipient selects their own weapon if requiresWeaponSelection)
  const remoteTargets = targets.filter(t => !selfNames.includes(t));
  pushStatusToRemoteTargets(character, remoteTargets, context.statusName, context.duration);

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
export function OnUseAction(docId: string, actionName: string, rawTargets?: string[]): CharacterRep | CharacterError {
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

  if (!action.onUse && character.HasStatus(action.statusName)) {
    return new CharacterError(`Action '${actionName}' is already active`);
  }

  const dailyPool = getActionDailyPoolState(character, actionName, action);
  if (!action.onUse && dailyPool && dailyPool.usesRemaining <= 0) {
    return new CharacterError(`No daily uses remaining for '${actionName}' (${dailyPool.maxUses}/${dailyPool.maxUses} used)`);
  }

  let resolvedStatusName = action.statusName;
  let hookMutationMessage: string | undefined;
  if (action.onUse) {
    const hookResult = action.onUse(character, docId, actionName, rawTargets, {
      adapter,
      removeStatus: (statusName: string) => _removeStatusFromCharacter(docId, statusName, true),
      rollWithRolz: RollWithRolz
    });
    if (hookResult && hookResult.error) {
      return new CharacterError(hookResult.error);
    }
    if (hookResult && hookResult.statusName) {
      resolvedStatusName = hookResult.statusName;
    }
    if (hookResult && hookResult.mutationMessage) {
      hookMutationMessage = hookResult.mutationMessage;
    }
    if (hookResult && hookResult.skipDefaultStatus) {
      const rep = GetCharacterRepByDocId(docId);
      if (!(rep instanceof CharacterError) && hookMutationMessage) {
        rep.mutationMessage = hookMutationMessage;
      }
      return rep;
    }
  }

  const duration = action.calculateDuration(character);
  if (action.healFormula) {
    if (!character.rolzRoomId || character.rolzRoomId.trim() === '') {
      return new CharacterError('Healing action requires a Rolz Room ID to be configured in your character sheet.');
    }
    const roll = RollWithRolz(character.rolzRoomId, action.healFormula, character.name, actionName);
    if (!roll) {
      return new CharacterError('Rolz API is unavailable. Healing action could not be completed.');
    }
    const oldHp = character.hp.current;
    _addStatusToCharacter(docId, action.statusName, duration);
    const updateResult = UpdateHp(docId, roll.total, 'cure');
    if (updateResult instanceof CharacterError) {
      return updateResult;
    }
    const newChar = GetCharacterByDocId(docId);
    const newHp = !(newChar instanceof CharacterError) ? newChar.hp.current : oldHp;
    const healedAmount = newHp - oldHp;
    updateResult.mutationMessage = `Activated ${actionName}. Healed for ${healedAmount} HP (${roll.detail}). HP is now ${newHp}/${character.hp.max}.`;
    return updateResult;
  }
  let targets: string[] = (action.target && rawTargets && rawTargets.length > 0) ? rawTargets : ['Self'];
  if (targets.includes('All')) {
    targets = ['Self', ...(character.partyMembers || [])];
  }
  const selfNames = ['Self', character.name];
  const isTargetingSelf = targets.some(t => selfNames.includes(t));
  if (isTargetingSelf) {
    _addStatusToCharacter(docId, resolvedStatusName, duration);
  }
  const remoteTargets = targets.filter(t => !selfNames.includes(t));
  pushStatusToRemoteTargets(character, remoteTargets, resolvedStatusName, duration);

  // Record daily use counter status for daily-limited actions whose primary status is not already a permanent (Used...) marker
  if (!action.onUse && dailyPool && !resolvedStatusName.includes('(Used')) {
    if (dailyPool.activeCounterStatusName) {
      _removeStatusFromCharacter(docId, dailyPool.activeCounterStatusName, true);
    }
    const nextUsed = dailyPool.usedCount + 1;
    _addStatusToCharacter(docId, `${actionName} (Used ${nextUsed}/${dailyPool.maxUses})`, -1);
  }

  const finalRep = GetCharacterRepByDocId(docId);
  if (!(finalRep instanceof CharacterError) && hookMutationMessage) {
    finalRep.mutationMessage = hookMutationMessage;
  }
  return finalRep;
}

export const LONG_REST_ROUNDS = 8 * 600; // 8 hours = 4800 rounds

/**
 * Performs a Long Rest for a character:
 * 1. Removes all daily-usage tracking statuses (e.g. "(Used)" / "(Used X/Y)").
 * 2. Advances time by 8 hours (4800 rounds) via OnRoundsElapsed, expiring timed buffs/statuses.
 * 3. Replenishes all prepared and spontaneous spell slots (including Bardic Music 'songs') across all caster classes.
 */
export function OnLongRest(docId: string): CharacterRep | CharacterError {
  const character = GetCharacterByDocId(docId);
  if (character instanceof CharacterError) {
    return character;
  }

  // 1. Remove all daily-use tracking statuses (any status ending with "(Used)" or "(Used X/Y)")
  const dailyUsedPattern = /\(Used(?:\s+\d+\/\d+)?\)$/;
  const statusesToClear = (character.statuses || [])
    .map(s => s.name)
    .filter(name => dailyUsedPattern.test(name));

  for (const statusName of statusesToClear) {
    _removeStatusFromCharacter(docId, statusName, true);
  }

  // 2. Wrap "Passed 8 hours" (4800 rounds) to expire timed statuses
  const elapsedRes = OnRoundsElapsed(docId, LONG_REST_ROUNDS);
  if (elapsedRes instanceof CharacterError) {
    return elapsedRes;
  }

  // 3. Replenish spell slots for every spellcasting class on the character
  if (character.spellCasting && character.spellCasting.classSpellCastingData) {
    for (const [className] of character.spellCasting.classSpellCastingData.entries()) {
      const classData = ClassesData.get(className);
      if (classData?.spellCastingData && typeof classData.spellCastingData.ReplenishSpellSlots === 'function') {
        const res = classData.spellCastingData.ReplenishSpellSlots(docId, adapter);
        if (!res.success) {
          return new CharacterError(`Failed to replenish spell slots for ${className}: ${res.error}`);
        }
      }
    }
  }

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
  const usesNegativeSuffix = actionName === 'Combat Expertise' || actionName === 'Power Attack';
  const targetStatusName = usesNegativeSuffix ? `${action.statusName} -${value}` : `${action.statusName} ${value}`;

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

export function RollWithRolz(room: string, formula: string, characterName: string, label: string = 'Potion Heal'): { total: number; detail: string } | null {
  const rollText = `${label} [${formula}]`;
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
