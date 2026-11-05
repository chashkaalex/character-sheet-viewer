# Implementation Plan: Full Support for Morty's GDoc Character Sheet

This plan outlines the step-by-step code changes to close the parser, calculation, and content gaps identified in [`docs/morty_gaps_analysis.md`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/docs/morty_gaps_analysis.md) and transition [`morty_test.txt`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/tests/local_tests/test_character_sheets/morty_test.txt) to the new state-of-the-art GDoc sheet.

---

## Phase 1: Spellcasting Engine Fixes (`Beguiler` & `Unseen Seer`)

1. **Register `Beguiler` and `Unseen Seer` in `SpellcasterClasses`**
   - **File:** [`src/server/character/_constants.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/_constants.ts#L50-L60)
   - Add `'Beguiler'` and `'Unseen Seer'` to `SpellcasterClasses`.
2. **Fix `Practiced Spellcaster` Progression & Parameter Fallback**
   - **File:** [`src/server/character/properties/feats/feats_effects.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/feats/feats_effects.ts#L359-L382)
   - If no class parameter is passed to `Practiced Spellcaster` and `character.spellCasting.classSpellCastingData.size === 1`, automatically resolve `casterClassName` to that single spellcasting class.
   - Use `casterLevel.score` (which includes prestige class spellcasting progression like `Unseen Seer`) instead of `character.GetClassLevel(casterClassName)` when clamping the `+4` bonus to `character.HD`.
3. **Add Beguiler Spells to `SpellsData`**
   - **File:** [`src/server/character/spells.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/spells.ts)
   - Add core 0th–3rd level Beguiler and Unseen Seer spells (*Blur*, *Invisibility*, *Greater Invisibility*, *Mirror Image*, *See Invisibility*, *Displacement*, *Dispel Magic*, *Silence*, *Knock*, *Spider Climb*, *Detect Thoughts*, *Clairaudience/Clairvoyance*, *Slow*, *Hold Person*, *Nondetection*, *Color Spray*, *Charm Person*, *Disguise Self*, *Undetectable Alignment*, etc.) with accurate D&D 3.5e ranges, targets, durations, and status effects.

---

## Phase 2: Weapons, Masterwork/Adamantine Rules & `Weapon Finesse`

1. **Add `Elven Thinblade` / `Thinblade` & Custom Critical Parsing**
   - **File:** [`src/server/character/gear/weapons/weapons.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/weapons/weapons.ts)
   - Add `'Thinblade'` and `'Elven Thinblade'` (`range: 'Melee'`, `encumbrance: 'One-Handed'`, `damage: '1d8'`, `critical: '18-20/x2'`) to `WeaponsData`.
   - Add `'Thinblade'` and `'Elven Thinblade'` to `finesseBaseNames` in `Weapon.calculateBonuses` so `Weapon Finesse` applies Dexterity to attack rolls per *Races of the Wild* (p. 165).
   - In `Weapon.parseDescription`, support parsing critical range/multiplier overrides from the item description (e.g. `18-20x3` or `18-20/x3`).
2. **Support Masterwork & Adamantine Attack-Only Enhancement**
   - **File:** [`src/server/character/gear/weapons/weapons.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/weapons/weapons.ts)
   - Differentiate between magical weapon enhancement (`+1` to both attack and damage) and masterwork / adamantine non-magical enhancement (`+1` to attack rolls only when `enhancement === 0` and the weapon is `Masterwork` or `Adamantine`).
   - Preserve special material names (such as `Adamantine Dagger`) in the weapon's display name.

---

## Phase 3: Flaws, Traits, Feats & Items

1. **Add `Quick` and `Shaky` to `FlawsEffects`**
   - **File:** [`src/server/character/properties/flaws/flaws_effects.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/flaws/flaws_effects.ts)
   - **`Quick`:** Apply `+10` to `speed` (`modifierType: 'Generic'`) and record `-1 hp per level` in `Special`.
   - **`Shaky`:** Apply `-2` penalty to `featAttackBonus` on all ranged weapons (`weapon.rangeType === 'Ranged'`).
2. **Add Missing Feats to `FeatEffects`**
   - **File:** [`src/server/character/properties/feats/feats_effects.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/feats/feats_effects.ts)
   - Add `Expeditious Dodge`, `Darkstalker`, and `Shadow Blade Technique` (plus class abilities if listed).
3. **Clean Up Item Effects & Action Registration**
   - **File:** [`src/server/character/gear/items/items.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/items/items.ts)
   - Remove the duplicate `'Once per Day: Greater Invisibility for 7 rounds'` effect from `Explorer's Outfit Masterwork`.
   - Register clickable actions for `Whisperleaf Striders` (*Greater Invisibility* for 7 rounds) and `Ring of Chameleon Power` (+10 competence bonus to *Hide*).

---

## Phase 4: Skills, Subrace Parsing & Test Suite Updates

1. **Fix Case-Insensitive Skill Synergy Lookup**
   - **File:** [`src/server/character/properties/skills.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/skills.ts#L167-L177)
   - Match `synergySkillName` case-insensitively (`s.name.toLowerCase() === synergySkillName.toLowerCase()`).
2. **Support Subrace Prefixes (`High Elf`) in `ParseRaceAndClassesString`**
   - **File:** [`src/server/character/properties/race_and_classes.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/race_and_classes.ts#L25-L56)
   - Match known races from `Races` at the start of the string (and normalize `High Elf` -> `Elf`).
3. **Update `morty_test.txt` and Unit Tests**
   - **Files:**
     - [`src/tests/local_tests/test_character_sheets/morty_test.txt`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/tests/local_tests/test_character_sheets/morty_test.txt)
     - [`src/tests/local_tests/local_character.test.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/tests/local_tests/local_character.test.ts)
     - [`src/tests/local_tests/grapple.test.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/tests/local_tests/grapple.test.ts)
     - [`src/tests/local_tests/armor_class.test.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/tests/local_tests/armor_class.test.ts)
   - Update [`morty_test.txt`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/tests/local_tests/test_character_sheets/morty_test.txt) with [`docs/morty_gdoc_sheet.txt`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/docs/morty_gdoc_sheet.txt), update existing assertions, and add dedicated tests for Beguiler/Unseen Seer spellcasting, Elven Thinblade with Weapon Finesse, and Quick/Shaky flaw/trait calculations.
   - Run `npm test`, `npm run build`, and `npm run lint` to verify zero errors.

