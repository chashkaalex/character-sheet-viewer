import * as fs from 'fs';
import * as path from 'path';

// Mock browser globals for testing client-side scripts under Node
(global as any).window = {
  addEventListener: () => {},
  document: {
    addEventListener: () => {},
    getElementById: () => null
  }
};
(global as any).document = (global as any).window.document;

// Import character to load classes
import '../../server/character/character';

import { GetCharacterByDocId, OnUseAction, OnMoveAction } from '../../server/character/character_manipulation';
import { CharacterError } from '../../server/character/character';

describe('Actions Integration Tests', () => {
    const TEMP_THROR_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_actions_thror.txt');
    const SOURCE_THROR_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
    const TEMP_DEIN_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_actions_dein.txt');
    const SOURCE_DEIN_PATH = path.join(__dirname, 'test_character_sheets', 'dein_test.txt');

    beforeEach(() => {
        // Setup Thror temp file
        if (fs.existsSync(TEMP_THROR_PATH)) {
            fs.unlinkSync(TEMP_THROR_PATH);
        }
        // Setup Dein temp file
        if (fs.existsSync(TEMP_DEIN_PATH)) {
            fs.unlinkSync(TEMP_DEIN_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_THROR_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_THROR_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_THROR_PATH, TEMP_THROR_PATH);
        fs.copyFileSync(SOURCE_DEIN_PATH, TEMP_DEIN_PATH);
    });

    it('should parse Stunning Fist action for Thror and successfully trigger it', () => {
        // 1. Verify action is present on load
        const char = GetCharacterByDocId(TEMP_THROR_PATH);
        expect(char instanceof CharacterError).toBe(false);
        if (char instanceof CharacterError) return;

        expect(char.actions).toContain('Stunning Fist');
        expect(char.HasStatus('Stunning Fist')).toBe(false);

        // 2. Trigger the action
        const useResult = OnUseAction(TEMP_THROR_PATH, 'Stunning Fist');
        expect(useResult instanceof CharacterError).toBe(false);
        if (useResult instanceof CharacterError) return;

        // Verify status added in representation
        expect(useResult.statuses.some(s => s.name === 'Stunning Fist')).toBe(true);

        // 3. Verify status added in file
        const linesAfterUse = fs.readFileSync(TEMP_THROR_PATH, 'utf8').split('\n');
        const statusLine = linesAfterUse.find(l => l.trim().startsWith('Stunning Fist:'));
        expect(statusLine).toBeDefined();

        // 4. Triggering again should fail
        const useAgainResult = OnUseAction(TEMP_THROR_PATH, 'Stunning Fist');
        expect(useAgainResult instanceof CharacterError).toBe(true);
    });

    it('should return error when attempting to trigger an action the character does not have', () => {
        const useResult = OnUseAction(TEMP_THROR_PATH, 'Defensive Stance');
        expect(useResult instanceof CharacterError).toBe(true);
        if (useResult instanceof CharacterError) {
            expect(useResult.errorMessage).toContain('does not have action \'Defensive Stance\'');
        }
    });

    it('should allow default Move action, verifying distance constraints and status application', () => {
        // 1. Verify Move action is present by default
        const char = GetCharacterByDocId(TEMP_THROR_PATH);
        expect(char instanceof CharacterError).toBe(false);
        if (char instanceof CharacterError) return;

        expect(char.actions).toContain('Move');
        expect(char.speed.currentScore).toBe(50); // Thror's speed is 50

        // 2. Trigger OnMoveAction within limits (e.g. 30 ft)
        const moveResult = OnMoveAction(TEMP_THROR_PATH, 30);
        expect(moveResult instanceof CharacterError).toBe(false);
        if (moveResult instanceof CharacterError) return;

        // Verify status added in representation
        expect(moveResult.statuses.some(s => s.name === 'Moved 30 feet')).toBe(true);

        // Verify status added in file
        const linesAfterMove = fs.readFileSync(TEMP_THROR_PATH, 'utf8').split('\n');
        const statusLine = linesAfterMove.find(l => l.trim().startsWith('Moved 30 feet:'));
        expect(statusLine).toBeDefined();

        // 3. Triggering OnMoveAction exceeding speed (e.g. 60 ft) should fail
        const moveTooFarResult = OnMoveAction(TEMP_THROR_PATH, 60);
        expect(moveTooFarResult instanceof CharacterError).toBe(true);
        if (moveTooFarResult instanceof CharacterError) {
            expect(moveTooFarResult.errorMessage).toContain('Cannot move 60 feet; speed is only 50 feet');
        }

        // 4. Triggering with invalid feet (0 or negative) should fail
        const moveInvalidResult = OnMoveAction(TEMP_THROR_PATH, -5);
        expect(moveInvalidResult instanceof CharacterError).toBe(true);
    });

    it('should grant Turn Undead action to Clerics like Thror and execute it as a no-op status adder', () => {
        // 1. Verify Turn Undead is present on load for Cleric Thror
        const char = GetCharacterByDocId(TEMP_THROR_PATH);
        expect(char instanceof CharacterError).toBe(false);
        if (char instanceof CharacterError) return;

        expect(char.actions).toContain('Turn Undead');
        expect(char.HasStatus('Turn Undead')).toBe(false);

        // 2. Trigger OnUseAction with Turn Undead
        const useResult = OnUseAction(TEMP_THROR_PATH, 'Turn Undead');
        expect(useResult instanceof CharacterError).toBe(false);
        if (useResult instanceof CharacterError) return;

        // Verify status added in representation
        expect(useResult.statuses.some(s => s.name === 'Turn Undead')).toBe(true);

        // Verify status added in file
        const linesAfterUse = fs.readFileSync(TEMP_THROR_PATH, 'utf8').split('\n');
        const statusLine = linesAfterUse.find(l => l.trim().startsWith('Turn Undead:'));
        expect(statusLine).toBeDefined();

        // 3. Triggering again should fail
        const useAgainResult = OnUseAction(TEMP_THROR_PATH, 'Turn Undead');
        expect(useAgainResult instanceof CharacterError).toBe(true);
    });

    it('should parse Absolute Steel Stance action for Dein and apply speed and movement-based AC bonuses correctly', () => {
        // 1. Verify Dein has the action on load
        const char = GetCharacterByDocId(TEMP_DEIN_PATH);
        expect(char instanceof CharacterError).toBe(false);
        if (char instanceof CharacterError) return;

        expect(char.actions).toContain('Absolute Steel Stance');
        expect(char.speed.currentScore).toBe(20); // Dein's base speed is 20
        expect(char.ac.currentArmorClass).toBe(23); // Dein's base AC is 23

        // 2. Activate the stance
        const stanceResult = OnUseAction(TEMP_DEIN_PATH, 'Absolute Steel Stance');
        expect(stanceResult instanceof CharacterError).toBe(false);
        if (stanceResult instanceof CharacterError) return;

        // Verify speed increased by +10 ft (20 + 10 = 30)
        expect(stanceResult.speed.currentScore).toBe(30);
        // Verify AC is still 23 (no movement yet)
        expect(stanceResult.ac.bonus).toBe(23);

        // 3. Move 5 feet (less than 10)
        const move5Result = OnMoveAction(TEMP_DEIN_PATH, 5);
        expect(move5Result instanceof CharacterError).toBe(false);
        if (move5Result instanceof CharacterError) return;

        // Verify AC is still 23
        expect(move5Result.ac.bonus).toBe(23);

        // 4. Move 10 feet
        const move10Result = OnMoveAction(TEMP_DEIN_PATH, 10);
        expect(move10Result instanceof CharacterError).toBe(false);
        if (move10Result instanceof CharacterError) return;

        // Verify AC increased by +2 (dodge bonus active because moved >= 10 feet)
        expect(move10Result.ac.bonus).toBe(25);
    });
});
