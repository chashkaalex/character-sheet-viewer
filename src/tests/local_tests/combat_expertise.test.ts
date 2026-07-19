import * as fs from 'fs';
import * as path from 'path';
import { GetCharacterByDocId, OnUseNumberAction } from '../../server/character/character_manipulation';
import { getCharacterRep } from '../../server/character/character_rep';
import { CharacterError } from '../../server/character/character';

describe('Combat Expertise Local Integration Tests', () => {
    const TEMP_DEIN_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_expertise_dein.txt');
    const SOURCE_DEIN_PATH = path.join(__dirname, 'test_character_sheets', 'dein_test.txt');

    beforeEach(() => {
        if (fs.existsSync(TEMP_DEIN_PATH)) {
            fs.unlinkSync(TEMP_DEIN_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_DEIN_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_DEIN_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_DEIN_PATH, TEMP_DEIN_PATH);
    });

    afterEach(() => {
        if (fs.existsSync(TEMP_DEIN_PATH)) {
            fs.unlinkSync(TEMP_DEIN_PATH);
        }
    });

    it('should parse Combat Expertise feat, register actionsMetadata, and apply attack penalty and AC bonus upon use', () => {
        // 1. Load character and verify initial action availability and metadata
        const char = GetCharacterByDocId(TEMP_DEIN_PATH);
        expect(char instanceof CharacterError).toBe(false);
        if (char instanceof CharacterError) return;

        expect(char.actions).toContain('Combat Expertise');

        const rep = getCharacterRep(char);
        expect(rep.actionsMetadata).toBeDefined();
        const expertiseMeta = rep.actionsMetadata!['Combat Expertise'];
        expect(expertiseMeta).toBeDefined();
        expect(expertiseMeta.acceptsNumber).toBe(true);
        expect(expertiseMeta.minNumber).toBe(1);
        expect(expertiseMeta.maxNumber).toBe(5); // Math.min(5, Dein's BAB=9) = 5
        expect(expertiseMeta.label).toBe('Penalty value:');

        // Check initial stats
        expect(char.bab.currentScore).toBe(9);
        expect(char.ac.currentArmorClass).toBe(23);
        const waraxe = char.weapons.find(w => w.name.includes('Waraxe'));
        expect(waraxe).toBeDefined();
        expect(waraxe!.attackBonus.bonus).toBe(16);

        // 2. Trigger OnUseNumberAction with Combat Expertise value of 3
        const result = OnUseNumberAction(TEMP_DEIN_PATH, 'Combat Expertise', 3);
        expect(result instanceof CharacterError).toBe(false);
        if (result instanceof CharacterError) return;

        // Verify status added in representation
        expect(result.statuses.some(s => s.name === 'Combat Expertise -3')).toBe(true);

        // Verify status added in file
        const lines = fs.readFileSync(TEMP_DEIN_PATH, 'utf8').split('\n');
        const statusLine = lines.find(l => l.trim().startsWith('Combat Expertise -3:'));
        expect(statusLine).toBeDefined();

        // 3. Reload character and check modified stats
        const updatedChar = GetCharacterByDocId(TEMP_DEIN_PATH);
        expect(updatedChar instanceof CharacterError).toBe(false);
        if (updatedChar instanceof CharacterError) return;

        // BAB should be reduced by 3 (9 - 3 = 6)
        expect(updatedChar.bab.currentScore).toBe(6);

        // AC should increase by +3 (23 + 3 = 26)
        expect(updatedChar.ac.currentArmorClass).toBe(26);

        // Attack bonus of weapon should decrease by 3 (16 - 3 = 13)
        const updatedWaraxe = updatedChar.weapons.find(w => w.name.includes('Waraxe'));
        expect(updatedWaraxe!.attackBonus.bonus).toBe(13);

        // 4. Triggering with value exceeding BAB or limit of 5 should fail
        const failOverLimit = OnUseNumberAction(TEMP_DEIN_PATH, 'Combat Expertise', 6);
        expect(failOverLimit instanceof CharacterError).toBe(true);

        // 5. Triggering with invalid value (0 or negative) should fail
        const failInvalid = OnUseNumberAction(TEMP_DEIN_PATH, 'Combat Expertise', 0);
        expect(failInvalid instanceof CharacterError).toBe(true);
    });
});
