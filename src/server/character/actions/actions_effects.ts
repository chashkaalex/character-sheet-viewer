import { ICharacter } from '../icharacter';
import { EffectData, StaticPropertyEffect } from '../state/effects';
import { registerStatusEffects } from '../_general_effects';

export type CoreActionCategory = 'general' | 'class' | 'feat' | 'stance' | 'item';
export type ActionCategory = CoreActionCategory | (string & {});

export interface ActionCategoryDefinition {
  category: ActionCategory;
  title: string;
}

const ActionCategoriesRegistry: ActionCategoryDefinition[] = [
  { category: 'general', title: 'General Actions' },
  { category: 'class', title: 'Class Actions' },
  { category: 'feat', title: 'Feat Actions' },
  { category: 'stance', title: 'Stances' },
  { category: 'item', title: 'Item Actions' }
];

export function registerActionCategory(category: ActionCategory, title: string): void {
  if (!ActionCategoriesRegistry.some(entry => entry.category === category)) {
    ActionCategoriesRegistry.push({ category, title });
  }
}

export function getRegisteredActionCategories(): ActionCategoryDefinition[] {
  return ActionCategoriesRegistry.map(entry => ({ ...entry }));
}

export interface ActionUseHelpers {
  adapter: any;
  removeStatus: (statusName: string) => void;
}

export interface ActionUseResult {
  error?: string;
  statusName?: string;
  skipDefaultStatus?: boolean;
}

export type ActionOnUseHook = (
  character: ICharacter,
  docId: string,
  actionName: string,
  targets: string[] | undefined,
  helpers: ActionUseHelpers
) => ActionUseResult | void;

export type ActionCostType =
  | 'standard'
  | 'move'
  | 'full-round'
  | 'swift'
  | 'immediate'
  | '5-foot-step'
  | 'free'
  | 'none';

export interface ActionModifierInfo {
  value: number;
  string: string;
}

export interface ActionData {
  statusName: string;
  calculateDuration: (character: ICharacter) => number;
  category: ActionCategory;
  actionType?: ActionCostType;
  effects?: EffectData[];
  healFormula?: string;
  target?: string;
  onUse?: ActionOnUseHook;
  getModifier?: (character: ICharacter) => ActionModifierInfo | null;
}

export class NumberAction implements ActionData {
  public acceptsNumber = true;
  constructor(
    public statusName: string,
    public calculateDuration: (character: ICharacter) => number,
    public maxNumberResolver: (character: ICharacter) => number,
    public minNumber: number = 1,
    public label: string = 'Value:',
    public category: ActionCategory = 'general',
    public effects?: EffectData[],
    public actionType: ActionCostType = 'free'
  ) { }
}

export const STANDARD_COMBAT_ACTIONS: readonly string[] = [
  'Move',
  '5-Foot Step',
  'Fighting Defensively',
  'Total Defense',
  'Charge',
  'Run',
  'Withdraw',
  'Casting Defensively',
  'Aid Another',
  'Ready Action',
  'Delay'
];

