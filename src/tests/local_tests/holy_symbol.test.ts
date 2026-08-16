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

import { GetCharacterByDocId, OnUseAction, RemoveStatusFromCharacter } from '../../server/character/character_manipulation';
import { CharacterError } from '../../server/character/character';

describe('Thror\'s Holy Symbol Action and Status Effects', () => {
    const TEMP_THROR_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_holy_symbol_thror.txt');
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

    afterEach(() => {
        if (fs.existsSync(TEMP_THROR_PATH)) {
            fs.unlinkSync(TEMP_THROR_PATH);
        }
    });

    it('should parse Thror\'s Holy Symbol and add the \'Use Thror\'s Holy Symbol\' action', () => {
        const char = GetCharacterByDocId(TEMP_THROR_PATH);
        expect(char instanceof CharacterError).toBe(false);
        if (char instanceof CharacterError) return;

        // Verify action is present on load
        expect(char.actions).toContain('Use Thror\'s Holy Symbol');
    });

    it('should modify unarmed attack stats when \'Use Thror\'s Holy Symbol\' is active and revert on removal', () => {
        // 1. Initial State (Normal Unarmed)
        const char = GetCharacterByDocId(TEMP_THROR_PATH);
        expect(char instanceof CharacterError).toBe(false);
        if (char instanceof CharacterError) return;

        const unarmed = char.weapons.find(w => w.name === 'Unarmed');
        expect(unarmed).toBeDefined();
        if (!unarmed) return;

        // Default unarmed is not enhanced, crit is standard x2
        expect(unarmed.enhancement).toBe(0);
        expect(unarmed.critValue).toBe('X2');
        const initialAtk = unarmed.attackBonus.bonus;
        const initialDmgBonus = unarmed.damageBonus.bonus;

        // 2. Trigger the action
        const useResult = OnUseAction(TEMP_THROR_PATH, 'Use Thror\'s Holy Symbol');
        expect(useResult instanceof CharacterError).toBe(false);
        if (useResult instanceof CharacterError) return;

        // Verify status added in representation
        expect(useResult.statuses.some(s => s.name === 'Use Thror\'s Holy Symbol')).toBe(true);

        // Verify unarmed weapon is mutated in representation
        const armedUnarmed = useResult.weapons.find(w => w.name === 'Unarmed');
        expect(armedUnarmed).toBeDefined();
        if (!armedUnarmed) return;

        expect(armedUnarmed.critValue).toBe('19-20X2');
        // Attack and damage bonuses should increase by exactly 2
        expect(armedUnarmed.attackBonus.bonus).toBe(initialAtk + 2);
        expect(armedUnarmed.damageBonus.bonus).toBe(initialDmgBonus + 2);

        // Verify raw character values
        const rawArmedChar = GetCharacterByDocId(TEMP_THROR_PATH);
        expect(rawArmedChar instanceof CharacterError).toBe(false);
        if (rawArmedChar instanceof CharacterError) return;
        const rawArmedUnarmed = rawArmedChar.weapons.find(w => w.name === 'Unarmed');
        expect(rawArmedUnarmed!.enhancement).toBe(2);
        expect(rawArmedUnarmed!.critical).toBe('19-20/x2');

        // 3. Remove the status to revert
        const removeResult = RemoveStatusFromCharacter(TEMP_THROR_PATH, 'Use Thror\'s Holy Symbol');
        expect(removeResult instanceof CharacterError).toBe(false);
        if (removeResult instanceof CharacterError) return;

        expect(removeResult.statuses.some(s => s.name === 'Use Thror\'s Holy Symbol')).toBe(false);

        const revertedUnarmed = removeResult.weapons.find(w => w.name === 'Unarmed');
        expect(revertedUnarmed).toBeDefined();
        if (!revertedUnarmed) return;

        expect(revertedUnarmed.critValue).toBe('X2');
        expect(revertedUnarmed.attackBonus.bonus).toBe(initialAtk);
        expect(revertedUnarmed.damageBonus.bonus).toBe(initialDmgBonus);

        // Verify raw reverted values
        const rawRevertedChar = GetCharacterByDocId(TEMP_THROR_PATH);
        expect(rawRevertedChar instanceof CharacterError).toBe(false);
        if (rawRevertedChar instanceof CharacterError) return;
        const rawRevertedUnarmed = rawRevertedChar.weapons.find(w => w.name === 'Unarmed');
        expect(rawRevertedUnarmed!.enhancement).toBe(0);
        expect(rawRevertedUnarmed!.critical).toBe('x2');
    });
});
