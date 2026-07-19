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

// Import the caster registry to ensure classes are loaded
import '../../server/character/character'; // imports all classes to register them

import { OnCastSpell, OnReplenishClassSpellSlots } from '../../server/character/character_manipulation';
import { CharacterError } from '../../server/character/character';
import { CharacterRep } from '../../server/character/character_rep';

describe('OnReplenishClassSpellSlots - Local Integration Tests', () => {
    const TEMP_THROR_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_replenish_thror.txt');
    const SOURCE_THROR_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

    const TEMP_BESS_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_replenish_bess.txt');
    const SOURCE_BESS_PATH = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');

    beforeEach(() => {
        // Setup Thror temp file
        if (fs.existsSync(TEMP_THROR_PATH)) {
            fs.unlinkSync(TEMP_THROR_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_THROR_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_THROR_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_THROR_PATH, TEMP_THROR_PATH);

        // Setup Bess temp file
        if (fs.existsSync(TEMP_BESS_PATH)) {
            fs.unlinkSync(TEMP_BESS_PATH);
        }
        fs.copyFileSync(SOURCE_BESS_PATH, TEMP_BESS_PATH);
    });

    it('should successfully replenish prepared spells for Thror (Cleric) by removing strikethroughs', () => {
        // 1. Cast Enlarge Person (Prepared spell for Thror level 1 - domain)
        const slotData = {
            casterClassName: 'Cleric',
            spellLevel: '1 - domain',
            spellName: 'Enlarge Person',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false
        };

        const castResult = OnCastSpell(TEMP_THROR_PATH, slotData);
        expect(castResult instanceof CharacterError).toBe(false);

        // Verify it was marked as cast/used in file
        const linesAfterCast = fs.readFileSync(TEMP_THROR_PATH, 'utf8').split('\n');
        const level1DomainLine = linesAfterCast.find(l => l.trim().startsWith('[x] Enlarge Person'));
        expect(level1DomainLine).toBeDefined();

        // 2. Replenish
        const replenishResult = OnReplenishClassSpellSlots(TEMP_THROR_PATH, 'Cleric');
        expect(replenishResult instanceof CharacterError).toBe(false);
        const charRep = replenishResult as CharacterRep;

        // Verify it is not used in character representation
        const clericCasterData = charRep.spellCasting.classSpellCastingData.find((c: any) => c.className === 'Cleric')!;
        expect(clericCasterData.preparedSpells['1 - domain'][0].used).toBe(false);

        // Verify the file mutation (strikethrough prefix removed)
        const linesAfterReplenish = fs.readFileSync(TEMP_THROR_PATH, 'utf8').split('\n');
        const level1DomainLineAfter = linesAfterReplenish.find(l => l.trim().startsWith('[x] Enlarge Person'));
        expect(level1DomainLineAfter).toBeUndefined();

        const regularLineAfter = linesAfterReplenish.find(l => l.trim() === 'Enlarge Person');
        expect(regularLineAfter).toBeDefined();
    });

    it('should successfully replenish spontaneous spell slots and songs for Bess (Bard)', () => {
        // 1. Cast Cure Light Wounds (level 1 spell, spontaneous)
        const slotData = {
            casterClassName: 'Bard',
            spellLevel: '1',
            spellName: 'Cure Light Wounds',
            slotIndex: 0,
            isUsed: false,
            isEmpty: true
        };

        const castResult = OnCastSpell(TEMP_BESS_PATH, slotData);
        expect(castResult instanceof CharacterError).toBe(false);

        // Verify slots decremented in file (was level 1: 4/5)
        const linesAfterCast = fs.readFileSync(TEMP_BESS_PATH, 'utf8').split('\n');
        const level1Line = linesAfterCast.find(l => l.trim().includes('level 1:'));
        expect(level1Line!.trim()).toBe('level 1: 4/5');

        // 2. Replenish
        const replenishResult = OnReplenishClassSpellSlots(TEMP_BESS_PATH, 'Bard');
        expect(replenishResult instanceof CharacterError).toBe(false);
        const charRep = replenishResult as CharacterRep;

        // Verify slots restored in representation
        const bardCasterData = charRep.spellCasting.classSpellCastingData.find((c: any) => c.className === 'Bard')!;
        const level1Slots = bardCasterData.preparedSpells['1'];
        expect(level1Slots.filter((s: any) => s.isEmpty)).toHaveLength(5);
        expect(level1Slots.filter((s: any) => s.used)).toHaveLength(0);

        // Verify the file mutation (level 1: 5/5)
        const linesAfterReplenish = fs.readFileSync(TEMP_BESS_PATH, 'utf8').split('\n');
        const level1LineAfter = linesAfterReplenish.find(l => l.trim().includes('level 1:'));
        expect(level1LineAfter!.trim()).toBe('level 1: 5/5');
    });
});
