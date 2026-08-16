import * as fs from 'fs';
import * as path from 'path';

// Mock browser globals for testing client-side scripts under Node
(global as any).window = {
    addEventListener: () => { },
    document: {
        addEventListener: () => { },
        getElementById: () => null
    }
};
(global as any).document = (global as any).window.document;

// Import character to load classes
import '../../server/character/character';

import { GetCharacterByDocId, OnUseAction } from '../../server/character/character_manipulation';
import { CharacterError } from '../../server/character/character';

describe('Cleric Domains Actions Tests', () => {
    const TEMP_THROR_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_domains_thror.txt');
    const SOURCE_THROR_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

    beforeEach(() => {
        // Setup Thror temp file
        if (fs.existsSync(TEMP_THROR_PATH)) {
            fs.unlinkSync(TEMP_THROR_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_THROR_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_THROR_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_THROR_PATH, TEMP_THROR_PATH);
    });

    describe('General Cleric Domain Actions availability', () => {
        it('should correctly parse domain actions based on Cleric domains', () => {
            const char = GetCharacterByDocId(TEMP_THROR_PATH);
            expect(char instanceof CharacterError).toBe(false);
            if (char instanceof CharacterError) return;

            // Since Thror has domains (Protection, Strength), these actions must be present
            expect(char.actions).toContain('Feat of Strength');
            expect(char.actions).toContain('Protective Ward');
        });
    });

    describe('Thror Specific Domain Actions', () => {
        it('should trigger Feat of Strength and correctly apply Strength bonus', () => {
            // 1. Verify character is initially without Feat of Strength status
            let char = GetCharacterByDocId(TEMP_THROR_PATH);
            expect(char instanceof CharacterError).toBe(false);
            if (char instanceof CharacterError) return;

            expect(char.HasStatus('Feat of Strength')).toBe(false);
            // Hand Wraps (+2) + base Strength (14) = 16
            expect(char.abilities.Str.currentScore).toBe(16);

            // 2. Trigger Feat of Strength
            const useResult = OnUseAction(TEMP_THROR_PATH, 'Feat of Strength');
            expect(useResult instanceof CharacterError).toBe(false);

            // 3. Re-load character to verify file updates and effects application
            char = GetCharacterByDocId(TEMP_THROR_PATH);
            expect(char instanceof CharacterError).toBe(false);
            if (char instanceof CharacterError) return;

            expect(char.HasStatus('Feat of Strength')).toBe(true);
            // Feat of Strength bonus: +4 (3 Cleric + 3 Sacred Fist / 2)
            // Total Strength: 16 (base+item) + 4 (Feat of Strength) -2 (already has +2 enh from hand wraps) = 18
            expect(char.abilities.Str.currentScore).toBe(18);
        });

        it('should trigger Protective Ward and correctly apply non-stacking resistance save bonuses', () => {
            // 1. Verify character is initially without Protective Ward status
            let char = GetCharacterByDocId(TEMP_THROR_PATH);
            expect(char instanceof CharacterError).toBe(false);
            if (char instanceof CharacterError) return;

            expect(char.HasStatus('Protective Ward')).toBe(false);
            // Verify initial saves which already contain +2 resistance
            expect(char.saves.Fort.bonus).toBe(17);
            expect(char.saves.Ref.bonus).toBe(15);
            expect(char.saves.Will.bonus).toBe(17);

            // 2. Trigger Protective Ward
            const useResult = OnUseAction(TEMP_THROR_PATH, 'Protective Ward');
            expect(useResult instanceof CharacterError).toBe(false);

            // 3. Re-load character to verify file updates and effects application
            char = GetCharacterByDocId(TEMP_THROR_PATH);
            expect(char instanceof CharacterError).toBe(false);
            if (char instanceof CharacterError) return;

            expect(char.HasStatus('Protective Ward')).toBe(true);
            // Protective Ward resistance bonus: +4 (3 Cleric + 3 Sacred Fist / 2)
            // Stacks with existing cloak of resistance which is set as Generic +2
            expect(char.saves.Fort.bonus).toBe(21); // 17 + 4
            expect(char.saves.Ref.bonus).toBe(19);  // 15 + 4
            expect(char.saves.Will.bonus).toBe(21); // 17 + 4
        });
    });
});
