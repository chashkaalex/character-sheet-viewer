import { EffectData } from '../../state/effects';
import { ICharacter } from '@server/character/icharacter';
import { Monk } from '../../../classes_data/monk';

/**
 * Campaign-specific and unique named magic items.
 */
export const UniqueItemEffects: Record<string, EffectData[]> = {
  'Thror\'s Holy Symbol of Moradin': [
    {
      status: 'Thror\'s Holy Symbol of Moradin',
      callback: (character: ICharacter, _args: Record<string, unknown>) => {
        if (!character.actions.includes('Use Thror\'s Holy Symbol')) {
          character.actions.push('Use Thror\'s Holy Symbol');
        }
      }
    }
  ],

  'Amulet of Pelor/Set': [
    { status: 'Amulet of Pelor/Set', property: 'Fort', modifierType: 'Generic', value: 1 },
    { status: 'Amulet of Pelor/Set', property: 'Ref', modifierType: 'Generic', value: 1 },
    { status: 'Amulet of Pelor/Set', property: 'Will', modifierType: 'Generic', value: 1 }
  ],

  'Amulet of Pelor with Maple Leaf': [
    { status: 'Amulet of Pelor with Maple Leaf', property: 'Fort', modifierType: 'Generic', value: 2 },
    { status: 'Amulet of Pelor with Maple Leaf', property: 'Ref', modifierType: 'Generic', value: 2 },
    { status: 'Amulet of Pelor with Maple Leaf', property: 'Will', modifierType: 'Generic', value: 2 }
  ],

  'Kusarigama': [
    { status: 'Kusarigama', property: 'Trip', modifierType: 'Generic', value: 2 },
    { status: 'Kusarigama', property: 'Disarm', modifierType: 'Generic', value: 2 }
  ],

  'Goggles of the Golden Sun': [
    {
      status: 'Goggles of the Golden Sun',
      property: 'Special',
      description: 'While wearing "goggles of the golden sun", you are immune to blindness and dazzling effects. This is a continuous effect and requires no activation.In addition, three times per day you can activate these goggles and sacrifice a prepared spell or spell slot of 3rd level or higher to use fireball (as the spell; Reflex DC 14 half), using your own caster level or that of the goggles, whichever is higher. The fireball created by the goggles resembles a hurtling, exploding comet.'
    },
    {
      status: 'Goggles of the Golden Sun',
      callback: (character: ICharacter) => {
        if (!character.actions.includes('Fireball (Goggles of the Golden Sun)')) {
          character.actions.push('Fireball (Goggles of the Golden Sun)');
        }
      }
    }
  ],

  'Monks Chain Belt': [
    {
      status: 'Monks Chain Belt',
      property: 'ac',
      modifierType: 'Natural Armor',
      valueResolver: (character: ICharacter) => {
        const currentMonkLevel = character.GetClassLevel('Monk');
        const monkLevel = Math.min(20, 5 + currentMonkLevel);
        const currentMonkAcBonus = currentMonkLevel > 0 ? (Monk.levelTable[currentMonkLevel].ac as number) : 0;
        return (Monk.levelTable[monkLevel].ac as number) - currentMonkAcBonus;
      }
    },
    {
      status: 'Monks Chain Belt',
      property: 'Special',
      description: 'Grants +1 additional Stunning Fist attack per day (if wearer has the Stunning Fist feat).'
    },
    {
      status: 'Monks Chain Belt',
      callback: (character: ICharacter) => {
        character.addGearEffect('Monks Chain Belt', 'Unarmed', {
          status: 'Monks Chain Belt',
          callback: (_char: ICharacter, args: Record<string, unknown>) => {
            const unarmed = args['item'] as any;
            if (unarmed && 'bonusMonkLevels' in unarmed) {
              unarmed.bonusMonkLevels += 5;
              if (typeof unarmed.calculateWeaponStats === 'function') {
                unarmed.calculateWeaponStats(_char);
              }
            }
          }
        });
      }
    }
  ],

  'Hand Wraps with Adamantine Plates': [
    { status: 'Hand Wraps with Adamantine Plates', property: 'Str', modifierType: 'Enhancement', value: 2 },
    { status: 'Hand Wraps with Adamantine Plates', property: 'Dex', modifierType: 'Enhancement', value: 2 },
    { status: 'Hand Wraps with Adamantine Plates', property: 'Stunning Fist', modifierType: 'Generic', value: 2 }
  ],

  'Silver Signet Ring': [
    { status: 'Silver Signet Ring', property: 'Special', description: 'Abyssal, Infernal and Dark Speech' }
  ],

  'Signet Ring': [
    { status: 'Signet Ring', property: 'Special', description: 'Abyssal, Infernal and Dark Speech' }
  ],

  'Whisperleaf Striders': [
    { status: 'Whisperleaf Striders', property: 'Special', description: 'Pass without trace' },
    { status: 'Whisperleaf Striders', property: 'Move Silently', modifierType: 'Generic', value: 5 },
    { status: 'Whisperleaf Striders', property: 'Special', description: 'Once per Day: Greater Invisibility for 7 rounds' },
    {
      status: 'Whisperleaf Striders',
      callback: (character: ICharacter) => {
        if (!character.actions.includes('Greater Invisibility (Whisperleaf Striders)')) {
          character.actions.push('Greater Invisibility (Whisperleaf Striders)');
        }
      }
    }
  ],

  'Black Dragoncraft Full Plate +2': [
    { status: 'Black Dragoncraft Full Plate +2', property: 'ac', modifierType: 'Armor', value: 8 + 2 }
  ],

  'Tower Shield made from Blue Dragon Hide +2': [
    { status: 'Tower Shield made from Blue Dragon Hide +2', property: 'ac', modifierType: 'Shield', value: 4 + 2 }
  ],

  'Restful Full Plate +1': [
    { status: 'Restful Full Plate +1', property: 'ac', modifierType: 'Armor', value: 8 + 1 },
    { status: 'Restful Full Plate +1', property: 'Special', description: 'Restful Crystal: Sleeping in this armor does not cause fatigue.' }
  ],

  'Helm of Glorious Recovery': [
    { status: 'Helm of Glorious Recovery', property: 'Special', description: '1/day Cure Critical Wounds (4d8+7) on self as a swift action (+2 Cha in Cormyr).' },
    {
      status: 'Helm of Glorious Recovery',
      callback: (character: ICharacter) => {
        if (!character.actions.includes('Cure Critical Wounds (Helm of Glorious Recovery)')) {
          character.actions.push('Cure Critical Wounds (Helm of Glorious Recovery)');
        }
      }
    }
  ],

  'Hair Shirt of Suffering': [
    { status: 'Hair Shirt of Suffering', property: 'ac', modifierType: 'Natural Armor', value: 1 },
    { status: 'Hair Shirt of Suffering', property: 'Special', description: 'Once per day: Activate to use cure serious wounds on any creature other than yourself (healing 3d8+9 points of damage).' },
    {
      status: 'Hair Shirt of Suffering',
      callback: (character: ICharacter) => {
        character.hp.max -= 2;
        if (!character.actions.includes('Cure Serious Wounds (Hair Shirt of Suffering)')) {
          character.actions.push('Cure Serious Wounds (Hair Shirt of Suffering)');
        }
        if (character.hp.current > character.hp.max) {
          character.hp.current = character.hp.max;
        }
      }
    }
  ]
};
