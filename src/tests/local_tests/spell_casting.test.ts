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

import { OnCastSpell, OnRoundsElapsed, AddStatusToCharacter } from '../../server/character/character_manipulation';
import { adapter } from '../../server/character/adapter_selector';
import { CharacterError } from '../../server/character/character';
import { CharacterRep } from '../../server/character/character_rep';
import { renderSpellSlots } from '../../client/ts/spells_script';
import { ExtractAndValidateSpell } from '../../server/character/spells';

describe('Spell Casting - Prepared and Spontaneous Integration Tests', () => {
    const TEMP_THROR_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_thror_spell_casting.txt');
    const SOURCE_THROR_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

    const TEMP_BESS_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_bess_spell_casting.txt');
    const SOURCE_BESS_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');

    beforeEach(() => {
        if ((adapter as any).pushedPartyStatuses) {
            (adapter as any).pushedPartyStatuses = [];
        }
        if (fs.existsSync(TEMP_THROR_FILE_PATH)) {
            fs.unlinkSync(TEMP_THROR_FILE_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_THROR_FILE_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_THROR_FILE_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_THROR_FILE_PATH, TEMP_THROR_FILE_PATH);

        if (fs.existsSync(TEMP_BESS_FILE_PATH)) {
            fs.unlinkSync(TEMP_BESS_FILE_PATH);
        }
        fs.copyFileSync(SOURCE_BESS_FILE_PATH, TEMP_BESS_FILE_PATH);
    });

    describe('Prepared Spells (Cleric - Thror)', () => {
        it('should successfully cast "Enlarge Person" prepared spell from Thror\'s Cleric level 1 - domain and mutate the local file', () => {
            const slotData = {
                casterClassName: 'Cleric',
                spellLevel: '1 - domain',
                spellName: 'Enlarge Person',
                slotIndex: 0,
                isUsed: false,
                isEmpty: false
            };

            const result = OnCastSpell(TEMP_THROR_FILE_PATH, slotData);

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
            const updatedLines = fs.readFileSync(TEMP_THROR_FILE_PATH, 'utf8').split('\n');

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

                    if (['[x] Enlarge Person', 'Enlarge Person'].some(s => line.includes(s))) {
                        slotCount++;
                        if (slotCount === 0) {
                            if (line.startsWith('[x] ')) {
                                enlargePersonMutated = true;
                            }
                        }
                    }
                }
            }

            expect(enlargePersonMutated).toBe(true);
        });

        it('should cast Prayer targeting all party members, consume level 3 slot, apply locally and push to party members in RTDB', () => {
            (adapter as any).pushedPartyStatuses = [];

            const slotData = {
                casterClassName: 'Cleric',
                spellLevel: '3',
                spellName: 'Prayer',
                slotIndex: 0,
                isUsed: false,
                isEmpty: false,
                targets: ['Self', 'Bess', 'Dein']
            };

            const result = OnCastSpell(TEMP_THROR_FILE_PATH, slotData);
            expect(result instanceof CharacterError).toBe(false);
            const charRep = result as CharacterRep;

            // Verify status applied locally to Thror
            expect(charRep.statuses.some(s => s.name === 'Prayer')).toBe(true);
            const unarmed = charRep.weapons.find(w => w.name === 'Unarmed');
            expect(unarmed).toBeDefined();
            expect(unarmed!.attackBonus.bonus).toBe(12 + 1); // base 12 + 1 luck bonus
            expect(charRep.saves.Fort.bonus).toBe(17 + 1); // base 17 + 1 luck bonus

            // Verify slot was consumed in file (mutated to [x] Prayer)
            const updatedLines = fs.readFileSync(TEMP_THROR_FILE_PATH, 'utf8').split('\n');
            expect(updatedLines.some(l => l.trim() === '[x] Prayer')).toBe(true);

            // Verify pushed to remote party members (Bess and Dein)
            const pushed = (adapter as any).pushedPartyStatuses;
            expect(pushed).toHaveLength(2);
            expect(pushed).toContainEqual(expect.objectContaining({
                partyName: 'TeamD20_T&E',
                targetMember: 'Bess',
                payload: expect.objectContaining({
                    statusName: 'Prayer',
                    senderName: 'Thror'
                })
            }));
            expect(pushed).toContainEqual(expect.objectContaining({
                partyName: 'TeamD20_T&E',
                targetMember: 'Dein',
                payload: expect.objectContaining({
                    statusName: 'Prayer',
                    senderName: 'Thror'
                })
            }));
        });

        it('should cast single-target Bull\'s Strength on Bess only, consume slot, and push to Bess without affecting Thror', () => {
            (adapter as any).pushedPartyStatuses = [];

            const rawProdSpellText = 'Bull’s Strength';
            const { extractedName } = ExtractAndValidateSpell('Cleric', 2, '2', rawProdSpellText, []);
            expect(extractedName).toBe('Bull\'s Strength');

            const slotData = {
                casterClassName: 'Cleric',
                spellLevel: '2',
                spellName: 'Bull\'s Strength',
                slotIndex: 2,
                isUsed: false,
                isEmpty: false,
                targets: ['Bess']
            };

            const result = OnCastSpell(TEMP_THROR_FILE_PATH, slotData);
            expect(result instanceof CharacterError).toBe(false);
            const charRep = result as CharacterRep;

            // Thror is NOT targeted, so Thror should NOT have Bull's Strength active
            expect(charRep.statuses.some(s => s.name === 'Bull\'s Strength')).toBe(false);

            // Verify slot 2 was marked consumed in Thror's file
            const updatedLines = fs.readFileSync(TEMP_THROR_FILE_PATH, 'utf8').split('\n');
            expect(updatedLines.some(l => l.trim().startsWith('[x]') && l.includes('Bull’s Strength'))).toBe(true);

            // Verify pushed to remote target Bess only
            const pushed = (adapter as any).pushedPartyStatuses;
            expect(pushed).toHaveLength(1);
            expect(pushed[0]).toEqual(expect.objectContaining({
                partyName: 'TeamD20_T&E',
                targetMember: 'Bess',
                payload: expect.objectContaining({
                    statusName: 'Bull\'s Strength',
                    senderName: 'Thror'
                })
            }));
        });

        it('should refresh status duration when re-casting a prepared spell on Self from another slot', () => {
            // 1. Cast first Bull's Strength on Self (level 2, slotIndex 2)
            const cast1 = OnCastSpell(TEMP_THROR_FILE_PATH, {
                casterClassName: 'Cleric',
                spellLevel: '2',
                spellName: 'Bull\'s Strength',
                slotIndex: 2,
                isUsed: false,
                isEmpty: false,
                targets: ['Self']
            });
            expect(cast1 instanceof CharacterError).toBe(false);
            const char1 = cast1 as CharacterRep;
            const bs1 = char1.statuses.find(s => s.name === 'Bull\'s Strength');
            expect(bs1).toBeDefined();
            expect(bs1!.elapsed).toBe(1);

            // 2. Elapse 5 rounds
            const elapsedResult = OnRoundsElapsed(TEMP_THROR_FILE_PATH, 5);
            expect(elapsedResult instanceof CharacterError).toBe(false);
            const charElapsed = elapsedResult as CharacterRep;
            const bsElapsed = charElapsed.statuses.find(s => s.name === 'Bull\'s Strength');
            expect(bsElapsed).toBeDefined();
            expect(bsElapsed!.elapsed).toBe(6);

            // 3. Re-cast Bull's Strength on Self from level 2 - domain slot
            const cast2 = OnCastSpell(TEMP_THROR_FILE_PATH, {
                casterClassName: 'Cleric',
                spellLevel: '2 - domain',
                spellName: 'Bull\'s Strength',
                slotIndex: 0,
                isUsed: false,
                isEmpty: false,
                targets: ['Self']
            });
            expect(cast2 instanceof CharacterError).toBe(false);
            const char2 = cast2 as CharacterRep;

            // Verify only ONE Bull's Strength status exists and elapsed is reset to 1
            const bsStatuses = char2.statuses.filter(s => s.name === 'Bull\'s Strength');
            expect(bsStatuses).toHaveLength(1);
            expect(bsStatuses[0].elapsed).toBe(1);

            // Verify file content has only one Bull's Strength status line
            const fileContent = fs.readFileSync(TEMP_THROR_FILE_PATH, 'utf8');
            const bsMatches = fileContent.match(/^Bull’s Strength:.*$/gm) || fileContent.match(/^Bull's Strength:.*$/gm) || [];
            expect(bsMatches).toHaveLength(1);
            expect(bsMatches[0]).toContain('1 rounds');
        });

        it('should allow multi-target spell to proceed and refresh caster even if caster already has the status', () => {
            // 1. Add Prayer to Thror with 4 rounds elapsed
            AddStatusToCharacter(TEMP_THROR_FILE_PATH, 'Prayer', 10, 4);

            (adapter as any).pushedPartyStatuses = [];

            // 2. Cast Prayer targeting all party members
            const result = OnCastSpell(TEMP_THROR_FILE_PATH, {
                casterClassName: 'Cleric',
                spellLevel: '3',
                spellName: 'Prayer',
                slotIndex: 0,
                isUsed: false,
                isEmpty: false,
                targets: ['Self', 'Bess', 'Dein']
            });
            expect(result instanceof CharacterError).toBe(false);
            const charRep = result as CharacterRep;

            // Verify Prayer on Thror was refreshed to 1 round elapsed
            const prayerStatuses = charRep.statuses.filter(s => s.name === 'Prayer');
            expect(prayerStatuses).toHaveLength(1);
            expect(prayerStatuses[0].elapsed).toBe(1);

            // Verify remote party members were pushed the status
            const pushed = (adapter as any).pushedPartyStatuses;
            expect(pushed).toHaveLength(2);
            expect(pushed.some((p: any) => p.targetMember === 'Bess')).toBe(true);
            expect(pushed.some((p: any) => p.targetMember === 'Dein')).toBe(true);
        });
    });

    describe('Spontaneous Spells (Bard - Bess)', () => {
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

        it('should successfully cast Haste and apply Haste status with level-based duration and stats bonus', () => {
            const slotData = {
                casterClassName: 'Bard',
                spellLevel: '3',
                spellName: 'Haste',
                slotIndex: 0,
                isUsed: false,
                isEmpty: false
            };

            const result = OnCastSpell(TEMP_BESS_FILE_PATH, slotData);
            expect(result instanceof CharacterError).toBe(false);
            const charRep = result as CharacterRep;

            // Verify status added
            const hasteStatus = charRep.statuses.find(s => s.name === 'Haste');
            expect(hasteStatus).toBeDefined();
            // Haste duration is 1 round/level. Bess is lvl 13, so duration is 13.
            expect(hasteStatus!.duration).toBe(13);

            // Verify stats are updated (e.g. AC increases by +1, Ref saves by +1, speed by +30)
            expect(charRep.ac.bonus).toBe(18);
            expect(charRep.saves.Ref.bonus).toBe(13);
            expect(charRep.speed.currentScore).toBe(60);

            // Verify weapon attack bonus is increased by +1 (Unarmed goes from 12 to 13 due to Haste +1 attack bonus)
            const unarmed = charRep.weapons.find(w => w.name === 'Unarmed');
            expect(unarmed).toBeDefined();
            expect(unarmed!.attackBonus.bonus).toBe(13);
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

        it('should refresh status duration when re-casting a spell on Self that is already active (spontaneous caster)', () => {
            // 1. Bess casts Haste (level 3, spontaneous) on Self
            const cast1 = OnCastSpell(TEMP_BESS_FILE_PATH, {
                casterClassName: 'Bard',
                spellLevel: '3',
                spellName: 'Haste',
                slotIndex: 0,
                isUsed: false,
                isEmpty: false,
                targets: ['Self']
            });
            expect(cast1 instanceof CharacterError).toBe(false);
            const char1 = cast1 as CharacterRep;
            const hasteStatus1 = char1.statuses.find(s => s.name === 'Haste');
            expect(hasteStatus1).toBeDefined();
            expect(hasteStatus1!.elapsed).toBe(1);

            // 2. Elapse 3 rounds
            const elapsedResult = OnRoundsElapsed(TEMP_BESS_FILE_PATH, 3);
            expect(elapsedResult instanceof CharacterError).toBe(false);
            const charElapsed = elapsedResult as CharacterRep;
            const hasteStatusElapsed = charElapsed.statuses.find(s => s.name === 'Haste');
            expect(hasteStatusElapsed).toBeDefined();
            expect(hasteStatusElapsed!.elapsed).toBe(4);

            // 3. Re-cast Haste on Self using another available level 3 spontaneous slot
            const cast2 = OnCastSpell(TEMP_BESS_FILE_PATH, {
                casterClassName: 'Bard',
                spellLevel: '3',
                spellName: 'Haste',
                slotIndex: 1,
                isUsed: false,
                isEmpty: false,
                targets: ['Self']
            });
            expect(cast2 instanceof CharacterError).toBe(false);
            const char2 = cast2 as CharacterRep;

            // Verify only ONE Haste status exists in representation and elapsed is reset to 1
            const hasteStatuses = char2.statuses.filter(s => s.name === 'Haste');
            expect(hasteStatuses).toHaveLength(1);
            expect(hasteStatuses[0].elapsed).toBe(1);
            expect(hasteStatuses[0].duration).toBe(hasteStatus1!.duration);

            // Verify file content contains exactly one Haste status line
            const fileContent = fs.readFileSync(TEMP_BESS_FILE_PATH, 'utf8');
            const hasteMatches = fileContent.match(/^Haste:.*$/gm) || [];
            expect(hasteMatches).toHaveLength(1);
            expect(hasteMatches[0]).toContain('1 rounds');
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
});
