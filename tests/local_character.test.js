const fs = require('fs');
const path = require('path');
const { Character } = require('../server/character/character');

const THRORS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
const BESS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');

describe('Local Character Parsing', () => {
    let fileContent;
    let lines;

    beforeAll(() => {
        fileContent = fs.readFileSync(THRORS_TEST_FILE, 'utf8');
        lines = fileContent.split('\n').map(l => l.trim());
    });

    test('should parse Thror character sheet without errors', () => {
        const char = new Character(lines, 'local-test-doc-id');
        char.ParseCharacter();

        // Check for parse success
        expect(char.parseSuccess).toBe(true);

        // Check for parse errors
        if (char.parseErrors.length > 0) {
            console.error('Parse Errors:', char.parseErrors);
        }
        expect(char.parseErrors).toHaveLength(0);

        // Verify some basic data to ensure it's not just an empty success
        expect(char.name).toBe('Throrgorlun Eiertrager');
        expect(char.race).toBe('Dwarf');
        expect(char.hp.max).toBeGreaterThan(0);
        expect(char.speed.currentScore).toBe(50);

        //abilities
        expect(char.abilities.Str.currentScore).toBe(16);
        expect(char.abilities.Dex.currentScore).toBe(18);
        expect(char.abilities.Con.currentScore).toBe(14);
        expect(char.abilities.Int.currentScore).toBe(12);
        expect(char.abilities.Wis.currentScore).toBe(22);
        expect(char.abilities.Char.currentScore).toBe(10);

        // Check domains
        expect(char.domains).toEqual(['Protection', 'Strength']);

        // Check Flaws, Traits, Quirks
        expect(char.flaws.some(flaw => flaw.some(effect => effect.status === 'Keeping Grudge'))).toBe(true);

        // Optional: Check warnings if we want to be strict, or just log them
        if (char.parseWarnings.length > 0) {
            console.warn('Parse Warnings:', char.parseWarnings);
        }
        // We strictly decided NOT to fail on warnings in the previous conversation,
        // so we just log them here.
    });

    test('should parse Bess character sheet and apply both holy symbol and neck slot items', () => {
        const bessContent = fs.readFileSync(BESS_TEST_FILE, 'utf8');
        const bessLines = bessContent.split('\n').map(l => l.trim());
        const char = new Character(bessLines, 'bess-test-doc-id');
        char.ParseCharacter();

        // Check for parse success
        expect(char.parseSuccess).toBe(true);
        expect(char.name).toBe('Bess T&E');
        expect(char.race).toBe('Half-Elf');
        expect(char.speed.currentScore).toBe(30);
        expect(char.skills.find(s => s.name === 'Diplomacy').score).toBe(15);   // 15 ranks
        expect(char.skills.find(s => s.name === 'Diplomacy').bonus).toBe(32);   // 15 + 7 Char modifier + 2 Bluff synergy, + 2 Sense Motive synergy, +2 Negotiator, +2 Nymph's Kiss, +2 Racial = 32
        expect(char.parseErrors).toHaveLength(0);

        console.log('Bess parse warnings:', char.parseWarnings);

        // Verify body slot warnings: Amulet of Pelor/Set (holy symbol) and Brooch of Shielding
        // should NOT produce a "body slot is already taken" warning for Neck.
        const slotWarnings = char.parseWarnings.filter(w => w.includes('body slot') && w.includes('is already taken'));
        expect(slotWarnings.some(w => w.includes('Neck'))).toBe(false);

        // Verify that BOTH items applied their effects!
        // Amulet of Pelor/Set gives +1 to Saves
        expect(char.saves.Fort.effects.some(e => e.status === 'Amulet of Pelor/Set')).toBe(true);

        // Brooch of Shielding goes to Special
        expect(char.Special.list.some(p => p.status === 'Brooch of Shielding')).toBe(true);

        // Verify that BardicSpecial was added as a spellcaster
        // Verify that BardicSpecial was added as a spellcaster
        expect(char.spellCasting.classSpellCastingData.has('BardicSpecial')).toBe(true);
        const specials = char.spellCasting.classSpellCastingData.get('BardicSpecial');
        expect(specials.level.currentScore).toBe(12); // Bess is level 12 Bard
        const availableSpecials = specials.availableSpells[1];
        expect(availableSpecials).toContain('Fascinate'); // Verify Fascinate is generated
        expect(availableSpecials).toContain('Inspire Courage'); // Level 12 Bard gets Inspire Courage (value applies on cast)

        // Validate Dynamic Extracting Logic locally by artificially raising Inspire Courage
        const icProperty = char.bardicSpecials.find(s => s.name === 'Inspire Courage').value;
        expect(icProperty.currentScore).toBe(2); // Base +2 for lvl 12 Bard
        // Apply fake Song of the Heart Mock feat
        icProperty.applyEffect({ status: 'Song of the Heart', property: 'Inspire Courage', modifierType: 'Generic', value: 1 });
        expect(icProperty.currentScore).toBe(3);

        // Emulate `OnCastSpell` generating a +3 string and Verify it maps cleanly in _general_effects
        const generatedStatusName = `Inspire Courage +${icProperty.currentScore}`;
        const { GetEffects, StatusesEffects } = require('../server/character/_general_effects');
        const retrievedEffects = GetEffects(StatusesEffects, generatedStatusName);
        expect(retrievedEffects).not.toBeNull();
        expect(retrievedEffects.length).toBe(3);
        expect(retrievedEffects.find(e => e.property === 'bab').value).toBe(3); // Prove numerical 3 carried over via RegExp
    });
});
