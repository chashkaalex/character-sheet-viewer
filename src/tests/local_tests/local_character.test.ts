import * as path from 'path';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { getCharacterRep } from '../../server/character/character_rep';
import { sanitizeDbLink } from '../../server/character/parser_utils';
import { Character } from '../../server/character/character';
import { IsAWeapon } from '../../server/character/gear/weapons/weapons';
import { ParseRaceAndClassesString } from '../../server/character/properties/race_and_classes';

const THRORS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
const BESS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');
const MORTY_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'morty_test.txt');
const DEIN_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'dein_test.txt');
const NAETHAN_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'naethan_test.txt');

describe('Local Character Parsing', () => {
    test('should parse Thror character sheet correctly and without errors', () => {
        const char = GetCharacterByDocId(THRORS_TEST_FILE) as Character;

        // Check for parse success
        expect(char.parseSuccess).toBe(true);
        if (char.parseErrors.length > 0) {
            console.error('Parse Errors:', char.parseErrors);
        }
        expect(char.parseErrors).toHaveLength(0);

        //basic data
        expect(char.race).toBe('Dwarf');
        expect(char.hp.max).toBeGreaterThan(0);
        expect(char.speed.currentScore).toBe(50);
        console.log('Thror AC:', char.ac.currentArmorClass);

        //abilities
        expect(char.abilities.Str!.currentScore).toBe(16);
        expect(char.abilities.Dex!.currentScore).toBe(18);
        expect(char.abilities.Con!.currentScore).toBe(14);
        expect(char.abilities.Int!.currentScore).toBe(12);
        expect(char.abilities.Wis!.currentScore).toBe(22);
        expect(char.abilities.Cha!.currentScore).toBe(10);

        //Flaws, Traits, Quirks
        expect(char.HasFlaw('Keeping Grudge')).toBe(true);

        //Skills
        expect(char.skills.find(s => s.name === 'Balance')!.bonus).toBe(15);
        expect(char.skills.find(s => s.name === 'Climb')!.bonus).toBe(5);
        expect(char.skills.find(s => s.name === 'Concentration')!.bonus).toBe(4);
        expect(char.skills.find(s => s.name === 'Escape Artist')!.bonus).toBe(6);
        expect(char.skills.find(s => s.name === 'Hide')!.bonus).toBe(12);
        expect(char.skills.find(s => s.name === 'Jump')!.bonus).toBe(15);
        expect(char.skills.find(s => s.name === 'Knowledge (Religion)')!.bonus).toBe(9);
        expect(char.skills.find(s => s.name === 'Listen')!.bonus).toBe(16);
        expect(char.skills.find(s => s.name === 'Move Silently')!.bonus).toBe(12);
        expect(char.skills.find(s => s.name === 'Profession (Lamplighter)')!.bonus).toBe(8);
        expect(char.skills.find(s => s.name === 'Spellcraft')!.bonus).toBe(5);
        expect(char.skills.find(s => s.name === 'Spot')!.bonus).toBe(16);
        expect(char.skills.find(s => s.name === 'Tumble')!.bonus).toBe(16);

        //check domains
        expect(char.spellCasting.GetSpellCasterClassData('Cleric')!.domains).toEqual(['Protection', 'Strength']);

        //check caster levels
        expect(char.spellCasting.classSpellCastingData.get('Cleric')).toBeDefined();
        expect(char.spellCasting.classSpellCastingData.get('Cleric')!.level.currentScore).toBe(10);

        //check spells
        const clericSpellcasting = char.spellCasting.classSpellCastingData.get('Cleric');
        expect(clericSpellcasting).toBeDefined();
        if (clericSpellcasting) {
            expect(clericSpellcasting.preparedSpells['0']).toBeDefined();
            expect(clericSpellcasting.preparedSpells['0']).toHaveLength(5);
            expect(clericSpellcasting.preparedSpells['1']).toBeDefined();
            expect(clericSpellcasting.preparedSpells['1']).toHaveLength(5);
            expect(clericSpellcasting.preparedSpells['1 - domain']).toBeDefined();
            expect(clericSpellcasting.preparedSpells['1 - domain']).toHaveLength(1);
            expect(clericSpellcasting.preparedSpells['2']).toBeDefined();
            expect(clericSpellcasting.preparedSpells['2']).toHaveLength(5);
            expect(clericSpellcasting.preparedSpells['2 - domain']).toBeDefined();
            expect(clericSpellcasting.preparedSpells['2 - domain']).toHaveLength(1);
            expect(clericSpellcasting.preparedSpells['3']).toBeDefined();
            expect(clericSpellcasting.preparedSpells['3']).toHaveLength(3);
            expect(clericSpellcasting.preparedSpells['3 - domain']).toBeDefined();
            expect(clericSpellcasting.preparedSpells['3 - domain']).toHaveLength(1);
        }

        // Check Unarmed Damage
        const unarmedWeapon = char.weapons.find(w => w.baseName === 'Unarmed');
        expect(unarmedWeapon).toBeDefined();
        // Thror's effective level: 6 Monk + 3 Sacred Fist + 4 SUS + 5 Belt = 18 effective level => 2d8. INA takes it to 2d10.
        expect(unarmedWeapon!.damage).toBe('2d10');

        // Check Actions
        expect(char.actions).toContain('Stunning Fist');

        // Optional: Check warnings if we want to be strict, or just log them
        if (char.parseWarnings.length > 0) {
            console.warn('Parse Warnings:', char.parseWarnings);
        }

        const characterRep = getCharacterRep(char);
        expect(characterRep).toBeDefined();
    });

    test('should parse Bess character sheet correctly and without errors', () => {
        const bess = GetCharacterByDocId(BESS_TEST_FILE) as Character;

        // Check for parse success
        expect(bess.parseSuccess).toBe(true);
        if (bess.parseErrors.length > 0) {
            console.error('Parse Errors:', bess.parseErrors);
        }
        expect(bess.parseErrors).toHaveLength(0);

        //basic data
        expect(bess.race).toBe('Half-Elf');
        expect(bess.hp.max).toBeGreaterThan(0);
        expect(bess.speed.currentScore).toBe(30);
        console.log('Bess AC:', bess.ac.currentArmorClass);

        //skills
        expect(bess.skills.find(s => s.name === 'Balance')!.bonus).toBe(6);
        expect(bess.skills.find(s => s.name === 'Bluff')!.bonus).toBe(25);
        expect(bess.skills.find(s => s.name === 'Concentration')!.bonus).toBe(10);
        expect(bess.skills.find(s => s.name === 'Decipher Script')!.bonus).toBe(8);
        expect(bess.skills.find(s => s.name === 'Diplomacy')!.bonus).toBe(33);
        expect(bess.skills.find(s => s.name === 'Disguise')!.bonus).toBe(14);
        expect(bess.skills.find(s => s.name === 'Gather Information')!.bonus).toBe(26);
        expect(bess.skills.find(s => s.name === 'Knowledge (dungeoneering)')!.bonus).toBe(4);
        expect(bess.skills.find(s => s.name === 'Listen')!.bonus).toBe(11);
        expect(bess.skills.find(s => s.name === 'Perform (flute)')!.bonus).toBe(8);
        expect(bess.skills.find(s => s.name === 'Perform (mandolin)')!.bonus).toBe(10);
        expect(bess.skills.find(s => s.name === 'Perform (voice)')!.bonus).toBe(22);
        expect(bess.skills.find(s => s.name === 'Perform (White Oak Lute)')!.bonus).toBe(12);
        expect(bess.skills.find(s => s.name === 'Ride')!.bonus).toBe(5);
        expect(bess.skills.find(s => s.name === 'Search')!.bonus).toBe(4 + 3 + 1);
        expect(bess.skills.find(s => s.name === 'Sense Motive')!.bonus).toBe(20);
        expect(bess.skills.find(s => s.name === 'Sleight of Hand')!.bonus).toBe(10);
        expect(bess.skills.find(s => s.name === 'Spellcraft')!.bonus).toBe(14);
        expect(bess.skills.find(s => s.name === 'Spot')!.bonus).toBe(15);
        expect(bess.skills.find(s => s.name === 'Tumble')!.bonus).toBe(12);
        expect(bess.skills.find(s => s.name === 'Use Magic Device')!.bonus).toBe(21);

        console.log('Bess parse warnings:', bess.parseWarnings);

        // Verify body slot warnings: Amulet of Pelor/Set (holy symbol) and Brooch of Shielding
        // should NOT produce a "body slot is already taken" warning for Neck.
        const slotWarnings = bess.parseWarnings.filter(w => w.includes('body slot') && w.includes('is already taken'));
        expect(slotWarnings.some(w => w.includes('Neck'))).toBe(false);

        // Verify that BOTH items applied their effects!
        // Amulet of Pelor/Set gives +1 to Saves
        expect(bess.saves.Fort!.effects.some(e => e.status === 'Amulet of Pelor/Set')).toBe(true);

        // Brooch of Shielding goes to Special
        expect(bess.Special.list.some(p => p.status === 'Brooch of Shielding')).toBe(true);

        // Verify that BardicSpecial is no longer a caster class
        expect(bess.spellCasting.classSpellCastingData.has('BardicSpecial')).toBe(false);

        // Verify that 'songs' slots were parsed into the Bard caster class
        const bardSpec = bess.spellCasting.classSpellCastingData.get('Bard');
        expect(bardSpec).toBeDefined();
        if (bardSpec) {
            expect(bardSpec.preparedSpells['songs']).toBeUndefined();
            expect(bess.actionCategoryResources['songs']).toEqual({ remaining: 11, max: 13, label: 'Uses' });

            // Verify that standard levels are also parsed with numeric keys
            expect(bardSpec.preparedSpells['0']).toBeDefined();
            expect(bardSpec.preparedSpells['0']).toHaveLength(3);

            // Verify spell slots calculation including bonus spells for unlocked level 5 (base 0 + 1 bonus)
            expect(bardSpec.spellSlots[5]).toBe(1);
        }

        // Validate Song of the Heart feat is automatically applied to Bess's bardic specials
        const bardCasterData = bess.spellCasting.GetSpellCasterClassData('Bard')!;
        const icProperty = bardCasterData.bardicSpecials!.find((s) => s.name === 'Inspire Courage')!.value!;
        expect(icProperty.score).toBe(2); // Base +2 for lvl 13 Bard
        expect(icProperty.currentScore).toBe(3); // +1 from Song of the Heart

        const competenceProp = bardCasterData.bardicSpecials!.find((s) => s.name === 'Inspire Competence')!.value!;
        expect(competenceProp.score).toBe(2);
        expect(competenceProp.currentScore).toBe(3);

        const greatnessProp = bardCasterData.bardicSpecials!.find((s) => s.name === 'Inspire Greatness')!.value!;
        expect(greatnessProp.score).toBe(2);
        expect(greatnessProp.currentScore).toBe(3);

        // Emulate `OnCastSpell` generating a +3 string and Verify it maps cleanly in _general_effects
        const generatedStatusName = `Inspire Courage +${icProperty.currentScore}`;
        const { GetEffects, StatusesEffects } = require('../../server/character/_general_effects');
        const retrievedEffects = GetEffects(StatusesEffects, generatedStatusName);
        expect(retrievedEffects).not.toBeNull();
        expect(retrievedEffects!.length).toBe(3);
        expect(retrievedEffects!.find(e => e.property === 'bab')!.value).toBe(3); // Prove numerical 3 carried over via RegExp

        // Verify Weapons (now parsed from items)
        const unarmed = bess.weapons.find(w => w.baseName === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.attackBonus.bonus).toBe(12); // Unarmed is +12 (9 BAB + 3 Dex from Finesse)
        expect(unarmed!.damage).toBe('1d3'); // Unarmed damage is now default 1d3
        expect(unarmed!.statsString).toBe('Attack: 12 Damage: 1d3 + 1 Crit. X2');

        const shortSword = bess.weapons.find(w => w.baseName === 'Short Sword');
        expect(shortSword).toBeDefined();
        expect(shortSword!.attackBonus.ability.name).toBe('Dex'); // Strength modifier is +1, Dexterity is +3.
        expect(shortSword!.attackBonus.bonus).toBe(13); // 9 BAB + 3 Dex from Finesse + 1 enhancement = 13
        expect(shortSword!.damage).toBe('1d6');
        expect(shortSword!.statsString).toBe('Attack: 13 Damage: 1d6 + 4 + 2 poison Crit. 19-20X2'); // Total bonus: 1 (Str) + 2 (Weapon bonus) + 1 (enhancement) = +4.

        const crossbow = bess.weapons.find(w => w.name.includes('Light Coil Crossbow'));
        expect(crossbow).toBeDefined();
        expect(crossbow!.attackBonus.bonus).toBe(13); // 9 BAB + 3 Dex from Finesse + 1 enhancement = 13
        expect(crossbow!.damage).toBe('1d8');
        expect(crossbow!.statsString).toBe('Attack: 13 Damage: 1d8 + 1 Crit. 19-20X2'); // 1 enhancement

        const characterRep = getCharacterRep(bess);
        expect(characterRep).toBeDefined();
        expect(bess.partyMembers).toContain('thror_test');
        expect(bess.quickStatuses).toContain('Thror is preparing spells');
        expect(characterRep.quickStatuses).toContain('Thror is preparing spells');
        expect(bess.partyNickname).toBe('Bess');
        expect(characterRep.partyNickname).toBe('Bess');
    });

    test('should parse Morty character sheet correctly and without errors', () => {
        const char = GetCharacterByDocId(MORTY_TEST_FILE) as Character;

        // Check for parse success
        expect(char.parseSuccess).toBe(true);
        if (char.parseErrors.length > 0) {
            console.error('Parse Errors:', char.parseErrors);
        }
        expect(char.parseErrors).toHaveLength(0);

        // Basic data
        expect(char.race).toBe('Elf');
        expect(char.hp.max).toBeGreaterThan(0);
        expect(char.speed.currentScore).toBe(40); // 30 base Elf + 10 Quick trait
        console.log('Morty AC:', char.ac.currentArmorClass);

        // Abilities (Dex includes +4 Gloves, Con includes +2 enhancement + 1 inherent, Int includes +2 Headband)
        expect(char.abilities.Str!.currentScore).toBe(12);
        expect(char.abilities.Dex!.currentScore).toBe(27);
        expect(char.abilities.Con!.currentScore).toBe(15);
        expect(char.abilities.Int!.currentScore).toBe(22);
        expect(char.abilities.Wis!.currentScore).toBe(16);
        expect(char.abilities.Cha!.currentScore).toBe(12);

        // Skills
        expect(char.skills.find(s => s.name === 'Listen')!.bonus).toBe(21);
        expect(char.skills.find(s => s.name === 'Search')!.bonus).toBe(24);
        expect(char.skills.find(s => s.name === 'Spot')!.bonus).toBe(21);
        expect(char.skills.find(s => s.name === 'Balance')!.bonus).toBe(15);
        expect(char.skills.find(s => s.name === 'Climb')!.bonus).toBe(8);
        expect(char.skills.find(s => s.name === 'Concentration')!.bonus).toBe(14);
        expect(char.skills.find(s => s.name === 'Decipher Script')!.bonus).toBe(11);
        expect(char.skills.find(s => s.name === 'Disable Device')!.bonus).toBe(15);
        expect(char.skills.find(s => s.name === 'Escape Artist')!.bonus).toBe(15);
        expect(char.skills.find(s => s.name === 'Hide')!.bonus).toBe(29);
        expect(char.skills.find(s => s.name === 'Jump')!.bonus).toBe(8);
        expect(char.skills.find(s => s.name === 'Knowledge (arcana)')!.bonus).toBe(11);
        expect(char.skills.find(s => s.name === 'Move Silently')!.bonus).toBe(29);
        expect(char.skills.find(s => s.name === 'Open Lock')!.bonus).toBe(17);
        expect(char.skills.find(s => s.name === 'Perform (Dance)')!.bonus).toBe(6);
        expect(char.skills.find(s => s.name === 'Sense Motive')!.bonus).toBe(7);
        expect(char.skills.find(s => s.name === 'Spellcraft')!.bonus).toBe(18);
        expect(char.skills.find(s => s.name === 'Swim')!.bonus).toBe(2);
        expect(char.skills.find(s => s.name === 'Tumble')!.bonus).toBe(26);
        expect(char.skills.find(s => s.name === 'Use Magic Device')!.bonus).toBe(14);
        expect(char.skills.find(s => s.name === 'Use Rope')!.bonus).toBe(15);

        // Weapons — Morty has Weapon Finesse so unarmed uses Dex
        const unarmed = char.weapons.find(w => w.baseName === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.damage).toBe('1d3');
        expect(unarmed!.attackBonus.ability.name).toBe('Dex');
        expect(unarmed!.attackBonus.bonus).toBe(15);
        expect(unarmed!.statsString).toBe('Attack: 15 Damage: 1d3 + 1 Crit. X2');

        // Amulet of Pelor applies +2 saves
        expect(char.saves.Fort!.effects.some(e => e.status === 'Amulet of Pelor with Maple Leaf')).toBe(true);

        // Brooch of Shielding goes to Special
        expect(char.Special.list.some(p => p.status === 'Brooch of Shielding')).toBe(true);

        // Beguiler + Unseen Seer spellcasting with Practiced Spellcaster
        const beguilerData = char.spellCasting.GetSpellCasterClassData('Beguiler');
        expect(beguilerData).not.toBeNull();
        expect(beguilerData!.level.score).toBe(6); // 1 Beguiler + 5 Unseen Seer
        expect(beguilerData!.level.currentScore).toBe(10); // +4 from Practiced Spellcaster: Beguiler
        expect(beguilerData!.spellSlots.slice(0, 4)).toEqual([6, 8, 7, 4]);
        expect(beguilerData!.preparedSpells['0']).toHaveLength(6);
        expect(beguilerData!.preparedSpells['1']).toHaveLength(8);
        expect(beguilerData!.preparedSpells['2']).toHaveLength(7);
        expect(beguilerData!.preparedSpells['3']).toHaveLength(4);

        // Verify all known spells across levels 0-3 validate against SpellsData
        for (const lvl of ['0', '1', '2', '3']) {
            const spells = beguilerData!.knownSpells[lvl];
            expect(spells).toBeDefined();
            expect(spells.length).toBeGreaterThan(0);
            for (const entry of spells) {
                expect(entry.isValid).toBe(true);
            }
        }

        // Verify Thinblade +1 with Weapon Finesse and custom 18-20x3 crit override
        const thinblade = char.weapons.find(w => w.baseName === 'Thinblade');
        expect(thinblade).toBeDefined();
        expect(thinblade!.attackBonus.ability.name).toBe('Dex');
        expect(thinblade!.attackBonus.bonus).toBe(16); // BAB 7 + Dex 8 + 1 enhancement
        expect(thinblade!.damageBonus.bonus).toBe(2); // Str 1 + 1 enhancement
        expect(thinblade!.critValue).toBe('18-20X3');
        expect(thinblade!.statsString).toBe('Attack: 16 Damage: 1d8 + 2 + 1d6 sneak attack Crit. 18-20X3');

        // Verify Adamantine Dagger (Masterwork) preserves material name and applies +1 attack-only bonus
        const adamantineDagger = char.weapons.find(w => w.name.includes('Adamantine Dagger'));
        expect(adamantineDagger).toBeDefined();
        expect(adamantineDagger!.isMasterwork).toBe(true);
        expect(adamantineDagger!.enhancement).toBe(0);
        expect(adamantineDagger!.attackBonus.bonus).toBe(16); // BAB 7 + Dex 8 + 1 Masterwork
        expect(adamantineDagger!.damageBonus.bonus).toBe(1); // Str 1 + 0 enhancement
        expect(adamantineDagger!.statsString).toBe('Attack: 16 Damage: 1d4 + 1 Crit. 19-20X2');

        // Verify Masterwork Composite Longbow of Frost (+1 Str) with Shaky (-2 ranged attack penalty)
        const longbow = char.weapons.find(w => w.baseName === 'Composite Longbow');
        expect(longbow).toBeDefined();
        expect(longbow!.name).toContain('(+1 Str)');
        expect(longbow!.isMasterwork).toBe(true);
        expect(longbow!.enhancement).toBe(0);
        expect(longbow!.attackBonus.bonus).toBe(14); // BAB 7 + Dex 8 + 1 Masterwork - 2 Shaky
        expect(longbow!.damageBonus.bonus).toBe(1); // +1 Str rating + 0 masterwork enhancement
        expect(longbow!.dmgValue).toBe('1d8 + 1 + 1d6 cold');

        // Verify Phase 3 flaws/traits, feats, and item actions
        expect(char.HasFlaw('Quick')).toBe(true);
        expect(char.HasFlaw('Shaky')).toBe(true);
        expect(char.HasFeat('Expeditious Dodge')).toBe(true);
        expect(char.HasFeat('Darkstalker')).toBe(true);
        expect(char.HasFeat('Shadow Blade Technique')).toBe(true);
        expect(char.actions).toContain('Greater Invisibility (Whisperleaf Striders)');
        expect(char.actions).toContain('Chameleon Power (Hide +10)');
        expect(char.actions).toContain('Chameleon Power (Disguise Self)');
        expect(char.Special.list.some(p => p.status === 'Explorer\'s Outfit Masterwork')).toBe(false);

        // Verify Whisperleaf Striders (Green Dragon scale Boots) occupies the Feet slot and parses 0.5 lb weight
        const whisperleaf = char.battleGear.find(i => i.name === 'Whisperleaf Striders');
        expect(whisperleaf).toBeDefined();
        expect(whisperleaf!.bodySlot).toBe('Feet');
        expect(whisperleaf!.weight).toBe(0.5);
        expect(char.bodySlots.get('Feet')).toBe(0);
        expect(char.Special.list.some(p => p.status === 'Whisperleaf Striders' && p.description === 'Pass without trace')).toBe(true);

        // Verify subrace title parsing (e.g. "High Elf") resolves to known race "Elf"
        const parsedSubrace = ParseRaceAndClassesString('(High Elf Rogue 5/Shadowdancer 2/Beguiler 1/Unseen Seer 5)');
        expect(parsedSubrace.race).toBe('Elf');
        expect(parsedSubrace.classes).toEqual([
            { name: 'Rogue', level: 5 },
            { name: 'Shadowdancer', level: 2 },
            { name: 'Beguiler', level: 1 },
            { name: 'Unseen Seer', level: 5 }
        ]);

        // Optional: log warnings
        if (char.parseWarnings.length > 0) {
            console.warn('Morty Parse Warnings:', char.parseWarnings);
        }
    });

    test('should parse Dein character sheet correctly and without errors', () => {
        const char = GetCharacterByDocId(DEIN_TEST_FILE) as Character;

        // Check for parse success
        expect(char.parseSuccess).toBe(true);
        if (char.parseErrors.length > 0) {
            console.error('Parse Errors:', char.parseErrors);
        }
        expect(char.parseErrors).toHaveLength(0);

        // Basic data
        expect(char.race).toBe('Dwarf');
        expect(char.hp.max).toBe(107);
        expect(char.speed.currentScore).toBe(20);
        console.log('Dein AC:', char.ac.currentArmorClass);

        // Check Shield Specialization (Tower) feat effect
        const shieldSpecializationEffect = char.ac.activeEffects.find(
            e => e.status === 'Shield Specialization (Tower)'
        );
        expect(shieldSpecializationEffect).toBeDefined();
        expect(shieldSpecializationEffect!.value).toBe(1);

        // Abilities (Str includes +4 Belt of Giant Strength, Con base 15 +2 racial)
        expect(char.abilities.Str!.currentScore).toBe(22);
        expect(char.abilities.Dex!.currentScore).toBe(12);
        expect(char.abilities.Con!.currentScore).toBe(17);
        expect(char.abilities.Int!.currentScore).toBe(13);
        expect(char.abilities.Wis!.currentScore).toBe(11);
        expect(char.abilities.Cha!.currentScore).toBe(8);

        // ACP & Skills
        expect(char.acp.currentScore).toBe(-10);
        expect(char.skills.find(s => s.name === 'Craft (armor)')!.bonus).toBe(12); // Int based, not affected by ACP
        expect(char.skills.find(s => s.name === 'Jump')!.bonus).toBe(-3);          // Str 6 + 1 rank - 10 ACP = -3
        expect(char.skills.find(s => s.name === 'Swim')!.bonus).toBe(-5);          // Str 6 + 9 rank - 20 ACP (double) = -5
        expect(char.skills.find(s => s.name === 'Climb')!.bonus).toBe(-3);         // Str 6 + 1 rank - 10 ACP = -3
        expect(char.skills.find(s => s.name === 'Ride')!.bonus).toBe(2);           // Dex 1 + 11 rank - 10 ACP = 2

        // Weapons — Dein is a Fighter/Monk dwarf with Str focus and a Tower Shield equipped (-2 attack penalty)
        const unarmed = char.weapons.find(w => w.baseName === 'Unarmed');
        expect(unarmed).toBeDefined();
        // Monk 2 = 1d6 unarmed damage
        expect(unarmed!.damage).toBe('1d6');
        expect(unarmed!.attackBonus.bonus).toBe(13); // BAB 9 - 2 (Tower Shield) + 6 Str = 13
        expect(unarmed!.statsString).toBe('Attack: 13 Damage: 1d6 + 6 Crit. X2');

        // Verify Frost Waraxe +1 (Dwarvencraft)
        const waraxe = char.weapons.find(w => w.name.includes('Frost Waraxe'));
        expect(waraxe).toBeDefined();
        expect(waraxe!.damage).toBe('1d10');
        expect(waraxe!.statsString).toBe('Attack: 14 Damage: 1d10 + 9 + 1d6 cold Crit. X3');

        // Verify composite longbow
        const bow = char.weapons.find(w => w.baseName === 'Composite Longbow');
        expect(bow).toBeDefined();
        expect(bow!.attackBonus.bonus).toBe(9); // BAB 9 - 2 (Tower Shield) + 1 Dex + 1 enhancement = 9
        expect(bow!.damage).toBe('1d8');
        expect(bow!.statsString).toBe('Attack: 9 Damage: 1d8 + 6 + 1d6 fire Crit. X3');

        // Verify dagger
        const dagger = char.weapons.find(w => w.baseName === 'Dagger');
        expect(dagger).toBeDefined();
        expect(dagger!.attackBonus.bonus).toBe(13); // BAB 9 - 2 (Tower Shield) + 6 Str = 13
        expect(dagger!.damage).toBe('1d4');
        expect(dagger!.statsString).toBe('Attack: 13 Damage: 1d4 + 6 Crit. 19-20X2');

        // Verify Heavy mace +2
        const heavyMace = char.weapons.find(w => w.name.includes('Heavy mace'));
        expect(heavyMace).toBeDefined();
        expect(heavyMace!.damage).toBe('1d8');
        expect(heavyMace!.statsString).toBe('Attack: 15 Damage: 1d8 + 8 Crit. X2');

        // Verify Light Purple Mournlode Mace (Magic+1)
        const lightMace = char.weapons.find(w => w.name.includes('Light Purple Mournlode Mace'));
        expect(lightMace).toBeDefined();
        expect(lightMace!.damage).toBe('1d6');
        expect(lightMace!.statsString).toBe('Attack: 14 Damage: 1d6 + 7 Crit. X2');

        // No spellcasting for a pure Fighter/Monk
        expect(char.spellCasting.classSpellCastingData.size).toBe(0);

        // No domains
        // No domains property on character anymore
        expect((char as any).domains).toBeUndefined();

        // Verify actions
        expect(char.actions).toContain('Absolute Steel Stance');

        // Optional: log warnings
        if (char.parseWarnings.length > 0) {
            console.warn('Dein Parse Warnings:', char.parseWarnings);
        }
    });

    test('should parse Naethan character sheet correctly and without errors or warnings', () => {
        const char = GetCharacterByDocId(NAETHAN_TEST_FILE) as Character;

        expect(char.parseSuccess).toBe(true);
        expect(char.parseErrors).toEqual([]);
        expect(char.parseWarnings).toEqual([]);

        // Basic data
        expect(char.name).toBe('Naethan');
        expect(char.race).toBe('Human');
        expect(char.GetClassLevel('Crusader')).toBe(9);
        expect(char.HD).toBe(9);
        expect(char.hp.current).toBe(101);
        expect(char.hp.max).toBe(101);
        expect(char.speed.currentScore).toBe(20); // 30 base Human - 10 Heavy Armor

        // Abilities (Str 19 + 2 Belt = 21, Dex 11 + 1 Gloves = 12, Con 16, Int 13, Wis 10, Cha 15)
        expect(char.abilities.Str!.currentScore).toBe(21);
        expect(char.abilities.Dex!.currentScore).toBe(12);
        expect(char.abilities.Con!.currentScore).toBe(16);
        expect(char.abilities.Int!.currentScore).toBe(13);
        expect(char.abilities.Wis!.currentScore).toBe(10);
        expect(char.abilities.Cha!.currentScore).toBe(15);

        // Armor Class: 10 + 9 (Restful Full Plate +1) + 4 (Tower Shield) + 3 (Ring of Protection +3) + 1 (Dex) + 1 (Luck of Heroes) = 28
        expect(char.ac.currentArmorClass).toBe(28);
        expect(char.ac.touchArmorClass).toBe(15);      // 10 + 3 Deflection + 1 Dex + 1 Luck
        expect(char.ac.flatFootedArmorClass).toBe(27); // 28 - 1 Dex

        // Saves:
        // Fort: 6 (Crusader 9) + 3 (Con) + 1 (Cloak of Resistance +1) + 1 (Luck of Heroes) = 11
        // Ref:  3 (Crusader 9) + 1 (Dex) + 1 (Cloak of Resistance +1) + 1 (Luck of Heroes) = 6
        // Will: 3 (Crusader 9) + 0 (Wis) + 2 (Indomitable Soul) + 1 (Cloak of Resistance +1) + 1 (Luck of Heroes) = 7
        expect(char.saves.Fort.bonus).toBe(11);
        expect(char.saves.Ref.bonus).toBe(6);
        expect(char.saves.Will.bonus).toBe(7);

        // ACP & Skills (-6 Full Plate - 10 Tower Shield = -16 ACP)
        expect(char.acp.currentScore).toBe(-16);
        expect(char.skills.find(s => s.name === 'Balance')!.bonus).toBe(-5);     // 8 ranks + 1 Dex + 2 Tumble synergy - 16 ACP = -5
        expect(char.skills.find(s => s.name === 'Intimidate')!.bonus).toBe(14);  // 12 ranks + 2 Cha = 14
        expect(char.skills.find(s => s.name === 'Jump')!.bonus).toBe(3);         // 12 ranks + 5 Str + 2 Tumble synergy - 16 ACP = 3
        expect(char.skills.find(s => s.name === 'Martial Lore')!.bonus).toBe(13);// 12 ranks + 1 Int = 13
        expect(char.skills.find(s => s.name === 'Ride')!.bonus).toBe(-7);        // 8 ranks + 1 Dex - 16 ACP = -7
        expect(char.skills.find(s => s.name === 'Tumble')!.bonus).toBe(-7);      // 6 ranks + 1 Dex + 2 Jump synergy - 16 ACP = -7

        // Body slots occupied
        expect(char.bodySlots.get('Body')).toBe(0);      // Restful Full Plate +1
        expect(char.bodySlots.get('Fingers')).toBe(1);   // Ring of Protection +3 (1 of 2 fingers remaining)
        expect(char.bodySlots.get('Shoulders')).toBe(0); // Cloak of Resistance +1
        expect(char.bodySlots.get('Waist')).toBe(0);     // Belt of Giant Strength +2
        expect(char.bodySlots.get('Hands')).toBe(0);     // Gloves of Dexterity +1
        expect(char.bodySlots.get('Head')).toBe(0);      // Helm of Glorious Recovery

        // Weapons (BAB 9 - 2 Tower Shield = 7; Str mod = +5; Dex mod = +1; Shaky = -2 ranged)
        const spikedChain = char.weapons.find(w => w.baseName === 'Spiked Chain');
        expect(spikedChain).toBeDefined();
        expect(spikedChain!.attackBonus.bonus).toBe(13); // 7 BAB + 5 Str + 1 enhancement
        expect(spikedChain!.damageBonus.bonus).toBe(6);  // 5 Str + 1 enhancement
        expect(spikedChain!.statsString).toBe('Attack: 13 Damage: 2d4 + 6 Crit. X2');

        const longsword = char.weapons.find(w => w.baseName === 'Longsword');
        expect(longsword).toBeDefined();
        expect(longsword!.attackBonus.bonus).toBe(13);   // 7 BAB + 5 Str + 1 Masterwork
        expect(longsword!.damageBonus.bonus).toBe(5);    // 5 Str
        expect(longsword!.statsString).toBe('Attack: 13 Damage: 1d8 + 5 Crit. 19-20X2');

        const punchingDagger = char.weapons.find(w => w.baseName === 'Punching Dagger');
        expect(punchingDagger).toBeDefined();
        expect(punchingDagger!.attackBonus.bonus).toBe(13); // 7 BAB + 5 Str + 1 Masterwork
        expect(punchingDagger!.damageBonus.bonus).toBe(5);  // 5 Str
        expect(punchingDagger!.statsString).toBe('Attack: 13 Damage: 1d4 + 5 Crit. X3');

        const morningstar = char.weapons.find(w => w.baseName === 'Morningstar');
        expect(morningstar).toBeDefined();
        expect(morningstar!.attackBonus.bonus).toBe(13);    // 7 BAB + 5 Str + 1 Masterwork
        expect(morningstar!.damageBonus.bonus).toBe(5);
        expect(morningstar!.statsString).toBe('Attack: 13 Damage: 1d8 + 5 Crit. X2');

        const shortbow = char.weapons.find(w => w.baseName === 'Shortbow');
        expect(shortbow).toBeDefined();
        expect(shortbow!.attackBonus.bonus).toBe(6);        // 7 BAB + 1 Dex - 2 Shaky = 6
        expect(shortbow!.statsString).toBe('Attack: 6 Damage: 1d6 + 0 Crit. X3');

        // Actions (Crusader class actions + Feat/Stance actions)
        expect(char.actions).toEqual(expect.arrayContaining([
            'Move',
            'Combat Expertise',
            'Furious Counterstrike',
            'Smite',
            'Devoted Bulwark',
            'Cure Critical Wounds (Helm of Glorious Recovery)',
            'Iron Guard\'s Glare Stance',
            'Roots of the Mountain Stance',
            'Bolstering Voice Stance'
        ]));
    });

    test('should parse Rolz Room ID from document lines if present', () => {
        const dummyLines = [
            'Test Hero',
            'Rolz Room ID: oy2gymrcju',
            'Init: +4; Senses: Listen +15; Spot +15;',
            'BAb: +9; Grapple: +10; Hp: 85/85; Speed: 50 ft.',
            'Attack: +12 Unarmed (2d10 + 3/X2).',
            'AC: 28, Touch 25, Flat-footed 24',
            'Saves: Fort +17; Ref +14; Will +15.',
            'Str: 14',
            'Dex: 16',
            'Con: 14',
            'Int: 12',
            'Wis: 18',
            'Char: 10',
            'Statuses:',
            'Feats:',
            'Special Abilities:',
            'Racial Traits:',
            'Bonus Abilities:',
            'Skills:',
            'Personal Information:'
        ];
        const char = new Character(dummyLines);
        expect(char.rolzRoomId).toBe('oy2gymrcju');

        const rep = getCharacterRep(char);
        expect(rep.rolzRoomId).toBe('oy2gymrcju');
    });

    test('should classify weapons correctly and ignore items that contain weapon names as substrings', () => {
        expect(IsAWeapon('Short Sword')).toBe(true);
        expect(IsAWeapon('Longsword')).toBe(true);
        expect(IsAWeapon('Net')).toBe(true);
        expect(IsAWeapon('Silver Signet Ring')).toBe(false);
        expect(IsAWeapon('Cabinet')).toBe(false);
    });

    test('should sanitize database links properly for real-time DB sync', () => {
        expect(sanitizeDbLink('https://my-rtdb.firebaseio.com/')).toBe('https://my-rtdb.firebaseio.com');
        expect(sanitizeDbLink('https://my-rtdb.firebaseio.com///')).toBe('https://my-rtdb.firebaseio.com');
        expect(sanitizeDbLink('my-rtdb.firebaseio.com')).toBe('https://my-rtdb.firebaseio.com');
        expect(sanitizeDbLink('  https://my-rtdb.firebaseio.com  ')).toBe('https://my-rtdb.firebaseio.com');
        expect(sanitizeDbLink('')).toBeNull();
        expect(sanitizeDbLink('   ')).toBeNull();
        expect(sanitizeDbLink(null)).toBeNull();
        expect(sanitizeDbLink(undefined)).toBeNull();
    });

    test('should include dbLink property on character representation', () => {
        const char = GetCharacterByDocId(THRORS_TEST_FILE) as Character;
        const rep = getCharacterRep(char);
        expect(rep).toHaveProperty('dbLink');
    });

});
