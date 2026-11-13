import * as fs from 'fs';
import * as path from 'path';

interface MockElement {
  id: string;
  className: string;
  innerHTML: string;
  textContent: string;
  style: Record<string, string>;
  attributes: Record<string, string>;
  children: MockElement[];
  classList: {
    contains: (cls: string) => boolean;
    toggle: (cls: string) => boolean;
  };
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | undefined;
  appendChild: (child: MockElement) => void;
  querySelectorAll: (selector: string) => MockElement[];
}

const elementRegistry = new Map<string, MockElement>();

function createMockElement(): MockElement {
  let _innerHTML = '';
  const el: MockElement = {
    id: '',
    className: '',
    get innerHTML() {
      return _innerHTML;
    },
    set innerHTML(val: string) {
      _innerHTML = val;
      if (val === '') {
        this.children = [];
      }
    },
    textContent: '',
    style: {},
    attributes: {},
    children: [],
    classList: {
      contains(cls: string) {
        return el.className.split(/\s+/).filter(Boolean).includes(cls);
      },
      toggle(cls: string) {
        const parts = el.className.split(/\s+/).filter(Boolean);
        const idx = parts.indexOf(cls);
        if (idx >= 0) {
          parts.splice(idx, 1);
          el.className = parts.join(' ');
          return false;
        } else {
          parts.push(cls);
          el.className = parts.join(' ');
          return true;
        }
      }
    },
    setAttribute(name: string, value: string) {
      this.attributes[name] = value;
    },
    getAttribute(name: string) {
      return this.attributes[name];
    },
    appendChild(child: MockElement) {
      this.children.push(child);
      if (child.id) {
        elementRegistry.set(child.id, child);
      }
      // Register collapse button if present in innerHTML
      const btnMatch = child.innerHTML.match(/id="(actionCategory_[a-z]+CollapseBtn)"[^>]*>([^<]+)<\/button>/);
      if (btnMatch) {
        const btnEl = createMockElement();
        btnEl.id = btnMatch[1];
        btnEl.textContent = btnMatch[2];
        elementRegistry.set(btnEl.id, btnEl);
      }
    },
    querySelectorAll(selector: string) {
      if (selector === '.spellcasting-class.collapsed') {
        return this.children.filter(c => c.classList.contains('spellcasting-class') && c.classList.contains('collapsed'));
      }
      return [];
    }
  };
  return el;
}

const mockContainer = createMockElement();
mockContainer.id = 'generalActionsContainer';

(global as any).window = {
  addEventListener: () => { },
  document: {
    addEventListener: () => { },
    getElementById: (id: string) => {
      if (id === 'generalActionsContainer') return mockContainer;
      return elementRegistry.get(id) || null;
    },
    createElement: () => createMockElement()
  }
};
(global as any).document = (global as any).window.document;

import '../../server/character/character';
import { ActionsData } from '../../server/character/actions/actions_effects';
import { GetCharacterRepByDocId } from '../../server/character/character_manipulation';
import { CharacterError } from '../../server/character/character';
import { setCharacterRep } from '../../client/ts/state';
import { renderGeneralActionsUI } from '../../client/ts/spells_script';
import { toggleCollapse } from '../../client/ts/character_script';

