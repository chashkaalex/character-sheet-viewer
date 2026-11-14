import * as fs from 'fs';
import * as path from 'path';
import { Character } from '../../server/character/character';
import { getCharacterRep } from '../../server/character/character_rep';
import { setCharacterRep } from '../../client/ts/state';
import { onFullAttackToggle, populateWeaponDropdown } from '../../client/ts/dashboard/weapons';

function createMockElement(id = '', tag = 'div'): any {
  const el: any = {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    innerHTML: '',
    textContent: '',
    className: '',
    style: {},
    dataset: {},
    options: [],
    children: [],
    classList: {
      _set: new Set<string>(),
      add(...cls: string[]) { cls.forEach(c => this._set.add(c)); },
      remove(...cls: string[]) { cls.forEach(c => this._set.delete(c)); },
      toggle(c: string, force?: boolean) {
        if (force === undefined) {
          if (this._set.has(c)) { this._set.delete(c); return false; }
          this._set.add(c); return true;
        }
        if (force) this._set.add(c); else this._set.delete(c);
        return force;
      },
      contains(c: string) { return this._set.has(c); }
    },
    appendChild(child: any) {
      this.children.push(child);
      if (tag === 'select' && child.tagName === 'OPTION') {
        this.options.push(child);
      }
      return child;
    },
    removeAttribute: jest.fn(),
    addEventListener: jest.fn()
  };
  return el;
}

describe('Full Attack UI Rendering & Roll All', () => {
  test('Thror with Unarmed + Show Full renders multiple .multi-atk-span elements with rolzRollMessage', () => {
    const filePath = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const char = new Character(lines, filePath);
    char.ParseCharacter();
    const rep = getCharacterRep(char);
    rep.docId = 'thror_full_attack_ui';
    setCharacterRep(rep);

    const elements = new Map<string, any>();
    const weaponSelect = createMockElement('weaponSelect', 'select');
    const offHandSelect = createMockElement('offHandSelect', 'select');
    const weaponCombinedStats = createMockElement('weaponCombinedStats', 'span');
    const offHandRow = createMockElement('offHandRow', 'div');
    const offHandStats = createMockElement('offHandStats', 'span');
    const twfToggleRow = createMockElement('twfToggleRow', 'div');
    const attacksOfOpportunity = createMockElement('attacksOfOpportunity', 'span');

    [weaponSelect, offHandSelect, weaponCombinedStats, offHandRow, offHandStats, twfToggleRow, attacksOfOpportunity]
      .forEach(e => elements.set(e.id, e));

    // Track dynamically created spans when innerHTML is assigned
    Object.defineProperty(weaponCombinedStats, 'innerHTML', {
      get() { return this._html || ''; },
      set(val: string) {
        this._html = val;
        const matches = [...val.matchAll(/id="(weaponFullAtk\d+|weaponDmgValue|weaponCritValue|weaponWarningBadge)"/g)];
        matches.forEach(m => {
          if (!elements.has(m[1])) {
            elements.set(m[1], createMockElement(m[1], 'span'));
          }
        });
      }
    });

    (global as any).document = {
      getElementById: (id: string) => elements.get(id) ?? null,
      createElement: (tag: string) => createMockElement('', tag),
      body: { contains: () => true }
    };

    try {
      populateWeaponDropdown();
      onFullAttackToggle({ checked: true } as HTMLInputElement);

      const unarmed = rep.weapons.find((w: any) => w.name === 'Unarmed');
      expect(unarmed.fullAttack.normal.attacks.length).toBeGreaterThan(1);

      const atkSpans = Array.from(elements.entries())
        .filter(([id]) => id.startsWith('weaponFullAtk'))
        .map(([, el]) => el);

      expect(atkSpans.length).toBe(unarmed.fullAttack.normal.attacks.length);
      atkSpans.forEach(span => {
        expect(span.dataset.rolzRollMessage).toBeTruthy();
        expect(span.dataset.tooltip).toBeTruthy();
      });
    } finally {
      onFullAttackToggle({ checked: false } as HTMLInputElement);
      delete (global as any).document;
    }
  });
});