export const ActionsData: Record<string, ActionData> = {
  'Cast Expeditious Retreat': {
    statusName: 'Expeditious Retreat',
    category: 'item',
    actionType: 'standard',
    calculateDuration: (_character) => 10
  },
  'Absolute Steel Stance': {
    statusName: 'Absolute Steel Stance',
    category: 'stance',
    actionType: 'swift',
    calculateDuration: (_character) => 10,
    effects: [
      { status: 'Absolute Steel Stance', property: 'speed', modifierType: 'Competence', value: 10 },
      {
        status: 'Absolute Steel Stance',
        property: 'ac',
        modifierType: 'Dodge',
        valueResolver: (character: Readonly<ICharacter>) => {
          const hasMovedEnough = character.statuses.some(s => {
            if (s.name.startsWith('Moved ')) {
              const match = s.name.match(/Moved (\d+) feet/);
              if (match) {
                const feet = parseInt(match[1], 10);
                return feet >= 10;
              }
            }
            return false;
          });
          return hasMovedEnough ? 2 : 0;
        }
      }
    ]
  },
  'Move': new NumberAction(
    'Moved',
    (_character) => 1,
    (character) => character.speed.currentScore,
    1,
    'Distance (feet):',
    'general',
    undefined,
    'move'
  ),
  'Combat Expertise': new NumberAction(
    'Combat Expertise',
    (_character) => 1,
    (character) => Math.min(5, character.bab.currentScore),
    1,
    'Penalty value:',
    'feat'
  ),
  'Stunning Fist': {
    statusName: 'Stunning Fist',
    category: 'feat',
    actionType: 'free',
    calculateDuration: (_character) => 1
  },
  'Defensive Stance': {
    statusName: 'Defensive Stance',
    category: 'class',
    actionType: 'free',
    calculateDuration: (character) => {
      const conAbility = character.abilities.Con;
      return conAbility ? (3 + conAbility.modifier) : 10;
    },
    effects: [
      { status: 'Defensive Stance', property: 'ac', modifierType: 'Dodge', value: 2 },
      { status: 'Defensive Stance', property: 'Str', modifierType: 'Morale', value: 4 },
      { status: 'Defensive Stance', property: 'Con', modifierType: 'Morale', value: 4 },
      { status: 'Defensive Stance', property: 'Fort', modifierType: 'Resistance', value: 2 },
      { status: 'Defensive Stance', property: 'Ref', modifierType: 'Resistance', value: 2 },
      { status: 'Defensive Stance', property: 'Will', modifierType: 'Resistance', value: 2 }
    ]
  },
  'Turn Undead': {
    statusName: 'Turn Undead',
    category: 'class',
    actionType: 'standard',
    calculateDuration: (_character) => 1
  },
  'Feat of Strength': {
    statusName: 'Feat of Strength',
    category: 'class',
    actionType: 'free',
    calculateDuration: (_character) => 1,
    effects: [
      {
        status: 'Feat of Strength',
        property: 'Str',
        modifierType: 'Enhancement',
        valueResolver: (character: ICharacter) => {
          const clericLevel = character.GetClassLevel('Cleric');
          const sfLevel = character.GetClassLevel('Sacred Fist');
          return clericLevel + Math.floor(sfLevel / 2);
        }
      }
    ]
  },
  'Protective Ward': {
    statusName: 'Protective Ward',
    category: 'class',
    actionType: 'standard',
    calculateDuration: (_character) => 600,
    effects: [
      {
        status: 'Protective Ward',
        property: 'Fort',
        modifierType: 'Resistance',
        valueResolver: (character: ICharacter) => {
          const clericLevel = character.GetClassLevel('Cleric');
          const sfLevel = character.GetClassLevel('Sacred Fist');
          return clericLevel + Math.floor(sfLevel / 2);
        }
      },
      {
        status: 'Protective Ward',
        property: 'Ref',
        modifierType: 'Resistance',
        valueResolver: (character: ICharacter) => {
          const clericLevel = character.GetClassLevel('Cleric');
          const sfLevel = character.GetClassLevel('Sacred Fist');
          return clericLevel + Math.floor(sfLevel / 2);
        }
      },
      {
        status: 'Protective Ward',
        property: 'Will',
        modifierType: 'Resistance',
        valueResolver: (character: ICharacter) => {
          const clericLevel = character.GetClassLevel('Cleric');
          const sfLevel = character.GetClassLevel('Sacred Fist');
          return clericLevel + Math.floor(sfLevel / 2);
        }
      }
    ]
  },
  'Use Thror\'s Holy Symbol': {
    statusName: 'Use Thror\'s Holy Symbol',
    category: 'item',
    actionType: 'standard',
    calculateDuration: (_character) => 10,
    effects: [
      {
        status: 'Use Thror\'s Holy Symbol',
        property: 'Weapons',
        callback: (character: ICharacter, _args: Record<string, unknown>) => {
          const unarmed = character.weapons.find(w => w.name === 'Unarmed');
          if (unarmed) {
            unarmed.enhancement = 2;
            unarmed.critical = '19-20/x2';
          }
        }
      }
    ]
  },
  'Sacred Flames': {
    statusName: 'Sacred Flames',
    category: 'class',
    actionType: 'swift',
    calculateDuration: (_character) => 10,
    effects: [
      {
        status: 'Sacred Flames',
        property: 'Weapons',
        callback: (character: ICharacter, _args: Record<string, unknown>) => {
          const unarmed = character.weapons.find(w => w.name === 'Unarmed');
          if (unarmed) {
            const sfLevel = character.GetClassLevel('Sacred Fist');
            const wisMod = character.abilities.Wis?.modifier || 0;
            const extraDamage = sfLevel + Math.max(0, wisMod);
            unarmed.featDamageBonus.applyEffect(new StaticPropertyEffect({
              status: 'Sacred Flames',
              property: 'featDamageBonus',
              modifierType: 'Generic',
              value: extraDamage
            }));
          }
        }
      }
    ]
  },
  'Greater Invisibility (Whisperleaf Striders)': {
    statusName: 'Invisible',
    category: 'item',
    actionType: 'standard',
    calculateDuration: (_character) => 7
  },
  'Chameleon Power (Hide +10)': {
    statusName: 'Chameleon Power',
    category: 'item',
    actionType: 'standard',
    calculateDuration: (_character) => -1,
    effects: [
      { status: 'Chameleon Power', property: 'Hide', modifierType: 'Competence', value: 10 }
    ]
  },
  'Cure Critical Wounds (Helm of Glorious Recovery)': {
    statusName: 'Helm of Glorious Recovery (Used)',
    category: 'item',
    actionType: 'swift',
    calculateDuration: (_character) => -1,
    healFormula: '4d8+7'
  },
  'Cure Serious Wounds (Hair Shirt of Suffering)': {
    statusName: 'Hair Shirt of Suffering (Used)',
    category: 'item',
    actionType: 'standard',
    calculateDuration: (_character) => -1,
    healFormula: '3d8+9'
  },
  'Furious Counterstrike': new NumberAction(
    'Furious Counterstrike',
    (_character) => 1,
    (character) => {
      const level = character.GetClassLevel('Crusader');
      return level > 0 ? (Math.floor(level / 4) + 1) * 5 : 5;
    },
    1,
    'Delayed damage pool:',
    'class'
  ),
  'Smite': {
    statusName: 'Smite',
    category: 'class',
    actionType: 'free',
    calculateDuration: (_character) => 1,
    effects: [
      {
        status: 'Smite',
        property: 'bab',
        modifierType: 'Generic',
        valueResolver: (character: ICharacter) => Math.max(0, character.abilities.Cha?.modifier || 0)
      },
      {
        status: 'Smite',
        property: 'damageBonus',
        modifierType: 'Generic',
        valueResolver: (character: ICharacter) => character.GetClassLevel('Crusader')
      }
    ]
  },
  'Devoted Bulwark': {
    statusName: 'Devoted Bulwark',
    category: 'feat',
    actionType: 'free',
    calculateDuration: (_character) => 1,
    effects: [
      { status: 'Devoted Bulwark', property: 'ac', modifierType: 'Morale', value: 1 }
    ]
  },
  'Iron Guard\'s Glare Stance': {
    statusName: 'Iron Guard\'s Glare Stance',
    category: 'stance',
    actionType: 'swift',
    calculateDuration: (_character) => -1,
    effects: [
      {
        status: 'Iron Guard\'s Glare Stance',
        description: 'Any opponent that you threaten takes a -4 penalty on attack rolls against your allies.'
      }
    ]
  },
  'Roots of the Mountain Stance': {
    statusName: 'Roots of the Mountain Stance',
    category: 'stance',
    actionType: 'swift',
    calculateDuration: (_character) => -1,
    effects: [
      { status: 'Roots of the Mountain Stance', property: 'Bull rush', modifierType: 'Generic', value: 10 },
      { status: 'Roots of the Mountain Stance', property: 'Overrun', modifierType: 'Generic', value: 10 },
      { status: 'Roots of the Mountain Stance', property: 'Trip', modifierType: 'Generic', value: 10 },
      { status: 'Roots of the Mountain Stance', property: 'Tumble', modifierType: 'Generic', value: 10 },
      {
        status: 'Roots of the Mountain Stance',
        description: 'Gain DR 2/- and +10 bonus on checks against bull rush, overrun, trip, and tumble. Ends immediately if you move more than 5 feet.'
      }
    ]
  },
  'Bolstering Voice Stance': {
    statusName: 'Bolstering Voice Stance',
    category: 'stance',
    actionType: 'swift',
    calculateDuration: (_character) => -1,
    effects: [
      { status: 'Bolstering Voice Stance', property: 'Will', modifierType: 'Morale', value: 2 },
      {
        status: 'Bolstering Voice Stance',
        description: 'You and allies within 60 ft. gain a +2 morale bonus on Will saves (+4 morale bonus on saves against fear effects).'
      }
    ]
  },
  '5-Foot Step': {
    statusName: 'Moved 5 feet',
    category: 'general',
    actionType: '5-foot-step',
    calculateDuration: (_character) => 1,
    effects: [
      {
        status: 'Moved 5 feet',
        description: 'Moved 5 feet without provoking attacks of opportunity (only if no other movement is taken this round).'
      }
    ]
  },
  'Fighting Defensively': {
    statusName: 'Fighting Defensively',
    category: 'general',
    actionType: 'free',
    calculateDuration: (_character) => 1,
    effects: [
      { status: 'Fighting Defensively', property: 'bab', modifierType: 'Generic', value: -4 },
      {
        status: 'Fighting Defensively',
        property: 'ac',
        modifierType: 'Dodge',
        valueResolver: (character: Readonly<ICharacter>) =>
          (character.skills.find(s => s.name === 'Tumble')?.score ?? 0) >= 5 ? 3 : 2
      }
    ]
  },
  'Total Defense': {
    statusName: 'Total Defense',
    category: 'general',
    actionType: 'standard',
    calculateDuration: (_character) => 1,
    effects: [
      {
        status: 'Total Defense',
        property: 'ac',
        modifierType: 'Dodge',
        valueResolver: (character: Readonly<ICharacter>) =>
          (character.skills.find(s => s.name === 'Tumble')?.score ?? 0) >= 5 ? 6 : 4
      },
      {
        status: 'Total Defense',
        description: 'Cannot attack or make attacks of opportunity until your next turn.'
      }
    ]
  },
  'Charge': {
    statusName: 'Charge',
    category: 'general',
    actionType: 'full-round',
    calculateDuration: (_character) => 1,
    effects: [
      { status: 'Charge', property: 'bab', modifierType: 'Generic', value: 2 },
      { status: 'Charge', property: 'ac', modifierType: 'Generic', value: -2 },
      {
        status: 'Charge',
        property: 'speed',
        modifierType: 'Generic',
        valueResolver: (character: Readonly<ICharacter>) => character.speed.currentScore
      }
    ]
  },
  'Run': {
    statusName: 'Run',
    category: 'general',
    actionType: 'full-round',
    calculateDuration: (_character) => 1,
    effects: [
      {
        status: 'Run',
        property: 'speed',
        modifierType: 'Generic',
        valueResolver: (character: Readonly<ICharacter>) => {
          const isHeavyArmor = character.battleGear.some((item: any) => item?.armorType === 'Heavy');
          const multiplier = isHeavyArmor ? 3 : 4;
          return character.speed.currentScore * (multiplier - 1);
        }
      },
      {
        status: 'Run',
        description: 'Move up to 4x speed in a straight line (3x in heavy armor; +1x with Run feat). Lose Dexterity bonus to AC unless you have the Run feat.'
      }
    ]
  },
  'Withdraw': {
    statusName: 'Withdraw',
    category: 'general',
    actionType: 'full-round',
    calculateDuration: (_character) => 1,
    effects: [
      {
        status: 'Withdraw',
        property: 'speed',
        modifierType: 'Generic',
        valueResolver: (character: Readonly<ICharacter>) => character.speed.currentScore
      },
      {
        status: 'Withdraw',
        description: 'Move up to 2x speed; the square you start in is not considered threatened by any opponent you can see.'
      }
    ]
  },
  'Casting Defensively': {
    statusName: 'Casting Defensively',
    category: 'general',
    actionType: 'free',
    calculateDuration: (_character) => 1,
    effects: [
      {
        status: 'Casting Defensively',
        description: 'Cast a spell without provoking attacks of opportunity (Concentration check DC 15 + spell level). Grants +4 Concentration with Combat Casting feat.'
      }
    ]
  },
  'Aid Another': {
    statusName: 'Aid Another',
    category: 'general',
    actionType: 'standard',
    calculateDuration: (_character) => 1,
    effects: [
      {
        status: 'Aid Another',
        description: 'Make a melee attack roll against AC 10 to grant an adjacent ally a +2 bonus on their next attack roll or +2 bonus to AC against the opponent.'
      }
    ]
  },
  'Ready Action': {
    statusName: 'Ready Action',
    category: 'general',
    actionType: 'standard',
    calculateDuration: (_character) => 1,
    effects: [
      {
        status: 'Ready Action',
        description: 'Prepare a standard, move, or free action to trigger on a specified condition. Your initiative shifts to just before the triggering action.'
      }
    ]
  },
  'Delay': {
    statusName: 'Delay',
    category: 'general',
    actionType: 'none',
    calculateDuration: (_character) => 1,
    effects: [
      {
        status: 'Delay',
        description: 'Voluntarily take no action and act later in the initiative order. Your initiative shifts to the point when you choose to act.'
      }
    ]
  },
  'Chameleon Power (Disguise Self)': {
    statusName: 'Disguise Self',
    category: 'item',
    actionType: 'standard',
    calculateDuration: (_character) => 600
  }
};

// Register effects
const actionsEffectsForRegistration: Record<string, EffectData[]> = {};
Object.keys(ActionsData).forEach(actionName => {
  if (ActionsData[actionName].effects) {
    actionsEffectsForRegistration[ActionsData[actionName].statusName] = ActionsData[actionName].effects!;
  }
});
registerStatusEffects(actionsEffectsForRegistration);

/**
 * Dynamically registers class- or feature-specific actions into ActionsData and StatusesEffects.
 */
export function registerActions(actions: Record<string, ActionData>): void {
  const newEffects: Record<string, EffectData[]> = {};
  Object.entries(actions).forEach(([actionName, actionData]) => {
    ActionsData[actionName] = actionData;
    if (actionData.effects) {
      newEffects[actionData.statusName] = actionData.effects;
    }
  });
  if (Object.keys(newEffects).length > 0) {
    registerStatusEffects(newEffects);
  }
}
