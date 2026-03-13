const { Character } = require('../server/character/character');

describe('Untrained Skills', () => {
    let char;
    const lines = [
        'Test Character',
        'Human',
        'Abilities:',
        'Str: 10',
        'Dex: 10',
        'Con: 10',
        'Int: 10',
        'Wis: 10',
        'Char: 10',
        'Skills:'
        // No skills defined
    ];

    beforeEach(() => {
        char = new Character(lines);
        char.ParseCharacter();
    });

    test('should apply effect to a known but untrained skill (e.g., Swim)', () => {
        const effect = {
            property: 'Swim',
            value: 2,
            modifierType: 'Competence',
            status: 'TestSwimBuff'
        };

        char.ApplyEffect(effect);

        const swimSkill = char.skills.find(s => s.name === 'Swim');
        expect(swimSkill).toBeDefined();
        expect(swimSkill.currentScore).toBe(0 + 2); // 0 ranks + 2 bonus
    });


});
