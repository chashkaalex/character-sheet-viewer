import * as fs from 'fs';
import * as path from 'path';
import { Character } from '../../server/character/character';
import { GetCharacterByDocId, GetCharacterRepByDocId, OnUseAction } from '../../server/character/character_manipulation';
import { UnarmedWeapon } from '../../server/character/gear/weapons/weapons';
import { GetSpellData } from '../../server/character/spells';
import { setCharacterRep } from '../../client/ts/state';
import { renderGeneralActionsUI } from '../../client/ts/spells/general_actions';
import { createCastMenu } from '../../client/ts/spells/spell_popup';

const THROR_ORIG_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');
const THROR_TEMP_FILE = path.join(__dirname, 'test_character_sheets', 'thror_unique_items_temp.txt');

describe('Unique Items Mechanics: Monks Chain Belt, Stunning Fist DC & Goggles of the Golden Sun', () => {
  beforeEach(() => {
    fs.copyFileSync(THROR_ORIG_FILE, THROR_TEMP_FILE);
  });

  afterEach(() => {
    if (fs.existsSync(THROR_TEMP_FILE)) {
      fs.unlinkSync(THROR_TEMP_FILE);
    }
  });

  test('1. Monks Chain Belt uses a mutating effect on UnarmedWeapon, removes effectiveMonkLevel from Character, and documents +1 Stunning Fist/day', () => {
    const thror = GetCharacterByDocId(THROR_TEMP_FILE) as Character;
    expect(thror.parseSuccess).toBe(true);

    // effectiveMonkLevel should no longer exist on Character
    expect(thror.HasPropertyInitialized('effectiveMonkLevel')).toBe(false);
    expect(thror.GetModifiableProperty('effectiveMonkLevel').currentScore).toBe(0);

    // UnarmedWeapon receives +5 bonusMonkLevels from Monks Chain Belt:
    // 6 Monk + 3 Sacred Fist + 5 Belt + 4 Superior Unarmed Strike = 18 (2d8) + Improved Natural Attack (+1 step) = 2d10
    const unarmed = thror.weapons.find(w => w.baseName === 'Unarmed') as UnarmedWeapon;
    expect(unarmed).toBeDefined();
    expect(unarmed.bonusMonkLevels).toBe(5);
    expect(unarmed.baseDamage).toBe('2d10');

    // Special description acknowledges +1 Stunning Fist per day
    expect(
      thror.Special.list.some(
        s => s.status === 'Monks Chain Belt' && s.description.toLowerCase().includes('stunning fist')
      )
    ).toBe(true);
  });

  test('2. Stunning Fist calculates DC (10 + 1/2 HD + Wis mod + Hand Wraps +2), displays DC badge in Feat Actions, and updates dynamically with Wis', () => {
    const rep = GetCharacterRepByDocId(THROR_TEMP_FILE) as any;
    expect(rep.error).toBeFalsy();

    // Thror: HD 12 (1/2 level = 6), Wis 22 (+6 mod), Hand Wraps with Adamantine Plates (+2) => DC = 10 + 6 + 6 + 2 = 24
    const sfMeta = rep.actionsMetadata?.['Stunning Fist'];
    expect(sfMeta).toBeDefined();
    expect(sfMeta.modifier).toBeDefined();
    expect(sfMeta.modifier.value).toBe(24);
    expect(sfMeta.modifier.label).toBe('DC 24');
    expect(sfMeta.modifier.string).toContain('6 Wis modifier');
    expect(sfMeta.modifier.string).toContain('+2 (Hand Wraps with Adamantine Plates)');

    // Client UI renders "DC 24" badge on the Stunning Fist action slot
    let renderedContainerHtml = '';
    (global as any).document = {
      getElementById: (id: string) => {
        if (id === 'generalActionsContainer') {
          return {
            style: {},
            set innerHTML(val: string) {
              renderedContainerHtml = val;
            },
            get innerHTML() {
              return renderedContainerHtml;
            },
            appendChild: (child: any) => {
              renderedContainerHtml += child.innerHTML || '';
            },
            querySelectorAll: () => []
          };
        }
        return null;
      },
      createElement: () => ({
        id: '',
        className: '',
        innerHTML: '',
        querySelectorAll: () => []
      })
    };
    setCharacterRep(rep);
    renderGeneralActionsUI();

    expect(renderedContainerHtml).toContain('data-action-mod="Stunning Fist">DC 24</span>');
  });

  test('3. Goggles of the Golden Sun adds 3/day Fireball item action that sacrifices a 3rd+ level prepared spell or spontaneous slot', () => {
    expect(GetSpellData('Fireball')).toBeDefined();

    // Inject Goggles of the Golden Sun into Thror's Battle Gear
    const content = fs.readFileSync(THROR_TEMP_FILE, 'utf-8');
    const updatedContent = content.replace(
      'Battle Gear:',
      'Battle Gear:\nGoggles of the Golden Sun,'
    );
    fs.writeFileSync(THROR_TEMP_FILE, updatedContent, 'utf-8');

    const rep1 = GetCharacterRepByDocId(THROR_TEMP_FILE) as any;
    expect(rep1.actions).toContain('Fireball (Goggles of the Golden Sun)');

    const gogglesMeta = rep1.actionsMetadata?.['Fireball (Goggles of the Golden Sun)'];
    expect(gogglesMeta).toBeDefined();
    expect(gogglesMeta.category).toBe('item');
    expect(gogglesMeta.usesRemaining).toBe(3);
    expect(gogglesMeta.maxUses).toBe(3);
    expect(Array.isArray(gogglesMeta.eligibleSacrificeSlots)).toBe(true);
    // Thror has Cleric level 3 prepared spells (e.g. Prayer) and level 3 domain spell
    expect(gogglesMeta.eligibleSacrificeSlots.length).toBeGreaterThan(0);
    expect(gogglesMeta.eligibleSacrificeSlots.every((s: any) => parseInt(String(s.spellLevel), 10) >= 3)).toBe(true);

    // Popup menu renders the 3rd+ level sacrifice dropdown
    setCharacterRep(rep1);
    const popupHtml = createCastMenu({
      casterClass: 'Actions',
      casterClassName: 'Actions',
      spell: 'Fireball (Goggles of the Golden Sun)',
      isUsed: false,
      isValid: true
    });
    expect(popupHtml).toContain('sacrificeSlotSelect');
    expect(popupHtml).toContain('Prayer');

    // Sacrifice the first eligible 3rd-level slot (1st use of 3/day)
    const slotToSacrifice = gogglesMeta.eligibleSacrificeSlots[0];
    const afterUse1 = OnUseAction(
      THROR_TEMP_FILE,
      'Fireball (Goggles of the Golden Sun)',
      [slotToSacrifice.key]
    ) as any;
    expect(afterUse1.error).toBeFalsy();
    expect(afterUse1.statuses.some((s: any) => s.name === 'Goggles of the Golden Sun (Used 1/3)')).toBe(true);
    expect(afterUse1.actionsMetadata['Fireball (Goggles of the Golden Sun)'].usesRemaining).toBe(2);

    // Verify the sacrificed level 3 spell slot was marked used in Cleric preparedSpells
    const clericData1 = afterUse1.spellCasting.classSpellCastingData.find((c: any) => c.className === 'Cleric');
    const sacrificedSlotState = clericData1.preparedSpells[slotToSacrifice.spellLevel][slotToSacrifice.slotIndex];
    expect(sacrificedSlotState.used).toBe(true);
  });
});
