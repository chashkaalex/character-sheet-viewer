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

// Import character to load classes
import '../../server/character/character';

import { GetCharacterByDocId, OnUseAction, OnRoundsElapsed } from '../../server/character/character_manipulation';
import { CharacterError } from '../../server/character/character';

describe('Ring of Storing - Cast Action Integration Tests', () => {
    const TEMP_DEIN_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_ring_storing_dein.txt');
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

    it('should parse Ring of Storing without missing-effects warning and add Cast Expeditious Retreat action', () => {
        const char = GetCharacterByDocId(TEMP_DEIN_PATH);
        expect(char instanceof CharacterError).toBe(false);
        if (char instanceof CharacterError) return;

        // Verify Ring of Storing is equipped in battle gear with Fingers slot
        const ring = char.battleGear.find(i => i.name === 'Ring of Storing');
        expect(ring).toBeDefined();
        expect(ring?.bodySlot).toBe('Fingers');

        // Verify no warnings for Ring of Storing missing effects
        const ringWarning = char.parseWarnings.find(w => w.includes('Ring of Storing'));
        expect(ringWarning).toBeUndefined();

        // Verify Cast Expeditious Retreat action is available
        expect(char.actions).toContain('Cast Expeditious Retreat');
        expect(char.HasStatus('Expeditious Retreat')).toBe(false);

        // Verify initial speed
        expect(char.speed.currentScore).toBe(20);
    });

    it('should cast Expeditious Retreat, boost speed by +30 ft, and not consume or modify the ring', () => {
        // 1. Initial State
        const char = GetCharacterByDocId(TEMP_DEIN_PATH);
        expect(char instanceof CharacterError).toBe(false);
        if (char instanceof CharacterError) return;
        expect(char.speed.currentScore).toBe(20);

        // 2. Use action
        const useResult = OnUseAction(TEMP_DEIN_PATH, 'Cast Expeditious Retreat');
        expect(useResult instanceof CharacterError).toBe(false);
        if (useResult instanceof CharacterError) return;

        // Verify status added in representation with 10 rounds duration
        const status = useResult.statuses.find(s => s.name === 'Expeditious Retreat');
        expect(status).toBeDefined();
        expect(status?.duration).toBe(10);

        // Verify speed boosted from 20 to 50 (+30 Enhancement)
        expect(useResult.speed.currentScore).toBe(50);

        // Verify actionsMetadata includes statusName mapping
        expect(useResult.actionsMetadata).toBeDefined();
        expect(useResult.actionsMetadata?.['Cast Expeditious Retreat']?.statusName).toBe('Expeditious Retreat');

        // Verify the status was written to the file
        const fileContent = fs.readFileSync(TEMP_DEIN_PATH, 'utf8');
        expect(fileContent).toContain('Expeditious Retreat: 1 rounds/10 rounds');

        // Verify the ring item line is intact and not changed
        expect(fileContent).toContain('Ring of Storing (1lvl) [1x Expeditious Retreat]');

        // 3. Triggering again while active should be rejected
        const duplicateResult = OnUseAction(TEMP_DEIN_PATH, 'Cast Expeditious Retreat');
        expect(duplicateResult instanceof CharacterError).toBe(true);
        if (duplicateResult instanceof CharacterError) {
            expect(duplicateResult.errorMessage).toContain('already active');
        }
    });

    it('should expire after 10 rounds, restore speed to 20, and allow re-casting indefinitely', () => {
        // 1. Activate
        const useResult = OnUseAction(TEMP_DEIN_PATH, 'Cast Expeditious Retreat');
        expect(useResult instanceof CharacterError).toBe(false);
        if (useResult instanceof CharacterError) return;
        expect(useResult.speed.currentScore).toBe(50);

        // 2. Advance 10 rounds to expire the status
        const elapsedResult = OnRoundsElapsed(TEMP_DEIN_PATH, 10);
        expect(elapsedResult instanceof CharacterError).toBe(false);
        if (elapsedResult instanceof CharacterError) return;

        // Verify status is gone and speed restored to 20
        expect(elapsedResult.statuses.some(s => s.name === 'Expeditious Retreat')).toBe(false);
        expect(elapsedResult.speed.currentScore).toBe(20);

        // Verify action is STILL present on character
        expect(elapsedResult.actions).toContain('Cast Expeditious Retreat');

        // 3. Re-cast the action indefinitely
        const recastResult = OnUseAction(TEMP_DEIN_PATH, 'Cast Expeditious Retreat');
        expect(recastResult instanceof CharacterError).toBe(false);
        if (recastResult instanceof CharacterError) return;
        expect(recastResult.speed.currentScore).toBe(50);
        expect(recastResult.statuses.some(s => s.name === 'Expeditious Retreat')).toBe(true);
    });
});
