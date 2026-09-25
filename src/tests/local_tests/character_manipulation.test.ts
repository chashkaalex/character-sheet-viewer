import * as fs from 'fs';
import * as path from 'path';
import { UpdateHp, AddStatusToCharacter, GetCharacterByDocId, GetCharacterRepByDocId, OnRoundsElapsed, RemoveAllStatusesFromCharacter, MoveInventoryItem, UsePotion } from '../../server/character/character_manipulation';
import { CharacterError, Character } from '../../server/character/character';
import { CharacterRep } from '../../server/character/character_rep';
import { IsSectionLine } from '../../server/character/parsers/doc_parser';

describe('Character Manipulation & Status Integration Tests', () => {
    const TEMP_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_thror_test.txt');
    const SOURCE_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

    const TEMP_BESS_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_bess_test.txt');
    const SOURCE_BESS_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'bess_test.txt');

    beforeEach(() => {
        if (fs.existsSync(TEMP_FILE_PATH)) {
            fs.unlinkSync(TEMP_FILE_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_FILE_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_FILE_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_FILE_PATH, TEMP_FILE_PATH);

        if (fs.existsSync(TEMP_BESS_FILE_PATH)) {
            fs.unlinkSync(TEMP_BESS_FILE_PATH);
        }
        fs.copyFileSync(SOURCE_BESS_FILE_PATH, TEMP_BESS_FILE_PATH);
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

    it('should preserve Keeping Grudge status and its penalties across round elapses due to infinite duration', () => {
        // Inflict damage to apply Keeping Grudge
        let result = UpdateHp(TEMP_FILE_PATH, 1, 'inflict');
        expect(result instanceof CharacterError).toBe(false);

        // Elapse 5 rounds
        result = OnRoundsElapsed(TEMP_FILE_PATH, 5);
        expect(result instanceof CharacterError).toBe(false);
        const char = result as CharacterRep;

        // Verify status remains active (with updated elapsed round count)
        const status = char.statuses.find(s => s.name === 'Keeping Grudge');
        expect(status).toBeDefined();
        expect(status!.duration).toBe(-1);
        expect(status!.elapsed).toBe(6); // 1 + 5 = 6

        // Verify Fort save penalty still applies
        expect(char.saves.Fort.bonus).toBe(14);

        // Verify File Mutation reflects updated elapsed rounds
        const updatedLines = fs.readFileSync(TEMP_FILE_PATH, 'utf8').split('\n');
        const statusUpdated = updatedLines.some(line => line.includes('Keeping Grudge: 6 rounds/-1 rounds'));
        expect(statusUpdated).toBe(true);
    });

    it('should apply Thror feat of strength status effects', () => {
        const result = AddStatusToCharacter(TEMP_FILE_PATH, 'Feat of Strength', 1);
        const char = result as CharacterRep;
        expect(char.abilities.Str.currentScore).toBe(16 + 4 - 2); //original 16 + Feat of Strength (+3@Cleric +1@Sacred Fist/2) - (already has +2 enh from hand wraps))
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

    it('should apply "Use Thror\'s Holy Symbol" status effects and mutate unarmed strike stats', () => {
        // Verify action is unlocked by the item on load
        const initialChar = GetCharacterByDocId(TEMP_FILE_PATH);
        expect(initialChar instanceof CharacterError).toBe(false);
        if (initialChar instanceof CharacterError) return;
        expect(initialChar.actions).toContain('Use Thror\'s Holy Symbol');

        const result = AddStatusToCharacter(TEMP_FILE_PATH, 'Use Thror\'s Holy Symbol', 10);
        expect(result instanceof CharacterError).toBe(false);
        const char = result as CharacterRep;

        const unarmed = char.weapons.find(w => w.name === 'Unarmed');
        expect(unarmed).toBeDefined();
        if (!unarmed) return;

        expect(unarmed.critValue).toBe('19-20X2');

        // Check file mutation contains the status line
        const updatedLines = fs.readFileSync(TEMP_FILE_PATH, 'utf8').split('\n');
        const statusAdded = updatedLines.some(line => line.includes('Use Thror\'s Holy Symbol: 1 rounds/10 rounds'));
        expect(statusAdded).toBe(true);
    });

    it('should refresh status and avoid duplicates when AddStatusToCharacter is called', () => {
        // 1. Add Prayer status to Bess (duration 10, elapsed 4)
        AddStatusToCharacter(TEMP_BESS_FILE_PATH, 'Prayer', 10, 4);
        let charRep = GetCharacterRepByDocId(TEMP_BESS_FILE_PATH) as CharacterRep;
        const prayer = charRep.statuses.find(s => s.name === 'Prayer');
        expect(prayer).toBeDefined();
        expect(prayer!.elapsed).toBe(4);

        // 2. Add Prayer status again with duration 10
        const result = AddStatusToCharacter(TEMP_BESS_FILE_PATH, 'Prayer', 10);
        expect(result instanceof CharacterError).toBe(false);
        charRep = result as CharacterRep;

        // Verify only one Prayer status exists and elapsed is reset to 1
        const prayerStatuses = charRep.statuses.filter(s => s.name === 'Prayer');
        expect(prayerStatuses).toHaveLength(1);
        expect(prayerStatuses[0].elapsed).toBe(1);

        // Verify file contains only one Prayer status line
        const fileContent = fs.readFileSync(TEMP_BESS_FILE_PATH, 'utf8');
        const prayerLines = fileContent.match(/^Prayer:.*$/gm) || [];
        expect(prayerLines).toHaveLength(1);
    });

    it('should successfully remove all statuses from the character', () => {
        // Add a couple of statuses
        let result = AddStatusToCharacter(TEMP_BESS_FILE_PATH, 'Shield of Faith', 10);
        expect(result instanceof CharacterError).toBe(false);
        result = AddStatusToCharacter(TEMP_BESS_FILE_PATH, 'Inspirational Boost', 1);
        expect(result instanceof CharacterError).toBe(false);

        // Verify they are added
        const char = result as CharacterRep;
        expect(char.statuses).toHaveLength(2);

        // Call RemoveAllStatusesFromCharacter
        const clearResult = RemoveAllStatusesFromCharacter(TEMP_BESS_FILE_PATH);
        expect(clearResult instanceof CharacterError).toBe(false);
        const finalChar = clearResult as CharacterRep;

        // Verify all statuses are removed from representation
        expect(finalChar.statuses).toHaveLength(0);

        // Verify File Mutation: the list should be empty
        const updatedLines = fs.readFileSync(TEMP_BESS_FILE_PATH, 'utf8').split('\n');
        // Statuses section is followed by Feats, so all lines between Statuses and Feats should be empty/removed
        const statusIdx = updatedLines.findIndex(l => l.trim().startsWith('Statuses:'));
        const featsIdx = updatedLines.findIndex(l => l.trim().startsWith('Feats:'));
        for (let i = statusIdx + 1; i < featsIdx; i++) {
            expect(updatedLines[i].trim()).toBe('');
        }
    });

    it('should apply Prayer status effects (luck bonus to attacks, saves, damage, and skills) correctly', () => {
        // Retrieve base character first to get baseline values
        const baseChar = GetCharacterRepByDocId(TEMP_BESS_FILE_PATH) as CharacterRep;
        const baseWill = baseChar.saves.Will.bonus;
        const baseFort = baseChar.saves.Fort.bonus;
        const baseRef = baseChar.saves.Ref.bonus;
        const basePerform = baseChar.skills['Perform (voice)'].currentScore;
        const baseUnarmedAttack = baseChar.weapons.find(w => w.name === 'Unarmed')!.attackBonus.bonus;

        // Apply Prayer
        const result = AddStatusToCharacter(TEMP_BESS_FILE_PATH, 'Prayer', 5);
        expect(result instanceof CharacterError).toBe(false);
        const char = result as CharacterRep;

        // Verify status was added
        expect(char.statuses.find(s => s.name === 'Prayer')).toBeDefined();

        // Verify save bonuses (+1 Luck)
        expect(char.saves.Will.bonus).toBe(baseWill + 1);
        expect(char.saves.Fort.bonus).toBe(baseFort + 1);
        expect(char.saves.Ref.bonus).toBe(baseRef + 1);

        // Verify skill bonus (+1 Luck)
        expect(char.skills['Perform (voice)'].currentScore).toBe(basePerform + 1);

        // Verify attack bonus (+1 Luck)
        const unarmed = char.weapons.find(w => w.name === 'Unarmed')!;
        expect(unarmed.attackBonus.bonus).toBe(baseUnarmedAttack + 1);

        // Clean up status
        const cleanResult = RemoveAllStatusesFromCharacter(TEMP_BESS_FILE_PATH);
        expect(cleanResult instanceof CharacterError).toBe(false);
    });

    it('should successfully move an item between Battle Gear and Possessions and mutate the file', () => {
        const baseChar = GetCharacterRepByDocId(TEMP_BESS_FILE_PATH) as CharacterRep;
        expect(baseChar.battleGear.length).toBeGreaterThan(0);
        const itemToMove = baseChar.battleGear[0].name;

        // Move item from Battle Gear to Possessions
        const moveResult = MoveInventoryItem(TEMP_BESS_FILE_PATH, itemToMove, 'Battle Gear', 'Possessions');
        expect(moveResult instanceof CharacterError).toBe(false);
        const charRepAfterMove = moveResult as CharacterRep;

        // Verify item is now in Possessions and NOT in Battle Gear in returned rep
        expect(charRepAfterMove.battleGear.some(item => item.name === itemToMove)).toBe(false);
        expect(charRepAfterMove.possessions.some(item => item.name === itemToMove)).toBe(true);

        // Verify File Mutation: read the file lines and check that the item is under Possessions
        const fileContent = fs.readFileSync(TEMP_BESS_FILE_PATH, 'utf8');
        const lines = fileContent.split(/\r?\n/);

        const battleGearIdx = lines.findIndex(l => l.trim().startsWith('Battle Gear:'));
        const possessionsIdx = lines.findIndex(l => l.trim().startsWith('Possessions:'));

        // Find next section dynamically
        let nextSectionIdx = possessionsIdx + 1;
        while (nextSectionIdx < lines.length && !IsSectionLine(lines[nextSectionIdx])) {
            nextSectionIdx++;
        }

        const itemLineIdx = lines.findIndex(l => l.toLowerCase().includes(itemToMove.toLowerCase()));
        expect(itemLineIdx).toBeGreaterThan(possessionsIdx);
        expect(itemLineIdx).toBeLessThan(nextSectionIdx);

        // Move it back to restore baseline state
        const restoreResult = MoveInventoryItem(TEMP_BESS_FILE_PATH, itemToMove, 'Possessions', 'Battle Gear');
        expect(restoreResult instanceof CharacterError).toBe(false);
    });

    it('should successfully consume a potion, update HP, decrement count, and remove when empty', () => {
        // Append Rolz Room ID so potion consumption is enabled
        fs.appendFileSync(TEMP_BESS_FILE_PATH, '\nRolz Room ID: oy2gymrcju\n');

        // 1. Inflict some damage first to make room for healing
        // Bess has max HP 74. Set current HP to 49.
        const dmgResult = UpdateHp(TEMP_BESS_FILE_PATH, 25, 'inflict');
        expect(dmgResult instanceof CharacterError).toBe(false);
        let charRep = dmgResult as CharacterRep;
        expect(charRep.hp.current).toBe(49);

        // Verify Bess has Potion of Cure Light Wounds
        const potionName = 'Potion of Cure Light Wounds';
        let potionItem = charRep.battleGear.find(i => i.name === potionName);
        expect(potionItem).toBeDefined();

        // 2. Consume first potion
        const useResult1 = UsePotion(TEMP_BESS_FILE_PATH, potionName);
        expect(useResult1 instanceof CharacterError).toBe(false);
        charRep = useResult1 as CharacterRep;

        // Verify HP has increased
        expect(charRep.hp.current).toBeGreaterThan(49);
        expect(charRep.hp.current).toBeLessThanOrEqual(74);

        // Verify count decremented (originally 2, now should be 1)
        potionItem = charRep.battleGear.find(i => i.name === potionName);
        expect(potionItem).toBeDefined();
        expect(potionItem!.amount).toBe(1);

        // Verify file contains the decremented line
        let fileContent = fs.readFileSync(TEMP_BESS_FILE_PATH, 'utf8');
        expect(fileContent).toContain('Potion of Cure Light Wounds (1)');

        // Save HP to check subsequent drink
        const hpAfterFirstDrink = charRep.hp.current;

        // If she is already at max HP, damage her again to test the second drink
        if (hpAfterFirstDrink >= 74) {
            UpdateHp(TEMP_BESS_FILE_PATH, 25, 'inflict');
        }

        // 3. Consume second potion (should be last one)
        const useResult2 = UsePotion(TEMP_BESS_FILE_PATH, potionName);
        expect(useResult2 instanceof CharacterError).toBe(false);
        charRep = useResult2 as CharacterRep;

        // Verify potion is completely removed from battleGear representation
        potionItem = charRep.battleGear.find(i => i.name === potionName);
        expect(potionItem).toBeUndefined();

        // Verify file doesn't contain the potion line anymore
        fileContent = fs.readFileSync(TEMP_BESS_FILE_PATH, 'utf8');
        expect(fileContent).not.toContain('Potion of Cure Light Wounds');
    });
});
