# Gap Analysis: Morty ("Mortfinn aep Dessantein") Live GSheet vs. GDoc Implementation

This document details all gaps between the live Google Sheet (`1iH7NBmKbJfwmRf1V2_KABPU3R08i5T2WvlYlhpPQ18k`) for **Mortfinn aep Dessantein ("Morty")** (`Elf Rogue 5 / Shadowdancer 2 / Beguiler 1 / Unseen Seer 5`) and the current GDoc-based character parser and calculation engine.

---

## 1. Key Discoveries from Inspecting the Live Google Sheet

Direct inspection of the `Basic`, `Spells`, `Skills`, `Bags`, and `Personal` tabs via `gsheets` revealed the exact underlying formulas and items:

1. **Ability Score Formulas (`Basic!H1:L7`):**
   - `Str`: Base `12` (`+1`)
   - `Dex`: `=18+StatRacial(2)+1+1+1` = `23` Base + `4` (`Gloves of Dex +4`) = **`27 (+8)`**
   - `Con`: `=14-StatRacial(2)` = `12` Base + `2` (`TEMP`) + `1` (in `STAT` formula `=I4+L4+1`) = **`15 (+2)`**
   - `Int`: `=18+StatRacial(2)` = `20` Base + `2` (`Headband of Intellect +2`) = **`22 (+6)`**
   - `Wis`: Base `16` (`+3`)
   - `Cha`: Base `12` (`+1`)
2. **Exact Skill Ranks (`Skills!A1:E42`):**
   - `Balance`: `5` ranks (`16` total with +8 Dex, +2 Tumble synergy, +1 Prayer)
   - `Climb`: `5` ranks (`9` total with +1 Str, +2 Use Rope synergy, +1 Prayer)
   - `Concentration`: `12` ranks (`15` total with +2 Con, +1 Prayer)
   - `Decipher Script`: `5` ranks (`13` total with +6 Int, +1 Ioun Temple bonus, +1 Prayer)
   - `Disable Device`: `9` ranks (`16` total with +6 Int, +1 Prayer)
   - `Escape Artist`: `5` ranks (`16` total with +8 Dex, +2 Use Rope synergy, +1 Prayer)
   - `Hide`: `16` ranks (`35` total with +8 Dex, +5 Elven Cloak, +5 Ring of Chameleon Power, +1 Prayer)
   - `Jump`: `5` ranks (`9` total with +1 Str, +2 Tumble synergy, +1 Prayer)
   - `Knowledge (arcana)`: `5` ranks (`12` total with +6 Int, +1 Prayer)
   - `Listen` / `Spot`: `16` ranks each (`22` total with +3 Wis, +2 Elf racial, +1 Prayer)
   - `Move Silently`: `16` ranks (`30` total with +8 Dex, +5 Whisperleaf Striders, +1 Prayer)
   - `Open Lock`: `9` ranks (`18` total with +8 Dex, +1 Prayer)
   - `Perform (Dance)`: `5` ranks (`7` total with +1 Cha, +1 Prayer)
   - `Search`: `16` ranks (`25` total with +6 Int, +2 Elf racial, +1 Prayer)
   - `Sense Motive`: `4` ranks (`8` total with +3 Wis, +1 Prayer)
   - `Spellcraft`: `8` ranks (`17` total with +6 Int, +2 Knowledge (arcana) synergy, +1 Prayer)
   - `Swim`: `1` rank (`3` total with +1 Str, +1 Prayer)
   - `Tumble`: `16` ranks (`27` total with +8 Dex, +2 Jump synergy, +1 Prayer)
   - `Use Magic Device`: `9` ranks (`15` total with +1 Cha, +2 Decipher Script synergy, +2 Spellcraft synergy, +1 Prayer)
   - `Use Rope`: `5` ranks (`16` total with +8 Dex, +2 Escape Artist synergy, +1 Prayer)
