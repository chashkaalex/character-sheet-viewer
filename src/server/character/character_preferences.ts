const PINNED_SPECIAL_ATTACKS_PROP = 'pinnedSpecialAttacks';

function readPinnedSpecialAttacksMap(): Record<string, string> {
  if (typeof PropertiesService === 'undefined') {
    return {};
  }
  try {
    const raw = PropertiesService.getUserProperties().getProperty(PINNED_SPECIAL_ATTACKS_PROP);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Retrieves the pinned favorite special attack for a character from GAS UserProperties.
 */
export function getPinnedSpecialAttack(docId: string): string | null {
  if (!docId) return null;
  const map = readPinnedSpecialAttacksMap();
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
  const map = readPinnedSpecialAttacksMap();
  const normalized = attackName ? String(attackName).trim() : null;
  if (normalized) {
    map[docId] = normalized;
  } else {
    delete map[docId];
  }
  PropertiesService.getUserProperties().setProperty(PINNED_SPECIAL_ATTACKS_PROP, JSON.stringify(map));
  return { success: true, pinnedSpecialAttack: normalized };
}

