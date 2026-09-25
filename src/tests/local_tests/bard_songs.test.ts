import * as fs from 'fs';
import * as path from 'path';
import { OnCastSpell, AddStatusToCharacter, GetCharacterByDocId, GetCharacterRepByDocId, OnRoundsElapsed } from '../../server/character/character_manipulation';
import { adapter } from '../../server/character/adapter_selector';
import { CharacterError, Character } from '../../server/character/character';
import { CharacterRep } from '../../server/character/character_rep';

describe('Bardic Songs & Inspire Statuses Integration Tests', () => {
    const TEMP_BESS_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_bess_bard_songs.txt');
    const SOURCE_BESS_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');

    const TEMP_THROR_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_thror_bard_songs.txt');
    const SOURCE_THROR_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

    beforeEach(() => {
        if ((adapter as any).pushedPartyStatuses) {
            (adapter as any).pushedPartyStatuses = [];
        }
        if (fs.existsSync(TEMP_BESS_FILE_PATH)) {
            fs.unlinkSync(TEMP_BESS_FILE_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_BESS_FILE_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_BESS_FILE_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_BESS_FILE_PATH, TEMP_BESS_FILE_PATH);

        if (fs.existsSync(TEMP_THROR_FILE_PATH)) {
            fs.unlinkSync(TEMP_THROR_FILE_PATH);
        }
        fs.copyFileSync(SOURCE_THROR_FILE_PATH, TEMP_THROR_FILE_PATH);
    });

    it('should parse Bess with correct Song of the Heart bonuses', () => {
        const char = GetCharacterByDocId(TEMP_BESS_FILE_PATH) as Character;
        expect(char.parseSuccess).toBe(true);

        const bardCasterData = char.spellCasting.GetSpellCasterClassData('Bard')!;
        expect(bardCasterData).toBeDefined();

        const inspireCourage = bardCasterData.bardicSpecials!.find(s => s.name === 'Inspire Courage')!;
        expect(inspireCourage.value!.currentScore).toBe(3); // base 2 + 1 from Song of the Heart

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
        const slotData = {
            casterClassName: 'Bard',
            spellLevel: '1',
            spellName: 'Inspirational Boost',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false
        };

        const result = OnCastSpell(TEMP_BESS_FILE_PATH, slotData);
        expect(result instanceof CharacterError).toBe(false);
        const charRep = result as CharacterRep;

        // Verify status added on character representation
        const ibStatus = charRep.statuses.find(s => s.name === 'Inspirational Boost');
        expect(ibStatus).toBeDefined();
        expect(ibStatus!.duration).toBe(1);

        // Fetch the rich character object to inspect spellCasting and bardicSpecials directly
        const char = GetCharacterByDocId(TEMP_BESS_FILE_PATH) as Character;
        const bardCasterData = char.spellCasting.GetSpellCasterClassData('Bard')!;
        const level1Slots = bardCasterData.preparedSpells['1'];
        expect(level1Slots.filter(s => s.isEmpty)).toHaveLength(4);
        expect(level1Slots.filter(s => s.isUsed)).toHaveLength(1);

        // Verify Inspire Courage special score is now 4 (base 2 + 1 Song of the Heart + 1 Inspirational Boost)
        const inspireCourage = bardCasterData.bardicSpecials!.find(s => s.name === 'Inspire Courage')!;
        expect(inspireCourage.value!.currentScore).toBe(4);
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

        // Verify Inspire Courage +4 status is added (base 2 + 1 Song of the Heart + 1 Inspirational Boost)
        expect(char.statuses.find(s => s.name === 'Inspire Courage +4')).toBeDefined();

        // Verify weapon attack bonus is increased by +4 (Unarmed goes from 12 to 16)
        const unarmed = char.weapons.find(w => w.name === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.attackBonus.bonus).toBe(16);
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

        // Verify Inspire Courage +3 status is added (since Inspirational Boost expired, base 2 + 1 Song of the Heart)
        expect(charFinal.statuses.find(s => s.name === 'Inspire Courage +3')).toBeDefined();
        expect(charFinal.statuses.find(s => s.name === 'Inspire Courage +4')).toBeUndefined();

        // Verify weapon attack bonus is increased by +3 (Unarmed goes from 12 to 15)
        const unarmed = charFinal.weapons.find(w => w.name === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.attackBonus.bonus).toBe(15);
    });

    it('should cast Inspire Courage targeting all party members, consume song slot, apply locally to Bess and push to remote party members', () => {
        (adapter as any).pushedPartyStatuses = [];

        const slotData = {
            casterClassName: 'Bard',
            spellLevel: 'songs',
            spellName: 'Inspire Courage',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false,
            targets: ['Self', 'Thror', 'Dein']
        };

        const result = OnCastSpell(TEMP_BESS_FILE_PATH, slotData);
        expect(result instanceof CharacterError).toBe(false);
        const charRep = result as CharacterRep;

        // Bess gets Inspire Courage +3 locally
        expect(charRep.statuses.some(s => s.name === 'Inspire Courage +3')).toBe(true);
        expect(charRep.weapons.find(w => w.name === 'Unarmed')?.attackBonus.bonus).toBe(15); // 12 + 3

        // Song slot is consumed (from 11/13 to 10/13)
        const updatedLines = fs.readFileSync(TEMP_BESS_FILE_PATH, 'utf8').split('\n');
        const songLine = updatedLines.find(l => l.trim().startsWith('songs:'));
        expect(songLine?.trim()).toBe('songs: 10/13');

        // Verify pushed to remote party members (Thror and Dein)
        const pushed = (adapter as any).pushedPartyStatuses;
        expect(pushed).toHaveLength(2);
        expect(pushed).toContainEqual(expect.objectContaining({
            partyName: 'TeamD20_T&E',
            targetMember: 'Thror',
            payload: expect.objectContaining({
                statusName: 'Inspire Courage +3',
                senderName: 'Bess',
                duration: -1
            })
        }));
        expect(pushed).toContainEqual(expect.objectContaining({
            partyName: 'TeamD20_T&E',
            targetMember: 'Dein',
            payload: expect.objectContaining({
                statusName: 'Inspire Courage +3',
                senderName: 'Bess',
                duration: -1
            })
        }));
    });

    it('should preserve Inspire Courage status and its bonuses across round elapses when added with infinite duration', () => {
        // Add Inspire Courage +3 with duration -1
        let result = AddStatusToCharacter(TEMP_BESS_FILE_PATH, 'Inspire Courage +3', -1);
        expect(result instanceof CharacterError).toBe(false);

        // Elapse 5 rounds
        result = OnRoundsElapsed(TEMP_BESS_FILE_PATH, 5);
        expect(result instanceof CharacterError).toBe(false);
        const char = result as CharacterRep;

        // Verify Inspire Courage +3 is still active and unmodified
        const status = char.statuses.find(s => s.name === 'Inspire Courage +3');
        expect(status).toBeDefined();
        expect(status!.duration).toBe(-1);

        // Bonuses remain active
        const unarmed = char.weapons.find(w => w.name === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.attackBonus.bonus).toBe(15); // 12 + 3
    });

    it('should replace active Inspire Courage +3 with Inspire Courage +4 when re-cast with boost', () => {
        // 1. Bess casts Inspire Courage (song slot 0) -> gives Inspire Courage +3
        const castSong1 = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: 'songs',
            spellName: 'Inspire Courage',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false,
            targets: ['Self']
        });
        expect(castSong1 instanceof CharacterError).toBe(false);
        const char1 = castSong1 as CharacterRep;
        expect(char1.statuses.find(s => s.name === 'Inspire Courage +3')).toBeDefined();

        // 2. Cast Inspirational Boost
        const castBoost = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: '1',
            spellName: 'Inspirational Boost',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false,
            targets: ['Self']
        });
        expect(castBoost instanceof CharacterError).toBe(false);

        // 3. Cast Inspire Courage again (song slot 1) -> should apply Inspire Courage +4 and remove Inspire Courage +3
        const castSong2 = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: 'songs',
            spellName: 'Inspire Courage',
            slotIndex: 1,
            isUsed: false,
            isEmpty: false,
            targets: ['Self']
        });
        expect(castSong2 instanceof CharacterError).toBe(false);
        const char2 = castSong2 as CharacterRep;

        // Verify Inspire Courage +3 is replaced by Inspire Courage +4
        expect(char2.statuses.find(s => s.name === 'Inspire Courage +3')).toBeUndefined();
        expect(char2.statuses.find(s => s.name === 'Inspire Courage +4')).toBeDefined();

        // Verify only 1 Inspire Courage status exists on the character representation
        const repInspireStatuses = char2.statuses.filter(s => s.name.startsWith('Inspire Courage'));
        expect(repInspireStatuses).toHaveLength(1);

        // Verify file contains only one Inspire Courage status line in the Statuses section
        const fileContent = fs.readFileSync(TEMP_BESS_FILE_PATH, 'utf8');
        const inspireMatches = fileContent.match(/^Inspire Courage.*:\s*\d+\s*rounds/gm) || [];
        expect(inspireMatches).toHaveLength(1);
        expect(inspireMatches[0]).toContain('Inspire Courage +4');
    });

    it('should test complete caster dynamic status lifecycle for Inspire Courage: baseline +3 -> boosted +4 -> revert to +3 with attack, damage, and fear save bonuses', () => {
        // Initial unarmed baseline
        const initialChar = GetCharacterRepByDocId(TEMP_BESS_FILE_PATH) as CharacterRep;
        const unarmedInitial = initialChar.weapons.find(w => w.name === 'Unarmed')!;
        const baseAttack = unarmedInitial.attackBonus.bonus; // 12
        const baseDamage = unarmedInitial.damageBonus.bonus;
        const baseWillSave = initialChar.saves.Will.bonus;

        // Step 1: Cast regular Inspire Courage (song slot 0)
        const cast1 = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: 'songs',
            spellName: 'Inspire Courage',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false,
            targets: ['Self']
        });
        expect(cast1 instanceof CharacterError).toBe(false);
        const char1 = cast1 as CharacterRep;

        // Status is dynamically named "Inspire Courage +3"
        expect(char1.statuses.find(s => s.name === 'Inspire Courage +3')).toBeDefined();
        const unarmed1 = char1.weapons.find(w => w.name === 'Unarmed')!;
        expect(unarmed1.attackBonus.bonus).toBe(baseAttack + 3);
        expect(unarmed1.damageBonus.bonus).toBe(baseDamage + 3);

        // Step 2: Cast Inspirational Boost (level 1 slot 0)
        const castBoost = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: '1',
            spellName: 'Inspirational Boost',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false,
            targets: ['Self']
        });
        expect(castBoost instanceof CharacterError).toBe(false);

        // Step 3: Cast Inspire Courage again (song slot 1) -> triggers boost consumption and upgrades to +4
        const cast2 = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: 'songs',
            spellName: 'Inspire Courage',
            slotIndex: 1,
            isUsed: false,
            isEmpty: false,
            targets: ['Self']
        });
        expect(cast2 instanceof CharacterError).toBe(false);
        const char2 = cast2 as CharacterRep;

        // Verify Inspire Courage +3 was replaced by Inspire Courage +4, not duplicated
        expect(char2.statuses.find(s => s.name === 'Inspire Courage +3')).toBeUndefined();
        expect(char2.statuses.find(s => s.name === 'Inspire Courage +4')).toBeDefined();
        const unarmed2 = char2.weapons.find(w => w.name === 'Unarmed')!;
        expect(unarmed2.attackBonus.bonus).toBe(baseAttack + 4);
        expect(unarmed2.damageBonus.bonus).toBe(baseDamage + 4);

        // Also test fear save interaction: Add Frightful Presence status to test morale bonus to Will save against fear
        const fearResult = AddStatusToCharacter(TEMP_BESS_FILE_PATH, 'Frightful Presence', 5);
        expect(fearResult instanceof CharacterError).toBe(false);
        const charWithFear = fearResult as CharacterRep;
        // With Frightful Presence active, Inspire Courage +4 valueResolver activates (+4 to Will)
        expect(charWithFear.saves.Will.bonus).toBe(baseWillSave + 4);

        // Step 4: Cast Inspire Courage a 3rd time (song slot 2) without boost -> reverts to +3
        const cast3 = OnCastSpell(TEMP_BESS_FILE_PATH, {
            casterClassName: 'Bard',
            spellLevel: 'songs',
            spellName: 'Inspire Courage',
            slotIndex: 2,
            isUsed: false,
            isEmpty: false,
            targets: ['Self']
        });
        expect(cast3 instanceof CharacterError).toBe(false);
        const char3 = cast3 as CharacterRep;

        // Verify Inspire Courage +4 is replaced by Inspire Courage +3
        expect(char3.statuses.find(s => s.name === 'Inspire Courage +4')).toBeUndefined();
        expect(char3.statuses.find(s => s.name === 'Inspire Courage +3')).toBeDefined();
        const unarmed3 = char3.weapons.find(w => w.name === 'Unarmed')!;
        expect(unarmed3.attackBonus.bonus).toBe(baseAttack + 3);
        expect(unarmed3.damageBonus.bonus).toBe(baseDamage + 3);
        // Will save against fear now has +3 bonus
        expect(char3.saves.Will.bonus).toBe(baseWillSave + 3);

        // Verify only 1 Inspire Courage status exists in sheet file
        const fileContentAfterThird = fs.readFileSync(TEMP_BESS_FILE_PATH, 'utf8');
        const inspireMatchesAfterThird = fileContentAfterThird.match(/^Inspire Courage.*:\s*\d+\s*rounds/gm) || [];
        expect(inspireMatchesAfterThird).toHaveLength(1);
        expect(inspireMatchesAfterThird[0]).toContain('Inspire Courage +3');
    });

    it('should test remote recipient dynamic status flow for Inspire Courage: receiving +3, upgrading to +4, and reverting back to +3 without status duplication', () => {
        // Base character stats for Thror
        const initialRep = GetCharacterRepByDocId(TEMP_THROR_FILE_PATH) as CharacterRep;
        const unarmedInitial = initialRep.weapons.find(w => w.name === 'Unarmed')!;
        const initialAttack = unarmedInitial.attackBonus.bonus;
        const initialDamage = unarmedInitial.damageBonus.bonus;

        // 1. Receive Inspire Courage +3 (e.g. from Bard party member)
        const res1 = AddStatusToCharacter(TEMP_THROR_FILE_PATH, 'Inspire Courage +3', -1);
        expect(res1 instanceof CharacterError).toBe(false);
        const char1 = res1 as CharacterRep;

        // Verify status and +3 bonuses applied
        expect(char1.statuses.some(s => s.name === 'Inspire Courage +3')).toBe(true);
        const unarmed1 = char1.weapons.find(w => w.name === 'Unarmed')!;
        expect(unarmed1.attackBonus.bonus).toBe(initialAttack + 3);
        expect(unarmed1.damageBonus.bonus).toBe(initialDamage + 3);

        // 2. Bard party member casts boosted Inspire Courage -> Target receives Inspire Courage +4
        const res2 = AddStatusToCharacter(TEMP_THROR_FILE_PATH, 'Inspire Courage +4', -1);
        expect(res2 instanceof CharacterError).toBe(false);
        const char2 = res2 as CharacterRep;

        // Verify Inspire Courage +3 is replaced by Inspire Courage +4 and bonuses increase to +4
        expect(char2.statuses.find(s => s.name === 'Inspire Courage +3')).toBeUndefined();
        expect(char2.statuses.find(s => s.name === 'Inspire Courage +4')).toBeDefined();
        const inspireStatuses2 = char2.statuses.filter(s => s.name.startsWith('Inspire Courage'));
        expect(inspireStatuses2).toHaveLength(1);
        const unarmed2 = char2.weapons.find(w => w.name === 'Unarmed')!;
        expect(unarmed2.attackBonus.bonus).toBe(initialAttack + 4);
        expect(unarmed2.damageBonus.bonus).toBe(initialDamage + 4);

        // 3. Later, Bard sings regular Inspire Courage again -> Target receives Inspire Courage +3
        const res3 = AddStatusToCharacter(TEMP_THROR_FILE_PATH, 'Inspire Courage +3', -1);
        expect(res3 instanceof CharacterError).toBe(false);
        const char3 = res3 as CharacterRep;

        // Verify Inspire Courage +4 is replaced by Inspire Courage +3 and bonuses adjust back to +3
        expect(char3.statuses.find(s => s.name === 'Inspire Courage +4')).toBeUndefined();
        expect(char3.statuses.find(s => s.name === 'Inspire Courage +3')).toBeDefined();
        const inspireStatuses3 = char3.statuses.filter(s => s.name.startsWith('Inspire Courage'));
        expect(inspireStatuses3).toHaveLength(1);
        const unarmed3 = char3.weapons.find(w => w.name === 'Unarmed')!;
        expect(unarmed3.attackBonus.bonus).toBe(initialAttack + 3);
        expect(unarmed3.damageBonus.bonus).toBe(initialDamage + 3);

        // Verify file contains only one Inspire Courage status line in the Statuses section
        const fileContent = fs.readFileSync(TEMP_THROR_FILE_PATH, 'utf8');
        const inspireMatches = fileContent.match(/^Inspire Courage.*:\s*\d+\s*rounds/gm) || [];
        expect(inspireMatches).toHaveLength(1);
    });
});
