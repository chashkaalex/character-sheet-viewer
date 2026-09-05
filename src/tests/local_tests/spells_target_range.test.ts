import {
    SpellTarget,
    GetSpellData,
    GetSpellTarget,
    GetSpellRange
} from '../../server/character/spells';

describe('Spell Range and Target Definitions', () => {
    test('should properly define range and target for self spells', () => {
        expect(GetSpellTarget('Divine Favor')).toBe(SpellTarget.Self);
        expect(GetSpellRange('Divine Favor')).toBe('Personal');

        expect(GetSpellTarget('Expeditious Retreat')).toBe(SpellTarget.Self);
        expect(GetSpellRange('Expeditious Retreat')).toBe('Personal');

        expect(GetSpellTarget('Mislead')).toBe(SpellTarget.Self);
        expect(GetSpellRange('Mislead')).toBe('Close');
    });

    test('should properly define range and target for touch/single creature spells', () => {
        expect(GetSpellTarget('Shield of Faith')).toBe(SpellTarget.OneCreature);
        expect(GetSpellRange('Shield of Faith')).toBe('Touch');

        expect(GetSpellTarget('Bull\'s Strength')).toBe(SpellTarget.OneCreature);
        expect(GetSpellRange('Bull\'s Strength')).toBe('Touch');

        expect(GetSpellTarget('Enlarge Person')).toBe(SpellTarget.OneCreature);
        expect(GetSpellRange('Enlarge Person')).toBe('Close');

        expect(GetSpellTarget('Cure Light Wounds')).toBe(SpellTarget.OneCreature);
        expect(GetSpellRange('Cure Light Wounds')).toBe('Touch');
    });

    test('should properly define range and target for party/multi-target spells', () => {
        expect(GetSpellTarget('Bless')).toBe(SpellTarget.Party);
        expect(GetSpellRange('Bless')).toBe('50 ft.');

        expect(GetSpellTarget('Prayer')).toBe(SpellTarget.Party);
        expect(GetSpellRange('Prayer')).toBe('40 ft.');

        expect(GetSpellTarget('Haste')).toBe(SpellTarget.MultipleCreatures);
        expect(GetSpellRange('Haste')).toBe('Close');

        expect(GetSpellTarget('Inspire Courage')).toBe(SpellTarget.Party);
        expect(GetSpellRange('Inspire Courage')).toBe('Personal');
    });

    test('should properly define range and target for area and object spells', () => {
        expect(GetSpellTarget('Light')).toBe(SpellTarget.Object);
        expect(GetSpellRange('Light')).toBe('Touch');

        expect(GetSpellTarget('Grease')).toBe(SpellTarget.Area);
        expect(GetSpellRange('Grease')).toBe('Close');

        expect(GetSpellTarget('Glitterdust')).toBe(SpellTarget.Area);
        expect(GetSpellRange('Glitterdust')).toBe('Medium');
    });

    test('GetSpellData should return valid complete SpellData', () => {
        const hasteData = GetSpellData('Haste');
        expect(hasteData).toBeDefined();
        expect(hasteData?.range).toBe('Close');
        expect(hasteData?.target).toBe(SpellTarget.MultipleCreatures);
        expect(typeof hasteData?.calculateDuration).toBe('function');
    });

    test('GetSpellData should return null for unknown spell', () => {
        expect(GetSpellData('NonExistentSpell')).toBeNull();
        expect(GetSpellTarget('NonExistentSpell')).toBeNull();
        expect(GetSpellRange('NonExistentSpell')).toBeNull();
    });
});
