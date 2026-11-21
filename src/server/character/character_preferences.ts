const PINNED_SPECIAL_ATTACKS_PROP = 'pinnedSpecialAttacks';
const SKILL_FILTERS_PROP = 'skillFilters';
const SPELL_LAYOUTS_PROP = 'spellLayouts';

export type SkillFilterMode = 'all' | 'trained' | 'active';
export type SpellLayoutMode = 'tabs' | 'list';
const VALID_SKILL_FILTERS = new Set<SkillFilterMode>(['all', 'trained', 'active']);
const VALID_SPELL_LAYOUTS = new Set<SpellLayoutMode>(['tabs', 'list']);

function readPreferenceMap(propKey: string): Record<string, string> {
  if (typeof PropertiesService === 'undefined') {
    return {};
  }
  try {
    const raw = PropertiesService.getUserProperties().getProperty(propKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePreferenceMap(propKey: string, map: Record<string, string>): void {
  PropertiesService.getUserProperties().setProperty(propKey, JSON.stringify(map));
}

/**
 * Retrieves the pinned favorite special attack for a character from GAS UserProperties.
 */
export function getPinnedSpecialAttack(docId: string): string | null {
  if (!docId) return null;
  const map = readPreferenceMap(PINNED_SPECIAL_ATTACKS_PROP);
  return typeof map[docId] === 'string' ? map[docId] : null;
}

/**
 * Persists or clears the pinned favorite special attack for a character in GAS UserProperties.
 */
export function SetPinnedSpecialAttack(
  docId: string,
  attackName: string | null
): { success: boolean; pinnedSpecialAttack: string | null } {
  if (!docId || typeof PropertiesService === 'undefined') {
    return { success: false, pinnedSpecialAttack: null };
  }
  const map = readPreferenceMap(PINNED_SPECIAL_ATTACKS_PROP);
  const normalized = attackName ? String(attackName).trim() : null;
  if (normalized) {
    map[docId] = normalized;
  } else {
    delete map[docId];
  }
  writePreferenceMap(PINNED_SPECIAL_ATTACKS_PROP, map);
  return { success: true, pinnedSpecialAttack: normalized };
}

/**
 * Retrieves the preferred skill filter mode for a character from GAS UserProperties.
 */
export function getSkillFilterPreference(docId: string): SkillFilterMode | null {
  if (!docId) return null;
  const map = readPreferenceMap(SKILL_FILTERS_PROP);
  const val = map[docId] as SkillFilterMode | undefined;
  return val && VALID_SKILL_FILTERS.has(val) ? val : null;
}

/**
 * Persists the preferred skill filter mode for a character in GAS UserProperties.
 */
export function SetSkillFilterPreference(
  docId: string,
  mode: SkillFilterMode | string | null
): { success: boolean; skillFilter: SkillFilterMode | null } {
  if (!docId || typeof PropertiesService === 'undefined') {
    return { success: false, skillFilter: null };
  }
  const map = readPreferenceMap(SKILL_FILTERS_PROP);
  const normalized = mode ? String(mode).trim().toLowerCase() as SkillFilterMode : null;
  if (normalized && VALID_SKILL_FILTERS.has(normalized)) {
    map[docId] = normalized;
    writePreferenceMap(SKILL_FILTERS_PROP, map);
    return { success: true, skillFilter: normalized };
  }
  delete map[docId];
  writePreferenceMap(SKILL_FILTERS_PROP, map);
  return { success: true, skillFilter: null };
}

/**
 * Retrieves the preferred spell layout mode ('tabs' | 'list') for a character from GAS UserProperties.
 */
export function getSpellLayoutPreference(docId: string): SpellLayoutMode | null {
  if (!docId) return null;
  const map = readPreferenceMap(SPELL_LAYOUTS_PROP);
  const val = map[docId] as SpellLayoutMode | undefined;
  return val && VALID_SPELL_LAYOUTS.has(val) ? val : null;
}

/**
 * Persists the preferred spell layout mode ('tabs' | 'list') for a character in GAS UserProperties.
 */
export function SetSpellLayoutPreference(
  docId: string,
  mode: SpellLayoutMode | string | null
): { success: boolean; spellLayout: SpellLayoutMode | null } {
  if (!docId || typeof PropertiesService === 'undefined') {
    return { success: false, spellLayout: null };
  }
  const map = readPreferenceMap(SPELL_LAYOUTS_PROP);
  const normalized = mode ? String(mode).trim().toLowerCase() as SpellLayoutMode : null;
  if (normalized && VALID_SPELL_LAYOUTS.has(normalized)) {
    map[docId] = normalized;
    writePreferenceMap(SPELL_LAYOUTS_PROP, map);
    return { success: true, spellLayout: normalized };
  }
  delete map[docId];
  writePreferenceMap(SPELL_LAYOUTS_PROP, map);
  return { success: true, spellLayout: null };
}