3. **Weapons & Arsenal (`Basic!A9:G13` & `Bags!A11:N35`):**
   - `Deadly Precision Wingblade Elvencraft Thinblade +1 (+1Atk 1d8+1/18-20x3 +1d6 Sneak)` (grants +1d6 Sneak Attack from *Deadly Precision* weapon property)
   - `Masterwork Composite Longbow of Frost (Medium Bone and Blueoak) (+1Atk 1d8+1+1/20x3) (+1 Magic +1Str+1d6Cold)`
   - `Adamantine Masterwork Dagger (+1Atk 1d4/19-20x2)`
   - `Repaired Shadow Dagger (+1Atk 1d4+1/19-20x2, Cold Iron, Ghost Touch)`
   - `Lightning Dagger, masterwork (+1Atk 1d4/19-20x2 + 1d6 Elec)`
   - `Ice Dagger, masterwork (+1Atk 1d4/19-20x2 + 1d6 Cold)`
   - `Sap, Masterwork (+1Atk 1d6/20x2)`
   - `Light Purple Mournlode Mace (+1Atk 1d6+1/X2)`
   - `Mysterious Longspear (+1Atk 1d8+2d6/20x3)`
4. **Spellcasting & `Illusion Spell Power` (`Spells!A1:N85`):**
   - Base Caster Level = `6` (`1 Beguiler + 5 Unseen Seer`) + `4` (`Practiced Spellcaster`) = **`10`**.
   - With `Illusion Spell Power` (+1 CL to Illusion, -1 CL to other schools): **Illusion spells cast at CL 11**, and **all other schools cast at CL 9**.
   - Includes **Advanced Learning** spells: `Invisibility, Swift` (1st level) and `Instant Diversion` (1st level), plus `Crown of Veils` (3rd level).

---

## 2. Critical Parser & Calculation Engine Gaps

