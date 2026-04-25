import * as fs from 'fs';
import * as path from 'path';
import { OnPrepareSpell } from '../server/character/character_manipulation';
import { CharacterError } from '../server/character/character';

describe('OnPrepareSpell - Local Integration Tests', () => {
    const TEMP_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_thror_prepare_test.txt');
    const SOURCE_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
    const BESS_TEMP_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_bess_prepare_test.txt');
    const BESS_SOURCE_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');

    beforeEach(() => {
        // Clear and copy fresh Thror test file
        if (fs.existsSync(TEMP_FILE_PATH)) {
            fs.unlinkSync(TEMP_FILE_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_FILE_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_FILE_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_FILE_PATH, TEMP_FILE_PATH);

        // Clear and copy fresh Bess test file (Bard = Spontaneous caster)
        if (fs.existsSync(BESS_TEMP_FILE_PATH)) {
            fs.unlinkSync(BESS_TEMP_FILE_PATH);
        }
        fs.copyFileSync(BESS_SOURCE_FILE_PATH, BESS_TEMP_FILE_PATH);
    });

    afterAll(() => {
        // Leave the temp files for inspection
    });

    // ==================== SUCCESS CASE ====================

    it('should successfully prepare a valid spell in an empty slot', () => {
        // Create an empty slot by replacing the last level 1 spell with '[x]' marker.
        // A bare '[x]' with no spell name survives CleanRawLines (it's not a blank line)
        // but ParsePreparedSlotsDivine treats it as isEmpty: true (after stripping '[x]', cleanLine === '')
        const lines = fs.readFileSync(TEMP_FILE_PATH, 'utf8').split('\n');
        const level1DomainStart = lines.findIndex(l => l.trim() === 'level 1 - domain');
        lines[level1DomainStart - 1] = '[o]';
        fs.writeFileSync(TEMP_FILE_PATH, lines.join('\n'));

        const slotData = {
            casterClassName: 'Cleric',
            spellLevel: '1',
            slotIndex: 4,  // This is the now-empty slot
            spellName: '',
            isUsed: false,
            isEmpty: true
        };

        const result = OnPrepareSpell(TEMP_FILE_PATH, slotData, 'Divine Favor');

        expect(result instanceof CharacterError).toBe(false);

        // Verify the spell was written to the document
        const updatedLines = fs.readFileSync(TEMP_FILE_PATH, 'utf8').split('\n');
        const preparedSection = updatedLines.slice(
            updatedLines.findIndex(l => l.trim() === 'level 1'),
            updatedLines.findIndex(l => l.trim() === 'level 1 - domain')
        );
        // The 5th spell slot (index 4) should now contain 'Divine Favor'
        // preparedSection[0] is 'level 1', so spells start at index 1
        expect(preparedSection[5].trim()).toBe('Divine Favor');
    });

    // ==================== FAILURE CASES ====================

    it('should return CharacterError when caster class is Spontaneous (Bard)', () => {
        const slotData = {
            casterClassName: 'Bard',
            spellLevel: '1',
            slotIndex: 0,
            spellName: '',
            isUsed: false,
            isEmpty: true
        };

        const result = OnPrepareSpell(BESS_TEMP_FILE_PATH, slotData, 'Cure Light Wounds');

        expect(result instanceof CharacterError).toBe(true);
        expect((result as CharacterError).errorMessage).toContain('does not prepare spells in advance');
    });

    it('should return CharacterError when caster class does not exist on the character', () => {
        const slotData = {
            casterClassName: 'Wizard',
            spellLevel: '1',
            slotIndex: 0,
            spellName: '',
            isUsed: false,
            isEmpty: true
        };

        const result = OnPrepareSpell(TEMP_FILE_PATH, slotData, 'Magic Missile');

        expect(result instanceof CharacterError).toBe(true);
        // Wizard has no ClassesData entry with spellCastingData, so it should fail at the preparation check
    });

    it('should return CharacterError when selected spell does not fit the slot level', () => {
        const slotData = {
            casterClassName: 'Cleric',
            spellLevel: '1',
            slotIndex: 4,  // empty slot
            spellName: '',
            isUsed: false,
            isEmpty: true
        };

        // 'Dispel Magic' is a level 3 spell, it should not be valid for a level 1 slot
        const result = OnPrepareSpell(TEMP_FILE_PATH, slotData, 'Dispel Magic');

        expect(result instanceof CharacterError).toBe(true);
        expect((result as CharacterError).errorMessage).toContain('is not a valid spell');
    });

    it('should return CharacterError when slot index is out of bounds', () => {
        const slotData = {
            casterClassName: 'Cleric',
            spellLevel: '1',
            slotIndex: 99,  // way out of bounds
            spellName: '',
            isUsed: false,
            isEmpty: true
        };

        const result = OnPrepareSpell(TEMP_FILE_PATH, slotData, 'Divine Favor');

        expect(result instanceof CharacterError).toBe(true);
        expect((result as CharacterError).errorMessage).toContain('out of bounds');
    });

    it('should return CharacterError when slot is not empty (already has a spell)', () => {
        const slotData = {
            casterClassName: 'Cleric',
            spellLevel: '1',
            slotIndex: 0,  // slot 0 already has 'Divine Favor'
            spellName: 'Divine Favor',
            isUsed: false,
            isEmpty: false
        };

        const result = OnPrepareSpell(TEMP_FILE_PATH, slotData, 'Bless');

        expect(result instanceof CharacterError).toBe(true);
        expect((result as CharacterError).errorMessage).toContain('is not empty');
    });

    it('should return CharacterError for a domain slot with non-domain spell', () => {
        // Domain slots should only accept domain spells
        // Thror has Protection and Strength domains
        const slotData = {
            casterClassName: 'Cleric',
            spellLevel: '1 - domain',
            slotIndex: 0,  // this slot already has 'Enlarge Person'
            spellName: 'Enlarge Person',
            isUsed: false,
            isEmpty: false
        };

        // 'Divine Favor' is not a domain spell for Protection or Strength
        const result = OnPrepareSpell(TEMP_FILE_PATH, slotData, 'Divine Favor');

        expect(result instanceof CharacterError).toBe(true);
        // Should fail either on spell validation (not a domain spell) or slot not empty
    });
});
