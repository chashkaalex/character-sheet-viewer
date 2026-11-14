import { Character } from '../../server/character/character';
import { getCharacterRep } from '../../server/character/character_rep';
import {
  getPinnedSpecialAttack,
  SetPinnedSpecialAttack
} from '../../server/character/character_preferences';
import {
  getFavoriteSpecialAttack,
  selectDefaultWeaponIndex,
  setFavoriteSpecialAttack
} from '../../client/ts/dashboard_script';

describe('Preferred Weapons ([*]) and Pinned Special Attacks', () => {
  function buildInlineCharacter(classLine: string, battleGearLines: string[]) {
    const lines = [
      'Test Character',
      `(${classLine})`,
      'BAb: +4; Grapple: +6; Hp: 30/30; Speed: 30 ft.',
      'Attack: +6 Longsword (1d8+2/19-20).',
      'AC: 15 (10 +3 Armor +2 Dex), Touch 12, Flat-footed 13.',
      'Saves: Fort +4; Ref +3; Will +2.',
      'Str: 14 (+2)',
      'Dex: 14 (+2)',
      'Con: 12 (+1)',
      'Int: 10 (+0)',
      'Wis: 14 (+2)',
      'Cha: 10 (+0)',
      'Statuses:',
      'Feats:',
      'Special Abilities:',
      'Racial Traits:',
      'Bonus Abilities:',
      'Skills:',
      'Battle Gear:',
      ...battleGearLines.map(w => w + ','),
      'Possessions:',
      'Personal Information:'
    ];
    const char = new Character(lines);
    char.ParseCharacter();
    expect(char.parseErrors).toEqual([]);
    return getCharacterRep(char);
  }

  test('parses [*] prefix cleanly on Battle Gear weapons and exposes isPreferred in CharacterRep', () => {
    const rep = buildInlineCharacter('Human Fighter 4', [
      'Dagger',
      '[*] +1 Longsword'
    ]);

    expect(rep.isMonk).toBe(false);
    const longsword = rep.weapons.find((w: any) => w.name === '+1 Longsword');
    const dagger = rep.weapons.find((w: any) => w.name === 'Dagger');

    expect(longsword).toBeDefined();
    expect(longsword.isPreferred).toBe(true);
    expect(longsword.rolzAtkRollMessage).not.toContain('[*]');
    expect(dagger).toBeDefined();
    expect(dagger.isPreferred).toBe(false);

    const defaultIdx = selectDefaultWeaponIndex(rep.weapons, rep.isMonk);
    expect(rep.weapons[defaultIdx].name).toBe('+1 Longsword');
  });

  test('Monk defaults to Unarmed unless another weapon has [*]', () => {
    const monkDefaultRep = buildInlineCharacter('Human Monk 5', [
      'Kusarigama',
      'Sling'
    ]);
    expect(monkDefaultRep.isMonk).toBe(true);
    const defaultMonkIdx = selectDefaultWeaponIndex(monkDefaultRep.weapons, monkDefaultRep.isMonk);
    expect(monkDefaultRep.weapons[defaultMonkIdx].name).toBe('Unarmed');

    const monkPreferredRep = buildInlineCharacter('Human Monk 5', [
      '[*] Kusarigama',
      'Sling'
    ]);
    const preferredMonkIdx = selectDefaultWeaponIndex(monkPreferredRep.weapons, monkPreferredRep.isMonk);
    expect(monkPreferredRep.weapons[preferredMonkIdx].name).toBe('Kusarigama');
  });

  test('non-Monk without [*] falls back to first non-Unarmed weapon', () => {
    const rep = buildInlineCharacter('Human Fighter 4', [
      'Longsword'
    ]);
    const idx = selectDefaultWeaponIndex(rep.weapons, rep.isMonk);
    expect(rep.weapons[idx].name).toBe('Longsword');
  });

  test('persists and clears pinned special attack in localStorage per docId', () => {
    const store = new Map<string, string>();
    (global as any).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k)
      }
    };

    expect(getFavoriteSpecialAttack('doc_a')).toBeNull();
    setFavoriteSpecialAttack('doc_a', 'Trip');
    expect(getFavoriteSpecialAttack('doc_a')).toBe('Trip');
    expect(getFavoriteSpecialAttack('doc_b')).toBeNull();

    setFavoriteSpecialAttack('doc_a', null);
    expect(getFavoriteSpecialAttack('doc_a')).toBeNull();
  });

  test('persists and clears pinned special attack in GAS UserProperties per docId', () => {
    const props = new Map<string, string>();
    (global as any).PropertiesService = {
      getUserProperties: () => ({
        getProperty: (k: string) => props.get(k) ?? null,
        setProperty: (k: string, v: string) => props.set(k, v)
      })
    };

    try {
      expect(getPinnedSpecialAttack('thror_doc')).toBeNull();
      const setRes = SetPinnedSpecialAttack('thror_doc', 'Trip');
      expect(setRes).toEqual({ success: true, pinnedSpecialAttack: 'Trip' });
      expect(getPinnedSpecialAttack('thror_doc')).toBe('Trip');
      expect(getPinnedSpecialAttack('bess_doc')).toBeNull();

      SetPinnedSpecialAttack('bess_doc', 'Disarm');
      expect(getPinnedSpecialAttack('thror_doc')).toBe('Trip');
      expect(getPinnedSpecialAttack('bess_doc')).toBe('Disarm');

      const clearRes = SetPinnedSpecialAttack('thror_doc', null);
      expect(clearRes).toEqual({ success: true, pinnedSpecialAttack: null });
      expect(getPinnedSpecialAttack('thror_doc')).toBeNull();
      expect(getPinnedSpecialAttack('bess_doc')).toBe('Disarm');
    } finally {
      delete (global as any).PropertiesService;
    }
  });
});
