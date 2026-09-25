/**
 * Weapon Additional Damage Parser & Data Types
 */

export interface AdditionalDamageComponent {
  diceOrFlat: string;  // e.g. "1d6", "2"
  type: string;        // canonical type, e.g. "fire", "cold", "poison", "holy"
  source: string;      // e.g. "Flaming", "Description"
  isDice: boolean;
}

export interface WeaponExtraDamageResult {
  additionalDamages: AdditionalDamageComponent[];
  formulaString: string; // e.g. "+ 1d6 fire" or "+ 1d6 fire + 1d6 electricity"
  warning: string | null; // Set if there's a conflict between name and description
}

export const StandardMagicWeaponQualities: Record<string, { dice: string; type: string }> = {
  'flaming burst': { dice: '1d6', type: 'fire' },
  'flaming': { dice: '1d6', type: 'fire' },
  'frost burst': { dice: '1d6', type: 'cold' },
  'icy burst': { dice: '1d6', type: 'cold' },
  'frost': { dice: '1d6', type: 'cold' },
  'shocking burst': { dice: '1d6', type: 'electricity' },
  'shocking': { dice: '1d6', type: 'electricity' },
  'shock': { dice: '1d6', type: 'electricity' },
  'corrosive burst': { dice: '1d6', type: 'acid' },
  'corrosive': { dice: '1d6', type: 'acid' },
  'screaming': { dice: '1d6', type: 'sonic' },
  'holy': { dice: '2d6', type: 'holy' },
  'unholy': { dice: '2d6', type: 'unholy' },
  'anarchic': { dice: '2d6', type: 'chaotic' },
  'axiomatic': { dice: '2d6', type: 'lawful' }
};

/**
 * Normalizes an energy or damage type string to canonical lowercase form.
 */
export function normalizeDamageType(typeStr: string): string {
  const lower = typeStr.toLowerCase().trim();
  if (['fire', 'flame', 'flaming'].includes(lower)) return 'fire';
  if (['cold', 'frost', 'ice'].includes(lower)) return 'cold';
  if (['electricity', 'electric', 'lightning', 'shock', 'shocking'].includes(lower)) return 'electricity';
  if (['acid', 'corrosive'].includes(lower)) return 'acid';
  if (['sonic', 'sound'].includes(lower)) return 'sonic';
  if (['poison', 'poisonous'].includes(lower)) return 'poison';
  if (['holy', 'good'].includes(lower)) return 'holy';
  if (['unholy', 'evil'].includes(lower)) return 'unholy';
  if (['anarchic', 'chaos', 'chaotic'].includes(lower)) return 'chaotic';
  if (['axiomatic', 'law', 'lawful'].includes(lower)) return 'lawful';
  if (['sneak', 'sneak attack'].includes(lower)) return 'sneak attack';
  if (['nonlethal', 'non lethal', 'non-lethal'].includes(lower)) return 'nonlethal';
  return lower;
}

/**
 * Capitalizes the first letter of a damage type for display.
 */
export function formatDamageType(typeStr: string): string {
  if (!typeStr) return '';
  return typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
}

/**
 * Parses additional damage components from weapon name and description,
 * handling deduplication and conflict detection (Option B).
 */
