import { ParseSkills, RegularSkills, isSkillTrainedOnly } from '../../server/character/properties/skills';
import { Ability } from '../../server/character/properties/abilities/ability';
import { AbilitiesMap } from '../../server/character/properties/abilities/ability_types';
import { ModifiableProperty } from '../../server/character/00_property';
import { getSkillFilterPreference, SetSkillFilterPreference } from '../../server/character/character_preferences';

function makeAbilities(): AbilitiesMap {
  return {
    Str: new Ability(14, 'Str'),
    Dex: new Ability(16, 'Dex'),
    Con: new Ability(12, 'Con'),
    Int: new Ability(14, 'Int'),
    Wis: new Ability(10, 'Wis'),
    Cha: new Ability(8, 'Cha')
  };
}

describe('Regular D&D 3.5 Skills & Filter Preferences', () => {
  it('populates all regular skills with 0 ranks and omits generic placeholders', () => {
    const abilities = makeAbilities();
    const acp = new ModifiableProperty(-2, 'Armor Check Penalty', false);
    const parsed = ParseSkills(['Tumble (Dex) 5', 'Profession (Lamplighter) (Wis) 2'], abilities, acp);

    const names = parsed.map(s => s.name);
    RegularSkills.forEach(skillName => {
      expect(names).toContain(skillName);
    });

    // No generic placeholders or class/non-rollable entries unless parsed
    expect(names).not.toContain('Craft');
    expect(names).not.toContain('Perform');
    expect(names).not.toContain('Profession');
    expect(names).not.toContain('Knowledge');
    expect(names).not.toContain('Speak Language');
    expect(names).not.toContain('Bardic Knowledge');
    expect(names).not.toContain('Martial Lore');

    // Untrained Balance gets Dex (+3) + Tumble synergy (+2) + ACP (-2) = +3
    const balance = parsed.find(s => s.name === 'Balance');
    expect(balance).toBeDefined();
    expect(balance!.score).toBe(0);
    expect(balance!.bonus).toBe(3);
    expect(balance!.state.trainedOnly).toBe(false);

    // Parsed trained skills preserve ranks and trainedOnly metadata
    const tumble = parsed.find(s => s.name === 'Tumble');
    expect(tumble!.score).toBe(5);
    expect(tumble!.state.trainedOnly).toBe(true);

    const profession = parsed.find(s => s.name === 'Profession (Lamplighter)');
    expect(profession!.score).toBe(2);
    expect(profession!.state.trainedOnly).toBe(true);
  });

  it('correctly identifies D&D 3.5 trained-only skills', () => {
    expect(isSkillTrainedOnly('Spot')).toBe(false);
    expect(isSkillTrainedOnly('Balance')).toBe(false);
    expect(isSkillTrainedOnly('Craft (Alchemy)')).toBe(false);
    expect(isSkillTrainedOnly('Perform (Sing)')).toBe(false);

    expect(isSkillTrainedOnly('Tumble')).toBe(true);
    expect(isSkillTrainedOnly('Use Magic Device')).toBe(true);
    expect(isSkillTrainedOnly('Knowledge (arcana)')).toBe(true);
    expect(isSkillTrainedOnly('Profession (Sailor)')).toBe(true);
    expect(isSkillTrainedOnly('Spellcraft')).toBe(true);
  });

  it('persists and retrieves skillFilter preference per docId via GAS UserProperties', () => {
    const store: Record<string, string> = {};
    (global as any).PropertiesService = {
      getUserProperties: () => ({
        getProperty: (k: string) => store[k] ?? null,
        setProperty: (k: string, v: string) => {
          store[k] = v;
        }
      })
    };

    try {
      expect(getSkillFilterPreference('doc-1')).toBeNull();

      const res1 = SetSkillFilterPreference('doc-1', 'all');
      expect(res1).toEqual({ success: true, skillFilter: 'all' });
      expect(getSkillFilterPreference('doc-1')).toBe('all');

      const res2 = SetSkillFilterPreference('doc-1', 'trained');
      expect(res2).toEqual({ success: true, skillFilter: 'trained' });
      expect(getSkillFilterPreference('doc-1')).toBe('trained');

      const res3 = SetSkillFilterPreference('doc-1', 'active');
      expect(res3).toEqual({ success: true, skillFilter: 'active' });
      expect(getSkillFilterPreference('doc-1')).toBe('active');
    } finally {
      delete (global as any).PropertiesService;
    }
  });
});
