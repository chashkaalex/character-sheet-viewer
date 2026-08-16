import { ICharacter } from '../icharacter';
import { EffectData, StaticPropertyEffect } from '../state/effects';
import { registerStatusEffects } from '../_general_effects';

export interface ActionData {
  statusName: string;
  calculateDuration: (character: ICharacter) => number;
  effects?: EffectData[];
}

export class NumberAction implements ActionData {
  public acceptsNumber = true;
  constructor(
    public statusName: string,
    public calculateDuration: (character: ICharacter) => number,
    public maxNumberResolver: (character: ICharacter) => number,
    public minNumber: number = 1,
    public label: string = 'Value:',
    public effects?: EffectData[]
  ) {}
}

export const ActionsData: Record<string, ActionData> = {
  'Absolute Steel Stance': {
    statusName: 'Absolute Steel Stance',
    calculateDuration: (_character) => 10,
    effects: [
      { status: 'Absolute Steel Stance', property: 'speed', modifierType: 'Enhancement', value: 10 },
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
    'Distance (feet):'
  ),
  'Combat Expertise': new NumberAction(
    'Combat Expertise',
    (_character) => 1,
    (character) => Math.min(5, character.bab.currentScore),
    1,
    'Penalty value:'
  ),
  'Stunning Fist': {
    statusName: 'Stunning Fist',
    calculateDuration: (_character) => 1
  },
  'Defensive Stance': {
    statusName: 'Defensive Stance',
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
    calculateDuration: (_character) => 1
  },
  'Feat of Strength': {
    statusName: 'Feat of Strength',
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