export function ParseWeaponExtraDamage(fullName: string, description: string): WeaponExtraDamageResult {
  const nameExtraDamages: AdditionalDamageComponent[] = [];
  const descExtraDamages: AdditionalDamageComponent[] = [];

  // 1. Extract from weapon name based on standard magic qualities
  const fullNameLower = fullName.toLowerCase();
  for (const [quality, data] of Object.entries(StandardMagicWeaponQualities)) {
    // Word boundary check
    const regex = new RegExp(`\\b${quality}\\b`, 'i');
    if (regex.test(fullNameLower)) {
      // Avoid matching 'shock' if 'shocking' was already matched, or 'frost' if 'frost burst' was matched
      const alreadyHasType = nameExtraDamages.some(d => d.type === data.type);
      if (!alreadyHasType) {
        nameExtraDamages.push({
          diceOrFlat: data.dice,
          type: data.type,
          source: quality,
          isDice: data.dice.includes('d')
        });
      }
    }
  }

  // 2. Extract from description
  if (description) {
    // Pattern A: Curly braces notation, e.g. "+1d6{fire}", "+ 1d6{fire}", "+1d8 {cold}", "+2{poison}"
    const curlyRegex = /\+\s*(\d+d\d+|\d+)\s*\{([^}]+)\}/gi;
    let match: RegExpExecArray | null;
    while ((match = curlyRegex.exec(description)) !== null) {
      const diceOrFlat = match[1].trim();
      const rawType = match[2].trim();
      const normType = normalizeDamageType(rawType);
      descExtraDamages.push({
        diceOrFlat: diceOrFlat,
        type: normType,
        source: 'description',
        isDice: diceOrFlat.includes('d')
      });
    }

    // Pattern B: Explicit dice + type word, e.g. "+1d6 fire", "+ 1d6 cold damage", "+2d6 holy"
    const wordDiceRegex = /\+\s*(\d+d\d+)\s*(fire|cold|frost|ice|acid|electricity|lightning|shock|sonic|sound|poison|holy|unholy|chaotic|lawful|sneak attack|nonlethal|non-lethal)(?:\s*damage)?\b/gi;
    while ((match = wordDiceRegex.exec(description)) !== null) {
      const diceOrFlat = match[1].trim();
      const rawType = match[2].trim();
      const normType = normalizeDamageType(rawType);
      // Avoid duplicate if already matched by Pattern A
      if (!descExtraDamages.some(d => d.type === normType && d.diceOrFlat === diceOrFlat)) {
        descExtraDamages.push({
          diceOrFlat: diceOrFlat,
          type: normType,
          source: 'description',
          isDice: true
        });
      }
    }

    // Pattern C: Flat bonus + type word with "damage", e.g. "+2 poison damage", "+1 fire damage"
    const wordFlatRegex = /\+\s*(\d+)\s*(fire|cold|frost|ice|acid|electricity|lightning|shock|sonic|sound|poison)(?:\s*damage)\b/gi;
    while ((match = wordFlatRegex.exec(description)) !== null) {
      const diceOrFlat = match[1].trim();
      const rawType = match[2].trim();
      const normType = normalizeDamageType(rawType);
      // Avoid duplicate if already matched
      if (!descExtraDamages.some(d => d.type === normType && d.diceOrFlat === diceOrFlat)) {
        descExtraDamages.push({
          diceOrFlat: diceOrFlat,
          type: normType,
          source: 'description',
          isDice: false
        });
      }
    }
  }

  // 3. Deduplication and Conflict Resolution (Option B)
  // If description has additional damages:
  // - For each description damage, if name has the same type, they merge (description takes precedence, no duplicate).
  // - If name has a quality of Type A, but description specifies Type B, this is a conflict!
  //   Description takes precedence, and we record a warning badge explanation.
  const finalDamages: AdditionalDamageComponent[] = [];
  let warning: string | null = null;

  if (descExtraDamages.length > 0) {
    // Add all description damages
    finalDamages.push(...descExtraDamages);

    // Check if any name damages have types not present in description
    for (const nameDmg of nameExtraDamages) {
      const matchingDesc = descExtraDamages.find(d => d.type === nameDmg.type);
      if (!matchingDesc) {
        // Name implied a type that description did NOT match.
        // Option B: Description overrides name, and we alert the user via warning badge and parseWarnings!
        warning = `Conflict in '${fullName}': Weapon name implies ${nameDmg.type} damage ('${nameDmg.source}'), but description specifies ${descExtraDamages.map(d => d.type).join(', ')}. Using description formula.`;
      }
    }
  } else {
    // Description did not specify any additional damages; use the ones implied by name
    finalDamages.push(...nameExtraDamages);
  }

  // Build formula string, e.g. "+ 1d6 fire" or "+ 1d6 fire + 1d6 cold"
  const formulaParts = finalDamages.map(d => `+ ${d.diceOrFlat} ${d.type}`);
  const formulaString = formulaParts.length > 0 ? formulaParts.join(' ') : '';

  return {
    additionalDamages: finalDamages,
    formulaString: formulaString,
    warning: warning
  };
}

/**
 * Builds the unified Rolz damage roll message string.
 * Example with additional damage:
 * "Flaming +1 Composite Longbow +5 Str Damage: [1d8+7] Physical + [1d6] Fire"
 * Example without additional damage:
 * "#1d8+7 #Longsword +1 Damage"
 */
export function BuildRolzDamageMessage(
  weaponName: string,
  baseDice: string,
  baseBonus: number,
  additionalDamages: AdditionalDamageComponent[]
): string {
  const baseBonusStr = baseBonus > 0 ? `+${baseBonus}` : (baseBonus < 0 ? `${baseBonus}` : '');
  const baseRollExpr = `${baseDice}${baseBonusStr}`;

  if (additionalDamages.length === 0) {
    return `#${baseRollExpr} #${weaponName} Damage`;
  }

  // Multi-component roll for Rolz.org: evaluates all bracketed expressions independently in one post!
  const extraParts = additionalDamages
    .map(d => `+ [${d.diceOrFlat}] (${formatDamageType(d.type)})`)
    .join(' ');

  return `${weaponName} Damage: [${baseRollExpr}] (Physical) ${extraParts}`;
}

/**
 * Formats a multi-item Rolz API response into a structured damage breakdown.
 */
export function FormatRolzBreakdown(items: any[]): { title: string; lines: string[]; total: number; summary: string } {
  if (!items || items.length === 0) {
    return { title: '', lines: [], total: 0, summary: '' };
  }

  let total = 0;
  const lines: string[] = [];

  items.forEach((it: any, idx: number) => {
    const val = parseInt(it.result);
    if (!isNaN(val)) total += val;

    let tag = '';
    const nextPre = items[idx + 1]?.pre || '';
    const currPost = it.post || '';
    const matchNext = nextPre.match(/\(([^)]+)\)/);
    const matchPost = currPost.match(/\(([^)]+)\)/);

    if (matchNext) {
      tag = matchNext[1];
    } else if (matchPost) {
      tag = matchPost[1];
    } else if (idx === 0) {
      tag = 'Base';
    } else {
      tag = `Extra ${idx}`;
    }

    let detailsStr = '';
    if (it.details) {
      const trimmed = it.details.trim();
      detailsStr = trimmed.startsWith('(') && trimmed.endsWith(')') ? ` ${trimmed}` : ` (${trimmed})`;
    }
    lines.push(`• ${tag}: ${it.result}${detailsStr}`);
  });

  const title = (items[0]?.pre || '').split(':')[0]?.trim() || 'Damage Roll';
  const summary = `🎲 ${title}\n────────────────────────\n${lines.join('\n')}\n────────────────────────\nTotal: ${total}`;

  return { title, lines, total, summary };
}