describe('Action Categories & Separated UI Sections', () => {
  const SHEETS_DIR = path.join(__dirname, 'test_character_sheets');
  const TEMP_DIR = path.join(SHEETS_DIR, 'temp');
  const TEMP_SF_PATH = path.join(TEMP_DIR, 'temp_sf_class_action.txt');

  beforeEach(() => {
    mockContainer.innerHTML = '';
    mockContainer.children = [];
    mockContainer.style = {};
    elementRegistry.clear();
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    if (fs.existsSync(TEMP_SF_PATH)) {
      fs.unlinkSync(TEMP_SF_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_SF_PATH)) {
      fs.unlinkSync(TEMP_SF_PATH);
    }
  });

  it('assigns every action in ActionsData to its expected category', () => {
    expect(ActionsData['Move'].category).toBe('general');

    // Class actions
    expect(ActionsData['Turn Undead'].category).toBe('class');
    expect(ActionsData['Feat of Strength'].category).toBe('class');
    expect(ActionsData['Protective Ward'].category).toBe('class');
    expect(ActionsData['Furious Counterstrike'].category).toBe('class');
    expect(ActionsData['Smite'].category).toBe('class');
    expect(ActionsData['Sacred Flames'].category).toBe('class');
    expect(ActionsData['Defensive Stance'].category).toBe('class');

    // Feat actions
    expect(ActionsData['Combat Expertise'].category).toBe('feat');
    expect(ActionsData['Stunning Fist'].category).toBe('feat');
    expect(ActionsData['Devoted Bulwark'].category).toBe('feat');

    // Stance actions
    expect(ActionsData['Absolute Steel Stance'].category).toBe('stance');
    expect(ActionsData['Iron Guard\'s Glare Stance'].category).toBe('stance');
    expect(ActionsData['Roots of the Mountain Stance'].category).toBe('stance');
    expect(ActionsData['Bolstering Voice Stance'].category).toBe('stance');

    // Item actions
    expect(ActionsData['Cast Expeditious Retreat'].category).toBe('item');
    expect(ActionsData['Use Thror\'s Holy Symbol'].category).toBe('item');
    expect(ActionsData['Greater Invisibility (Whisperleaf Striders)'].category).toBe('item');
    expect(ActionsData['Chameleon Power (Hide +10)'].category).toBe('item');
    expect(ActionsData['Chameleon Power (Disguise Self)'].category).toBe('item');
    expect(ActionsData['Cure Critical Wounds (Helm of Glorious Recovery)'].category).toBe('item');
    expect(ActionsData['Cure Serious Wounds (Hair Shirt of Suffering)'].category).toBe('item');
  });

  it('populates categorizedActions and actionsMetadata.category for Naethan across all 5 categories', () => {
    const naethanPath = path.join(SHEETS_DIR, 'naethan_test.txt');
    const rep = GetCharacterRepByDocId(naethanPath);
    expect(rep instanceof CharacterError).toBe(false);
    if (rep instanceof CharacterError) return;

    expect(rep.categorizedActions).toBeDefined();
    expect(rep.categorizedActions!.general).toEqual(['Move']);
    expect(rep.categorizedActions!.class).toEqual(expect.arrayContaining(['Furious Counterstrike', 'Smite']));
    expect(rep.categorizedActions!.feat).toEqual(expect.arrayContaining(['Combat Expertise', 'Devoted Bulwark']));
    expect(rep.categorizedActions!.stance).toEqual(expect.arrayContaining([
      'Iron Guard\'s Glare Stance',
      'Roots of the Mountain Stance',
      'Bolstering Voice Stance'
    ]));
    expect(rep.categorizedActions!.item).toEqual(['Cure Critical Wounds (Helm of Glorious Recovery)']);

    expect(rep.actionsMetadata!['Move'].category).toBe('general');
    expect(rep.actionsMetadata!['Furious Counterstrike'].category).toBe('class');
    expect(rep.actionsMetadata!['Combat Expertise'].category).toBe('feat');
    expect(rep.actionsMetadata!['Iron Guard\'s Glare Stance'].category).toBe('stance');
    expect(rep.actionsMetadata!['Cure Critical Wounds (Helm of Glorious Recovery)'].category).toBe('item');
  });

  it('auto-grants Sacred Flames as a Class Action at Sacred Fist level >= 4', () => {
    const sheet = [
      'Sacred Fist Level 4 Test',
      'Human Cleric 3/Sacred Fist 4',
      'Hp 45 Speed 30',
      'Abilities', 'Str 10 (+0)', 'Dex 10 (+0)', 'Con 10 (+0)', 'Int 10 (+0)', 'Wis 18 (+4)', 'Cha 10 (+0)',
      'Attack: Unarmed +5 (1d8)',
      'Prepared Spells:',
      'Cleric',
      'Statuses:',
      'Feats:',
      'Combat Casting',
      'Special Abilities:',
      'Domains (Protection, Strength),',
      'Racial Traits:',
      'Bonus Abilities:',
      'Skills:',
      'Personal Information:'
    ].join('\n');

    fs.writeFileSync(TEMP_SF_PATH, sheet, 'utf8');
    const rep = GetCharacterRepByDocId(TEMP_SF_PATH);
    expect(rep instanceof CharacterError).toBe(false);
    if (rep instanceof CharacterError) return;

    expect(rep.actions).toContain('Sacred Flames');
    expect(rep.categorizedActions?.class).toContain('Sacred Flames');
    expect(rep.actionsMetadata?.['Sacred Flames']?.category).toBe('class');
  });

  it('renders separate stackable, collapsible UI sections in renderGeneralActionsUI and omits empty categories', () => {
    // 1. Test with Thror (has general, class, feat, item; no stances)
    const throrPath = path.join(SHEETS_DIR, 'thror_test.txt');
    const throrRep = GetCharacterRepByDocId(throrPath);
    expect(throrRep instanceof CharacterError).toBe(false);
    if (throrRep instanceof CharacterError) return;

    setCharacterRep(throrRep);
    renderGeneralActionsUI();

    expect(mockContainer.style.display).toBe('flex');
    expect(mockContainer.children.map(c => c.getAttribute('data-action-category'))).toEqual([
      'general',
      'class',
      'feat',
      'item'
    ]);
    mockContainer.children.forEach(c => {
      expect(c.classList.contains('action-category-section')).toBe(true);
      expect(c.innerHTML).toContain('collapse-button');
    });

    const classSection = mockContainer.children.find(c => c.getAttribute('data-action-category') === 'class')!;
    expect(classSection.innerHTML).toContain('Class Actions');
    expect(classSection.innerHTML).toContain('Turn Undead');
    expect(classSection.innerHTML).toContain('Feat of Strength');
    expect(classSection.innerHTML).toContain('Protective Ward');

    // Verify collapsibility and state preservation across re-renders
    expect(classSection.classList.contains('collapsed')).toBe(false);
    toggleCollapse('actionCategory_class');
    expect(classSection.classList.contains('collapsed')).toBe(true);
    expect(elementRegistry.get('actionCategory_classCollapseBtn')?.textContent).toBe('▼');

    // Re-render and verify collapsed state is preserved
    renderGeneralActionsUI();
    const reRenderedClassSection = mockContainer.children.find(c => c.getAttribute('data-action-category') === 'class')!;
    expect(reRenderedClassSection.classList.contains('collapsed')).toBe(true);
    expect(reRenderedClassSection.innerHTML).toContain('>▼</button>');

    // 2. Test with Naethan (has all 5 categories including Stances)
    mockContainer.children = [];
    elementRegistry.clear();
    const naethanPath = path.join(SHEETS_DIR, 'naethan_test.txt');
    const naethanRep = GetCharacterRepByDocId(naethanPath);
    expect(naethanRep instanceof CharacterError).toBe(false);
    if (naethanRep instanceof CharacterError) return;

    setCharacterRep(naethanRep);
    renderGeneralActionsUI();

    expect(mockContainer.children.map(c => c.getAttribute('data-action-category'))).toEqual([
      'general',
      'class',
      'feat',
      'stance',
      'item'
    ]);
    const stanceSectionHtml = mockContainer.children.find(c => c.getAttribute('data-action-category') === 'stance')!.innerHTML;
    expect(stanceSectionHtml).toContain('Stances');
    expect(stanceSectionHtml).toContain('Iron Guard\'s Glare Stance');
    expect(stanceSectionHtml).toContain('Roots of the Mountain Stance');
    expect(stanceSectionHtml).toContain('Bolstering Voice Stance');
  });
});