### Gap A1: `Beguiler` and `Unseen Seer` Missing from `SpellcasterClasses`
- **Location:** [`_constants.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/_constants.ts#L50-L60)
- **Current Behavior:** `'Beguiler'` and `'Unseen Seer'` are defined in [`beguiler.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/classes_data/beguiler.ts) and [`unseen_seer.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/classes_data/unseen_seer.ts), but are omitted from `SpellcasterClasses`.
- **Impact:** [`ApplyClassesEffects`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/race_and_classes.ts#L83), [`ParsePreparedSpells`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/parsers/prepared_spells.ts#L18), and [`ParsePreparedSpellsStructure`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/parsers/doc_parser.ts#L81) ignore Morty's spellcasting completely.

### Gap A2: `Practiced Spellcaster` Feat Progression & School-Specific CL (`Illusion Spell Power`)
- **Location:** [`feats_effects.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/feats/feats_effects.ts#L359-L382)
- **Current Behavior:**
  1. Uses `character.GetClassLevel(casterClassName)` (`1`) instead of `casterLevel.score` (`6` = `1 Beguiler + 5 Unseen Seer`) when clamping the `+4` bonus to `character.HD`.
  2. Fails if `Practiced Spellcaster` is written without `: Beguiler` even when the character only has a single spellcasting class.
  3. School-specific caster level modifiers (`Illusion Spell Power`: `+1` CL to Illusion, `-1` CL to non-Illusion) are not modeled in `SpellCasterClassData` or `SpellData`.

### Gap A3: `Elven Thinblade` Missing from `WeaponsData` & `Weapon Finesse`
- **Location:** [`weapons.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/weapons/weapons.ts#L84-L123) & [`weapons.ts` (Weapon Finesse)](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/weapons/weapons.ts#L338-L345)
- **Current Behavior:**
  - `Thinblade` / `Elven Thinblade` is not in `WeaponsData` or `CustomWeapons`, so `Deadly Precision Wingblade Elvencraft Thinblade +1` and `WhiteWood Thinblade` are ignored as weapons.
  - Per D&D 3.5e (*Races of the Wild*, p. 165), the **Elven Thinblade** (`1d8`, `18-20/x2`, One-Handed Exotic Melee) explicitly qualifies for **Weapon Finesse** and must be added to `finesseBaseNames`.
  - [`Weapon.parseDescription`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/weapons/weapons.ts#L320-L326) does not parse custom critical overrides from the weapon description (e.g., `18-20x3` on Morty's Wingblade Thinblade).

### Gap A4: Masterwork & Adamantine Weapon Attack-Only Enhancement
- **Location:** [`weapons.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/weapons/weapons.ts#L140-L147) & [`weapons.ts` (Enhancement & Bonuses)](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/weapons/weapons.ts#L284-L378)
- **Current Behavior:**
  - Morty carries multiple non-magical masterwork/adamantine weapons (`Adamantine Masterwork Dagger`, `Lightning Dagger, masterwork`, `Ice Dagger, masterwork`, `Sap, Masterwork`).
  - Per D&D 3.5e SRD, **Masterwork** and **Adamantine** weapons provide a **+1 enhancement bonus on attack rolls only**, not damage rolls. Currently, `this.enhancement` adds to both attack and damage if `+1` is in the description, or `0` to both if omitted.
  - [`GetSpecialWeaponMaterial`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/weapons/weapons.ts#L140-L147) strips `'Adamantine'` from `Adamantine Dagger`, losing the material name from the weapon's display name.

### Gap A5: Missing Flaws & Traits (`Quick` and `Shaky`)
- **Location:** [`flaws_effects.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/flaws/flaws_effects.ts#L6-L48)
- **Current Behavior:**
  - **`Quick`** (+10 ft. to base land speed, -1 HP/level): Missing from `FlawsEffects`. Morty's base speed remains `30 ft.` instead of `40 ft.` (which reaches `70 ft.` with *Haste* or *Expeditious Retreat*).
  - **`Shaky`** (-2 penalty on all ranged attack rolls): Missing from `FlawsEffects`. Morty's `Masterwork Composite Longbow of Frost` does not receive the `-2` ranged attack penalty.

### Gap A6: Case-Sensitivity in Skill Synergies
- **Location:** [`skills.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/skills.ts#L167-L177)
- **Current Behavior:** `SkillsSynergyReversed` defines `'Knowledge (arcana)'` with a lowercase `a`, and line 170 checks `s.name === synergySkillName` case-sensitively. Writing `Knowledge (Arcana)` fails to trigger the +2 synergy on `Spellcraft`.

---

## 3. Missing Feats, Items, Spells & Ability Modifiers

1. **Missing Feats in [`feats_effects.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/feats/feats_effects.ts):**
   - `Expeditious Dodge` (*Races of the Wild*): +2 dodge bonus to AC when moving at least 40 ft. in a round.
   - `Darkstalker` (*Lords of Madness*): Stealth vs. blindsense/blindsight/scent/tremorsense.
   - `Shadow Blade` / `Shadow Blade Technique` (*Tome of Battle*).
2. **Item Bugs & Missing Effects in [`items.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/items/items.ts):**
   - **Copy-Paste Bug:** [`items.ts` lines 217–219](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/gear/items/items.ts#L217-L219) attaches `'Once per Day: Greater Invisibility for 7 rounds'` to `Explorer's Outfit Masterwork`, duplicating `Whisperleaf Striders`.
   - **Activated Item Actions:** `Whisperleaf Striders` (1/day *Greater Invisibility* for 7 rounds) and `Ring of Chameleon Power` (+10 competence bonus to *Hide* — which is active in the GSheet to reach `Hide +35`!) do not register actions or apply the +5/+10 Hide bonus.
   - **Inline Ability Modifiers (`Con 12 -> 15`):** In the GSheet, Morty's Con is `12` base + `2` (`TEMP`) + `1` = `15 (+2)`. Since no Con item is in `Battle Gear`, [`ability_parser.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/properties/abilities/ability_parser.ts) needs to either parse inline `{+3}` / `+2 enhancement` modifiers or have the Con source represented.
3. **Missing Beguiler / Unseen Seer Spells in [`spells.ts`](file:///c:/Users/Alex/OneDrive/Documents/code/Character%20Sheet%20Viewer/src/server/character/spells.ts):**
   - All 44 spells on Morty's `Spells` tab (Levels 0–3, including PHB II Beguiler spells like *Rouse*, *Whelm*, *Blinding Color Surge*, *Stay the Hand*, *Vertigo*, *Whelming Blast*, *Crown of Veils*, *Halt*, *Hesitate*, *Inevitable Defeat*, *Legion of Sentinels*, *Vertigo Field*, and Advanced Learning spells *Invisibility, Swift* and *Instant Diversion*) need entries in `SpellsData` so `ExtractAndValidateSpell` marks them valid.
