const fs = require('fs');
const path = require('path');
const { Character } = require('../character/character');

const THRORS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

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
        expect(char.hp.max).toBeGreaterThan(0);

        //abilities
        expect(char.abilities.Str.currentScore).toBe(18);
        expect(char.abilities.Dex.currentScore).toBe(16);
        expect(char.abilities.Con.currentScore).toBe(14);
        expect(char.abilities.Int.currentScore).toBe(12);
        expect(char.abilities.Wis.currentScore).toBe(22);
        expect(char.abilities.Char.currentScore).toBe(10);

        // Optional: Check warnings if we want to be strict, or just log them
        if (char.parseWarnings.length > 0) {
            console.warn('Parse Warnings:', char.parseWarnings);
        }
        // We strictly decided NOT to fail on warnings in the previous conversation,
        // so we just log them here.
    });
});
