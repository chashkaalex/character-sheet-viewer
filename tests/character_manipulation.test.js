const fs = require('fs');
const path = require('path');
const { OnCastSpell, UpdateHp } = require('../server/character/character_manipulation');
const { CharacterError } = require('../server/character/character');

describe('OnCastSpell - Local Integration Tests', () => {
    const TEMP_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp_thror_test.txt');
    const SOURCE_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

    beforeEach(() => {
        // Clear temp file if it exists, then copy fresh from source
        if (fs.existsSync(TEMP_FILE_PATH)) {
            fs.unlinkSync(TEMP_FILE_PATH);
        }
        fs.copyFileSync(SOURCE_FILE_PATH, TEMP_FILE_PATH);
    });

    afterAll(() => {
        // Leave the temp file for inspection as requested by the user
    });

    it('should successfully cast a prepared spell and mutate the local file', () => {
        // We look at thror_test.txt, let's cast "Enlarge Person" from Cleric level 1 - domain.
        const slotData = {
            casterClassName: 'Cleric',
            spellLevel: '1 - domain',
            spellName: 'Enlarge Person',
            slotIndex: 0
        };

        // Execute function - it will parse the file, find the spell, and rewrite it via LocalAdapter
        // TEMP_FILE_PATH acts as the docId
        const result = OnCastSpell(TEMP_FILE_PATH, slotData);

        // Result validation
        expect(result instanceof CharacterError).toBe(false);

        // Verify File Mutation
        const updatedLines = fs.readFileSync(TEMP_FILE_PATH, 'utf8').split('\n');

        let foundCleric = false;
        let foundLevel1Domain = false;
        let slotCount = -1;
        let enlargePersonMutated = false;

        for (let i = 0; i < updatedLines.length; i++) {
            const line = updatedLines[i].trim();
            if (line === 'Cleric') foundCleric = true;
            if (foundCleric && line === 'level 1 - domain') foundLevel1Domain = true;

            if (foundCleric && foundLevel1Domain) {
                if (line === 'level 2') break; // Escaped block

                // Track slots under Cleric level 1 - domain
                if (['[x] Enlarge Person', 'Enlarge Person'].some(s => line.includes(s))) {
                    slotCount++;
                    if (slotCount === 0) { // The first Enlarge Person
                        if (line.startsWith('[x] ')) {
                            enlargePersonMutated = true;
                        }
                    }
                }
            }
        }

        expect(enlargePersonMutated).toBe(true);
    });

    it('should apply penalties from Grudge Keeper flaw when damage is inflicted', () => {

        // TEMP_FILE_PATH acts as the docId
        const result = UpdateHp(TEMP_FILE_PATH, 1, 'inflict');

        // Result validation
        expect(result instanceof CharacterError).toBe(false);
        const status = result.statuses.find(s => s.name === 'Keeping Grudge');
        expect(status).toBeDefined();
        expect(status.duration).toBe(-1);

        const fortitudeSave = result.saves.Fort;
        expect(fortitudeSave).toBeDefined();
        expect(fortitudeSave.bonus).toBe(14);    //original 17 - 1 con modifier -2 K.G. flaw penalty = 14

        // Verify File Mutation
        const updatedLines = fs.readFileSync(TEMP_FILE_PATH, 'utf8').split('\n');
        const statusAdded = updatedLines.some(line => line.includes('Keeping Grudge: 1 rounds/-1 rounds'));
        expect(statusAdded).toBe(true);


    });

});
