import { Character } from '../../server/character/character';
import { GetCharacterByDocId } from '../../server/character/character_manipulation';
import { SpecialAttackBonus } from '../../server/character/00_property';
import * as path from 'path';

describe('Grapple Bonus Calculations', () => {
    const THRORS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
    const DEIN_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'dein_test.txt');
    const MORTY_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'morty_test.txt');

    it('should calculate Thror grapple bonus correctly', () => {
        const char = GetCharacterByDocId(THRORS_TEST_FILE) as Character;
        expect(char.parseSuccess).toBe(true);
        // BAB (9) + Str (3) + Size (0) = 12
        expect(char.specialAttacks['Grapple']).toBeDefined();
        expect((char.specialAttacks['Grapple'] as SpecialAttackBonus).bonus).toBe(12);
    });

    it('should calculate Dein grapple bonus correctly including Improved Grapple, Shield Ward feats, and Tower Shield penalty', () => {
        const char = GetCharacterByDocId(DEIN_TEST_FILE) as Character;
        expect(char.parseSuccess).toBe(true);
        // BAB (9 - 2 Tower Shield = 7) + Str (6) + Size (0) + Improved Grapple (4) + Shield Ward (+1 from Shield Specialization) = 18
        expect(char.specialAttacks['Grapple']).toBeDefined();
        expect((char.specialAttacks['Grapple'] as SpecialAttackBonus).bonus).toBe(18);
    });

    it('should calculate Morty grapple bonus correctly', () => {
        const char = GetCharacterByDocId(MORTY_TEST_FILE) as Character;
        expect(char.parseSuccess).toBe(true);
        // BAB (8) + Str (1) + Size (0) = 9
        expect(char.specialAttacks['Grapple']).toBeDefined();
        expect((char.specialAttacks['Grapple'] as SpecialAttackBonus).bonus).toBe(9);
    });
});
