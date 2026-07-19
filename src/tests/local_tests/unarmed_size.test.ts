import { Character } from '../../server/character/character';
import { OnCastSpell } from '../../server/character/character_manipulation';
import * as fs from 'fs';
import * as path from 'path';

describe('Unarmed Damage Size Scaling Tests', () => {
    const TEMP_THROR_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'temp', 'temp_thror_unarmed_size_test.txt');
    const SOURCE_THROR_FILE_PATH = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

    beforeEach(() => {
        if (fs.existsSync(TEMP_THROR_FILE_PATH)) {
            fs.unlinkSync(TEMP_THROR_FILE_PATH);
        }
        if (!fs.existsSync(path.dirname(TEMP_THROR_FILE_PATH))) {
            fs.mkdirSync(path.dirname(TEMP_THROR_FILE_PATH), { recursive: true });
        }
        fs.copyFileSync(SOURCE_THROR_FILE_PATH, TEMP_THROR_FILE_PATH);
    });

    afterAll(() => {
        if (fs.existsSync(TEMP_THROR_FILE_PATH)) {
            fs.unlinkSync(TEMP_THROR_FILE_PATH);
        }
    });

    it('should calculate Thror unarmed damage as 2d10 normally (Medium size)', () => {
        const char = new Character(fs.readFileSync(TEMP_THROR_FILE_PATH, 'utf8').split('\n'));
        char.ParseCharacter();
        const unarmed = char.weapons.find(w => w.baseName === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.damage).toBe('2d10');
    });

    it('should scale Thror unarmed damage to 4d8 when Enlarged (Large size)', () => {
        // Cast Enlarge Person on Thror
        const slotData = {
            casterClassName: 'Cleric',
            spellLevel: '1 - domain',
            spellName: 'Enlarge Person',
            slotIndex: 0,
            isUsed: false,
            isEmpty: false
        };

        const result = OnCastSpell(TEMP_THROR_FILE_PATH, slotData);
        expect(typeof result).not.toBe('string');
        const charRep = result as any;

        // Verify status added
        expect(charRep.statuses.some((s: any) => s.name === 'Enlarge Person')).toBe(true);

        // Verify size is Large by reloading the character
        const char = new Character(fs.readFileSync(TEMP_THROR_FILE_PATH, 'utf8').split('\n'));
        char.ParseCharacter();
        expect(char.size.currentSize.name).toBe('Large');

        // Verify unarmed damage scaled to 4d8
        const unarmed = char.weapons.find(w => w.baseName === 'Unarmed');
        expect(unarmed).toBeDefined();
        expect(unarmed!.damage).toBe('4d8');
    });

    it('should scale Small Monk unarmed damage correctly', () => {
        const lines = [
            'Small Monk Test',
            'Halfling Monk 1',
            'Hp 10 Speed 30',
            'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 10 (+0)', 'Cha 10 (+0)',
            'Attack: Unarmed +0 (1d2)',
            'Statuses:',
            'Feats:',
            'Special Abilities:',
            'Racial Traits:',
            'Bonus Abilities:',
            'Skills:',
            'Personal Information:'
        ];
        const char = new Character(lines);
        char.ParseCharacter();
        // Manually set base size to Small for test
        char.size.score = { name: 'Small', next: 'Medium', previous: 'Tiny', modifier: 1, bonus: -4 };
        char.size.currentSize = { name: 'Small', next: 'Medium', previous: 'Tiny', modifier: 1, bonus: -4 };
        // Recalculate weapons
        char.weapons.forEach(w => w.calculateWeaponStats(char));

        const unarmed = char.weapons.find(w => w.baseName === 'Unarmed');
        expect(unarmed).toBeDefined();
        // No size change from base (both are Small), so damage is the base 1d6
        expect(unarmed!.damage).toBe('1d6');

        // Enlarged to Medium (current size Medium, original size Small => sizeStep = +1)
        char.size.currentSize = { name: 'Medium', next: 'Large', previous: 'Small', modifier: 0, bonus: 0 };
        char.weapons.forEach(w => w.calculateWeaponStats(char));
        const unarmedEnlarged = char.weapons.find(w => w.baseName === 'Unarmed');
        expect(unarmedEnlarged).toBeDefined();
        expect(unarmedEnlarged!.damage).toBe('1d8');
    });
});
