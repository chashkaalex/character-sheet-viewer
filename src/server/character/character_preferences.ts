const PINNED_SPECIAL_ATTACKS_PROP = 'pinnedSpecialAttacks';
const SKILL_FILTERS_PROP = 'skillFilters';

export type SkillFilterMode = 'all' | 'trained' | 'active';
const VALID_SKILL_FILTERS = new Set<SkillFilterMode>(['all', 'trained', 'active']);

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
