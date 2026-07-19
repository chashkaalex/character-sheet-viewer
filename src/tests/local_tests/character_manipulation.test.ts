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

import { OnCastSpell, UpdateHp, AddStatusToCharacter, GetCharacterByDocId, OnRoundsElapsed } from '../../server/character/character_manipulation';


import { CharacterError, Character } from '../../server/character/character';
import { CharacterRep } from '../../server/character/character_rep';
import { renderSpellSlots } from '../../client/ts/spells_script';


describe('OnCastSpell - Local Integration Tests', () => {
    const TEMP_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_thror_test.txt');
    const SOURCE_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

    beforeEach(() => {
        // Clear temp file if it exists, then copy fresh from source
        if (fs.existsSync(TEMP_FILE_PATH)) {
            fs.unlinkSync(TEMP_FILE_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_FILE_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_FILE_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_FILE_PATH, TEMP_FILE_PATH);
    });

    afterAll(() => {
        // Leave the temp file for inspection as requested by the user
    });

    it('should successfully cast "Enlarge Person" prepared spell from Thror\'s Cleric level 1 - domain and mutate the local file', () => {
        // We look at thror_test.txt, let's cast "Enlarge Person" from Cleric level 1 - domain.
        const slotData = {
            casterClassName: 'Cleric',
            spellLevel: '1 - domain',
            spellName: 'Enlarge Person',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false
        };

        // Execute function - it will parse the file, find the spell, and rewrite it via LocalAdapter
        // TEMP_FILE_PATH acts as the docId
        const result = OnCastSpell(TEMP_FILE_PATH, slotData);

        // Result validation
        expect(result instanceof CharacterError).toBe(false);
        const charRep = result as CharacterRep;

        // Verify status is active
        expect(charRep.statuses.some(s => s.name === 'Enlarge Person')).toBe(true);

        // Verify effects: Str (+2), Dex (-2)
        expect(charRep.abilities.Str.currentScore).toBe(18);
        expect(charRep.abilities.Dex.currentScore).toBe(16);

        // Verify size effect on AC (-1 size modifier, Dex modifier decreased, total AC decreased by 2)
        expect(charRep.ac.bonus).toBe(26);
        expect(charRep.ac.string).toContain('-1 (Enlarge Person) size modifier');

        // Verify weapon damage scaled to 4d8
        const unarmedWeapon = charRep.weapons.find(w => w.name === 'Unarmed');
        expect(unarmedWeapon).toBeDefined();
        expect(unarmedWeapon!.dmgValue).toContain('4d8');

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
        const char = result as CharacterRep;
        const status = char.statuses.find(s => s.name === 'Keeping Grudge');
        expect(status).toBeDefined();
        expect(status!.duration).toBe(-1);

        const fortitudeSave = char.saves.Fort;
        expect(fortitudeSave).toBeDefined();
        expect(fortitudeSave.bonus).toBe(14);    //original 17 - 1 con modifier -2 K.G. flaw penalty = 14

        // Verify File Mutation
        const updatedLines = fs.readFileSync(TEMP_FILE_PATH, 'utf8').split('\n');
        const statusAdded = updatedLines.some(line => line.includes('Keeping Grudge: 1 rounds/-1 rounds'));
        expect(statusAdded).toBe(true);
    });

    it('should apply Thror feat of strength status effects', () => {
        const result = AddStatusToCharacter(TEMP_FILE_PATH, 'Feat of Strength', 1);
        const char = result as CharacterRep;
        expect(char.abilities.Str.currentScore).toBe(16 + 6); //original 16 + Feat of Strength (+3@Cleric +3@Sacred Fist)
    });

    it('should apply Shield of Faith status effects and not stack with Ring of Protection +2', () => {
        const result = AddStatusToCharacter(TEMP_FILE_PATH, 'Shield of Faith', 1);
        const char = result as CharacterRep;
        expect(char.ac.bonus).toBe(29); // 28 + (3 - 2)
    });

    it('should apply Shaken status effects and inflict penalties', () => {
        const result = AddStatusToCharacter(TEMP_FILE_PATH, 'Shaken', 1);
        const char = result as CharacterRep;
        expect(char.saves.Fort.bonus).toBe(14);
        expect(char.abilities.Str.currentScore).toBe(14);
        expect(char.skills['Balance'].bonus).toBe(12);
    });

});

describe('Bess - Song of the Heart and Bardic Inspire Statuses', () => {
    const TEMP_BESS_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_bess_test.txt');
    const SOURCE_BESS_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');

    beforeEach(() => {
        if (fs.existsSync(TEMP_BESS_FILE_PATH)) {
            fs.unlinkSync(TEMP_BESS_FILE_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_BESS_FILE_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_BESS_FILE_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_BESS_FILE_PATH, TEMP_BESS_FILE_PATH);
    });

    it('should parse Bess with correct Song of the Heart bonuses', () => {
        const char = GetCharacterByDocId(TEMP_BESS_FILE_PATH) as Character;
        expect(char.parseSuccess).toBe(true);

        const bardCasterData = char.spellCasting.GetSpellCasterClassData('Bard')!;
        expect(bardCasterData).toBeDefined();

        const inspireCourage = bardCasterData.bardicSpecials!.find(s => s.name === 'Inspire Courage')!;
        expect(inspireCourage.value!.currentScore).toBe(4); // base 3 + 1 from Song of the Heart

        const inspireCompetence = bardCasterData.bardicSpecials!.find(s => s.name === 'Inspire Competence')!;
        expect(inspireCompetence.value!.currentScore).toBe(3); // base 2 + 1 from Song of the Heart

        const inspireGreatness = bardCasterData.bardicSpecials!.find(s => s.name === 'Inspire Greatness')!;
        expect(inspireGreatness.value!.currentScore).toBe(3); // base 2 + 1 from Song of the Heart
    });

    it('should apply Inspire Competence +3 status and boost skills', () => {
        const result = AddStatusToCharacter(TEMP_BESS_FILE_PATH, 'Inspire Competence +3', 1);
        expect(result instanceof CharacterError).toBe(false);
        const char = result as CharacterRep;

        // Check Balance: normal is 6, should be 9
        expect(char.skills['Balance'].bonus).toBe(9);
        // Check Perform (voice): normal is 22, should be 25
        expect(char.skills['Perform (voice)'].bonus).toBe(25);
    });

    it('should apply Inspire Greatness +3 status and boost BAB and Fort save', () => {
        const result = AddStatusToCharacter(TEMP_BESS_FILE_PATH, 'Inspire Greatness +3', 1);
        expect(result instanceof CharacterError).toBe(false);
        const char = result as CharacterRep;

        // Base BAB for Bess is +9/+4, with +3 competence, weapon attack bonuses should be boosted by +3
        const unarmed = char.weapons.find(w => w.name === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.attackBonus.bonus).toBe(15); // normal 12 + 3 competence = 15

        // Base Fort save for Bess is +7 (Class 4 + Con 2 + Amulet 1).
        // With math.max(0, parsedValue - 1), which is +2, it should be 9.
        expect(char.saves.Fort.bonus).toBe(9);
    });

    it('should apply Inspire Heroics +5 status and boost AC and all saving throws', () => {
        const result = AddStatusToCharacter(TEMP_BESS_FILE_PATH, 'Inspire Heroics +5', 1);
        expect(result instanceof CharacterError).toBe(false);
        const char = result as CharacterRep;

        // Base AC for Bess is 17.
        // With +5 Dodge, it should be 22.
        expect(char.ac.bonus).toBe(22);

        // Saves: base Fort +7, Ref +12, Will +11.
        // With +5 Morale, they should be: Fort +12, Ref +17, Will +16.
        expect(char.saves.Fort.bonus).toBe(12);
        expect(char.saves.Ref.bonus).toBe(17);
        expect(char.saves.Will.bonus).toBe(16);
    });

    it('should successfully cast Inspirational Boost, decrement spell slots, and apply static effect to Inspire Courage', () => {
        const castResult = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: '1',
            spellName: 'Inspirational Boost',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false
        });

        expect(castResult instanceof CharacterError).toBe(false);
        const charRep = castResult as CharacterRep;

        // Verify status added
        const ibStatus = charRep.statuses.find(s => s.name === 'Inspirational Boost');
        expect(ibStatus).toBeDefined();
        expect(ibStatus!.duration).toBe(1);

        // Fetch the rich character object to inspect spellCasting and bardicSpecials directly
        const char = GetCharacterByDocId(TEMP_BESS_FILE_PATH) as Character;
        const bardCasterData = char.spellCasting.GetSpellCasterClassData('Bard')!;
        const level1Slots = bardCasterData.preparedSpells['1'];
        expect(level1Slots.filter(s => s.isEmpty)).toHaveLength(4);
        expect(level1Slots.filter(s => s.isUsed)).toHaveLength(1);

        // Verify Inspire Courage special score is now 5 (base 3 + 1 Song of the Heart + 1 Inspirational Boost)
        const inspireCourage = bardCasterData.bardicSpecials!.find(s => s.name === 'Inspire Courage')!;
        expect(inspireCourage.value!.currentScore).toBe(5);
    });

    it('should consume Inspirational Boost status when casting Inspire Courage and apply Inspire Courage +4 status', () => {
        // First cast Inspirational Boost
        const res1 = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: '1',
            spellName: 'Inspirational Boost',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false
        });
        expect(res1 instanceof CharacterError).toBe(false);

        // Now cast Inspire Courage
        const res2 = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: 'songs',
            spellName: 'Inspire Courage',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false
        });
        expect(res2 instanceof CharacterError).toBe(false);
        const char = res2 as CharacterRep;

        // Verify Inspirational Boost status is gone
        expect(char.statuses.find(s => s.name === 'Inspirational Boost')).toBeUndefined();

        // Verify Inspire Courage +5 status is added
        expect(char.statuses.find(s => s.name === 'Inspire Courage +5')).toBeDefined();

        // Verify weapon attack bonus is increased by +5 (Unarmed goes from 12 to 17)
        const unarmed = char.weapons.find(w => w.name === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.attackBonus.bonus).toBe(17);
    });

    it('should expire Inspirational Boost status after 1 round and subsequent Inspire Courage is only +3', () => {
        // Cast Inspirational Boost
        const res1 = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: '1',
            spellName: 'Inspirational Boost',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false
        });
        expect(res1 instanceof CharacterError).toBe(false);

        // Elapse 1 round
        const res2 = OnRoundsElapsed(TEMP_BESS_FILE_PATH, 1);
        expect(res2 instanceof CharacterError).toBe(false);
        const charAfterElapse = res2 as CharacterRep;

        // Verify Inspirational Boost status is gone
        expect(charAfterElapse.statuses.find(s => s.name === 'Inspirational Boost')).toBeUndefined();

        // Now cast Inspire Courage
        const res3 = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: 'songs',
            spellName: 'Inspire Courage',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false
        });
        expect(res3 instanceof CharacterError).toBe(false);
        const charFinal = res3 as CharacterRep;

        // Verify Inspire Courage +4 status is added (since Inspirational Boost expired)
        expect(charFinal.statuses.find(s => s.name === 'Inspire Courage +4')).toBeDefined();
        expect(charFinal.statuses.find(s => s.name === 'Inspire Courage +5')).toBeUndefined();

        // Verify weapon attack bonus is increased by +4 (Unarmed goes from 12 to 16)
        const unarmed = charFinal.weapons.find(w => w.name === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.attackBonus.bonus).toBe(16);
    });

    it('should successfully cast Mislead and apply Invisible status with attack bonus', () => {
        const slotData = {
            casterClassName: 'Bard',
            spellLevel: '5',
            spellName: 'Mislead',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false
        };

        const result = OnCastSpell(TEMP_BESS_FILE_PATH, slotData);
        expect(result instanceof CharacterError).toBe(false);
        const charRep = result as CharacterRep;

        // Verify status added
        const invisibleStatus = charRep.statuses.find(s => s.name === 'Invisible');
        expect(invisibleStatus).toBeDefined();
        // Mislead duration is 1 round/level. Bess is lvl 13, so duration is 13.
        expect(invisibleStatus!.duration).toBe(13);

        // Verify weapon attack bonus is increased by +2 (Unarmed goes from 12 to 14)
        const unarmed = charRep.weapons.find(w => w.name === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.attackBonus.bonus).toBe(14);
    });

    it('should successfully cast a spontaneous spell and decrement available slots without adding a strikethrough', () => {
        // Bess has level 1 slots 5/5. We cast Cure Light Wounds.
        const slotData = {
            casterClassName: 'Bard',
            spellLevel: '1',
            spellName: 'Cure Light Wounds',
            slotIndex: 0,
            isUsed: false,
            isEmpty: true
        };

        const result = OnCastSpell(TEMP_BESS_FILE_PATH, slotData);

        expect(result instanceof CharacterError).toBe(false);
        const charRep = result as CharacterRep;

        // Verify that level 1 slots in the returned representation shows 4 empty and 1 used
        const bardSpec = charRep.spellCasting.classSpellCastingData.find(c => c.className === 'Bard')!;
        expect(bardSpec).toBeDefined();
        const level1Slots = bardSpec.preparedSpells['1'];
        expect(level1Slots.filter((s: any) => s.isEmpty)).toHaveLength(4);
        expect(level1Slots.filter((s: any) => s.used)).toHaveLength(1);

        // Verify File Mutation: the line in the document should be 'level 1: 4/5' and should NOT be struck-through (no '[x]' prepended)
        const updatedLines = fs.readFileSync(TEMP_BESS_FILE_PATH, 'utf8').split('\n');
        const level1Line = updatedLines.find(l => l.trim().includes('level 1:'));
        expect(level1Line).toBeDefined();
        expect(level1Line!.trim()).toBe('level 1: 4/5');
    });

    it('should correctly render client-side HTML with "used" class for spent spontaneous slots', () => {
        const spellSlots = { '1': 5 };
        const preparedSpells = {
            '1': [
                { spell: '', used: false, isEmpty: true, isValid: true },
                { spell: '', used: false, isEmpty: true, isValid: true },
                { spell: '', used: false, isEmpty: true, isValid: true },
                { spell: '', used: false, isEmpty: true, isValid: true },
                { spell: '', used: true, isEmpty: false, isValid: true }
            ]
        };

        const html = renderSpellSlots(spellSlots, preparedSpells, 'Bard', 'Spontaneous');

        // The HTML should contain class "used" for the fifth slot and data-used="true"
        expect(html).toContain('class="spell-slot filled used "');
        expect(html).toContain('data-used="true"');
    });
});


