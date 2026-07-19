import * as path from 'path';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { getCharacterRep } from '../../server/character/character_rep';
import { Character } from '../../server/character/character';
import { ModifiableProperty } from '../../server/character/00_property';
import { StaticPropertyEffect } from '../../server/character/state/effects';

const THRORS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
const BESS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');
const MORTY_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'morty_test.txt');
const DEIN_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'dein_test.txt');

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
            expect(bardSpec.preparedSpells['songs']).toBeDefined();
            const songsSlots = bardSpec.preparedSpells['songs'];
            expect(songsSlots).toHaveLength(13);

            // Verify that standard levels are also parsed with numeric keys
            expect(bardSpec.preparedSpells['0']).toBeDefined();
            expect(bardSpec.preparedSpells['0']).toHaveLength(3);

            // Verify spell slots calculation including bonus spells for unlocked level 5 (base 0 + 1 bonus)
            expect(bardSpec.spellSlots[5]).toBe(1);
        }

        // Validate Song of the Heart feat is automatically applied to Bess's bardic specials
        const bardCasterData = bess.spellCasting.GetSpellCasterClassData('Bard')!;
        const icProperty = bardCasterData.bardicSpecials!.find((s) => s.name === 'Inspire Courage')!.value!;
        expect(icProperty.score).toBe(3); // Base +3 for lvl 13 Bard
        expect(icProperty.currentScore).toBe(4); // +1 from Song of the Heart

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
        expect(retrievedEffects!.find(e => e.property === 'bab')!.value).toBe(4); // Prove numerical 4 carried over via RegExp

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
        expect(shortSword!.statsString).toBe('Attack: 13 Damage: 1d6 + 4 Crit. 19-20X2'); // Total bonus: 1 (Str) + 2 (Weapon bonus) + 1 (enhancement) = +4.

        const crossbow = bess.weapons.find(w => w.name.includes('Light Coil Crossbow'));
        expect(crossbow).toBeDefined();
        expect(crossbow!.attackBonus.bonus).toBe(13); // 9 BAB + 3 Dex from Finesse + 1 enhancement = 13
        expect(crossbow!.damage).toBe('1d8');
        expect(crossbow!.statsString).toBe('Attack: 13 Damage: 1d8 + 1 Crit. 19-20X2'); // 1 enhancement

        const characterRep = getCharacterRep(bess);
        expect(characterRep).toBeDefined();
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
        expect(char.speed.currentScore).toBe(30);
        console.log('Morty AC:', char.ac.currentArmorClass);

        // Abilities (Dex includes +4 Gloves, Int includes +2 Headband)
        expect(char.abilities.Str!.currentScore).toBe(12);
        expect(char.abilities.Dex!.currentScore).toBe(27);
        expect(char.abilities.Con!.currentScore).toBe(11);
        expect(char.abilities.Int!.currentScore).toBe(22);
        expect(char.abilities.Wis!.currentScore).toBe(16);
        expect(char.abilities.Cha!.currentScore).toBe(12);

        // Skills
        expect(char.skills.find(s => s.name === 'Listen')!.bonus).toBe(21);
        expect(char.skills.find(s => s.name === 'Search')!.bonus).toBe(24);
        expect(char.skills.find(s => s.name === 'Spot')!.bonus).toBe(21);
        expect(char.skills.find(s => s.name === 'Balance')!.bonus).toBe(16);
        expect(char.skills.find(s => s.name === 'Climb')!.bonus).toBe(9);
        expect(char.skills.find(s => s.name === 'Concentration')!.bonus).toBe(6);
        expect(char.skills.find(s => s.name === 'Decipher Script')!.bonus).toBe(11);
        expect(char.skills.find(s => s.name === 'Disable Device')!.bonus).toBe(16);
        expect(char.skills.find(s => s.name === 'Escape Artist')!.bonus).toBe(17);
        expect(char.skills.find(s => s.name === 'Hide')!.bonus).toBe(29);
        expect(char.skills.find(s => s.name === 'Jump')!.bonus).toBe(11);
        expect(char.skills.find(s => s.name === 'Knowledge (Arcana)')!.bonus).toBe(12);
        expect(char.skills.find(s => s.name === 'Move Silently')!.bonus).toBe(29);
        expect(char.skills.find(s => s.name === 'Open Lock')!.bonus).toBe(18);
        expect(char.skills.find(s => s.name === 'Perform (Dance)')!.bonus).toBe(6);
        expect(char.skills.find(s => s.name === 'Sense Motive')!.bonus).toBe(7);
        expect(char.skills.find(s => s.name === 'Spellcraft')!.bonus).toBe(15);
        expect(char.skills.find(s => s.name === 'Swim')!.bonus).toBe(3);
        expect(char.skills.find(s => s.name === 'Tumble')!.bonus).toBe(24);
        expect(char.skills.find(s => s.name === 'Use Magic Device')!.bonus).toBe(16);
        expect(char.skills.find(s => s.name === 'Use Rope')!.bonus).toBe(16);

        // Weapons — Morty has Weapon Finesse so unarmed uses Dex
        const unarmed = char.weapons.find(w => w.baseName === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.damage).toBe('1d3');
        expect(unarmed!.attackBonus.ability.name).toBe('Dex');
        expect(unarmed!.attackBonus.bonus).toBe(16);
        expect(unarmed!.statsString).toBe('Attack: 16 Damage: 1d3 + 1 Crit. X2');

        // Amulet of Pelor applies +2 saves
        expect(char.saves.Fort!.effects.some(e => e.status === 'Amulet of Pelor with Maple Leaf')).toBe(true);

        // Brooch of Shielding goes to Special
        expect(char.Special.list.some(p => p.status === 'Brooch of Shielding')).toBe(true);

        // No spellcasting classes parsed (Beguiler spontaneous slots exist but class may not map)
        // Just verify it doesn't crash

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

        // Weapons — Dein is a Fighter/Monk dwarf with Str focus
        const unarmed = char.weapons.find(w => w.baseName === 'Unarmed');
        expect(unarmed).toBeDefined();
        // Monk 2 = 1d6 unarmed damage
        expect(unarmed!.damage).toBe('1d6');
        expect(unarmed!.attackBonus.bonus).toBe(15);
        expect(unarmed!.statsString).toBe('Attack: 15 Damage: 1d6 + 6 Crit. X2');

                // Verify Frost Waraxe +1 (Dwarvencraft)
        const waraxe = char.weapons.find(w => w.name.includes('Frost Waraxe'));
        expect(waraxe).toBeDefined();
        expect(waraxe!.damage).toBe('1d10');
        expect(waraxe!.statsString).toBe('Attack: 16 Damage: 1d10 + 9 Crit. X3');

        // Verify composite longbow
        const bow = char.weapons.find(w => w.baseName === 'Composite Longbow');
        expect(bow).toBeDefined();
        expect(bow!.attackBonus.bonus).toBe(11);
        expect(bow!.damage).toBe('1d8');
        expect(bow!.statsString).toBe('Attack: 11 Damage: 1d8 + 6 Crit. X3');

        // Verify dagger
        const dagger = char.weapons.find(w => w.baseName === 'Dagger');
        expect(dagger).toBeDefined();
        expect(dagger!.attackBonus.bonus).toBe(15);
        expect(dagger!.damage).toBe('1d4');
        expect(dagger!.statsString).toBe('Attack: 15 Damage: 1d4 + 6 Crit. 19-20X2');

        // Verify Heavy mace +2
        const heavyMace = char.weapons.find(w => w.name.includes('Heavy mace'));
        expect(heavyMace).toBeDefined();
        expect(heavyMace!.damage).toBe('1d8');
        expect(heavyMace!.statsString).toBe('Attack: 17 Damage: 1d8 + 8 Crit. X2');

        // Verify Light Purple Mournlode Mace (Magic+1)
        const lightMace = char.weapons.find(w => w.name.includes('Light Purple Mournlode Mace'));
        expect(lightMace).toBeDefined();
        expect(lightMace!.damage).toBe('1d6');
        expect(lightMace!.statsString).toBe('Attack: 16 Damage: 1d6 + 7 Crit. X2');

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

});
