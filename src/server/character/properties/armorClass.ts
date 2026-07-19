import { ModifiableProperty, CreatureSize } from '../00_property';
import { CharacterClass } from './race_and_classes';
import { AbilitiesMap } from './abilities/ability_types';
import { Ability } from './abilities/ability';
import { ClassesData } from '../../classes_data/_classes_general_data';
import { ModifierTypes } from '../_constants';

export class ArmorClass extends ModifiableProperty {
  public abilities: Ability[];
  public size: CreatureSize;

  constructor(abilities: Ability[], size: CreatureSize) {
    super(10, 'ac');
    this.abilities = abilities;
    this.size = size;
  }

  public get currentArmorClass(): number {
    return this.currentScore +
      this.size.modifier +
      this.abilities.reduce((acc, ability) => acc + ability.modifier, 0);
  }

  public get touchArmorClass(): number {
    const activeTouchEffectsValue = this.activeEffects
      .filter(e => {
        const typeInfo = ModifierTypes[e.modifierType];
        return (typeInfo && typeInfo.againstTouch) || e.value < 0;
      })
      .reduce((acc, e) => acc + e.value, 0);

    return this.score +
      this.size.modifier +
      this.abilities.reduce((acc, ability) => acc + ability.modifier, 0) +
      activeTouchEffectsValue;
  }

  public get flatFootedArmorClass(): number {
    const activeFlatFootedEffectsValue = this.activeEffects
      .filter(e => e.modifierType !== 'Dodge')
      .reduce((acc, e) => acc + e.value, 0);

    const abilitiesValue = this.abilities.reduce((acc, ability) => {
      if (ability.name === 'Dex') {
        return acc + Math.min(0, ability.modifier);
      }
      return acc + ability.modifier;
    }, 0);

    return this.score +
      this.size.modifier +
      abilitiesValue +
      activeFlatFootedEffectsValue;
  }

  public get touchString(): string {
    const activeTouchEffects = this.activeEffects.filter(e => {
      const typeInfo = ModifierTypes[e.modifierType];
      return (typeInfo && typeInfo.againstTouch) || e.value < 0;
    });
    const effectsStr = activeTouchEffects.length > 0
      ? activeTouchEffects.map(e => `${e.value >= 0 ? '+' : ''}${e.value} (${e.status})`).join(', ')
      : '';
    const effectsPart = effectsStr ? `, ${effectsStr}` : '';
    return `${this.touchArmorClass} (base: ${this.score})${effectsPart} ${this.size.string} ${this.abilities.map(a => `+ ${a.ModifierString}`).join(', ')}`;
  }

  public get flatFootedString(): string {
    const activeFlatFootedEffects = this.activeEffects.filter(e => e.modifierType !== 'Dodge');
    const effectsStr = activeFlatFootedEffects.length > 0
      ? activeFlatFootedEffects.map(e => `${e.value >= 0 ? '+' : ''}${e.value} (${e.status})`).join(', ')
      : '';
    const effectsPart = effectsStr ? `, ${effectsStr}` : '';

    const abilitiesStr = this.abilities.map(a => {
      if (a.name === 'Dex') {
        const mod = Math.min(0, a.modifier);
        return `+ ${mod} Dex modifier (flat-footed)`;
      }
      return `+ ${a.ModifierString}`;
    }).join(', ');

    return `${this.flatFootedArmorClass} (base: ${this.score})${effectsPart} ${this.size.string} ${abilitiesStr}`;
  }

  public override get string(): string {
    const baseString = `${this.currentArmorClass} (base: ${this.score})  ${this.EffectsString}`;
    return `${baseString} ${this.size.string} ${this.abilities.map(a => `+ ${a.ModifierString}`).join(', ')}`;
  }

  public override get state(): any {
    return {
      ...super.state,
      bonus: this.currentArmorClass,
      touch: {
        bonus: this.touchArmorClass,
        string: this.touchString
      },
      flatFooted: {
        bonus: this.flatFootedArmorClass,
        string: this.flatFootedString
      }
    };
  }
}

/**
 * Creates an ArmorClass instance based on character classes and abilities.
 * @param classes The character's classes.
 * @param abilities The character's abilities.
 * @param size The character's size.
 * @returns An ArmorClass instance.
 */
export function CreateArmorClass(
  classes: CharacterClass[],
  abilities: AbilitiesMap,
  size: CreatureSize
): ArmorClass {
  const acAbilities: Ability[] = [];

  // Default to adding Dexterity as it applies to all characters' AC
  if (abilities.Dex) {
    acAbilities.push(abilities.Dex);
  }

  classes.forEach(c => {
    const classData = ClassesData.get(c.name);
    if (classData && classData.acAbilityName) {
      const ability = abilities[classData.acAbilityName as keyof AbilitiesMap];
      if (ability && !acAbilities.includes(ability)) {
        acAbilities.push(ability);
      }
    }
  });

  return new ArmorClass(acAbilities, size);
}
