import { ModifiableProperty, CreatureSize } from '../property';
import { CharacterClass } from './race_and_classes';
import { AbilitiesMap } from './abilities/ability_types';
import { Ability } from './abilities/ability';
import { ClassesData } from '../../classes_data/classes_general_data';
import { ModifierTypes } from '../constants';

export class ArmorClass extends ModifiableProperty {
  public abilities: Ability[];
  public size: CreatureSize;
  public applyShieldToTouch: boolean = false;
  public applyArmorToTouch: boolean = false;
  public maxDexBonus: number | null = null;
  public maxDexSource: string | null = null;
  public losesDexToAc: boolean = false;

  constructor(abilities: Ability[], size: CreatureSize) {
    super(10, 'ac');
    this.abilities = abilities;
    this.size = size;
  }

  public applyMaxDexCap(cap: number, source?: string): void {
    if (this.maxDexBonus === null || cap < this.maxDexBonus) {
      this.maxDexBonus = cap;
      this.maxDexSource = source || null;
    }
  }

  private getEffectiveAbilityModifier(ability: Ability, isFlatFooted: boolean = false): number {
    if (ability.name === 'Dex') {
      if (isFlatFooted || this.losesDexToAc) {
        return Math.min(0, ability.modifier);
      }
      if (this.maxDexBonus !== null && ability.modifier > this.maxDexBonus) {
        return this.maxDexBonus;
      }
    }
    return ability.modifier;
  }

  private formatAbilityString(ability: Ability, isFlatFooted: boolean = false): string {
    if (ability.name === 'Dex') {
      if (isFlatFooted || this.losesDexToAc) {
        const mod = Math.min(0, ability.modifier);
        return `+ ${mod} Dex modifier (flat-footed)`;
      }
      if (this.maxDexBonus !== null && ability.modifier > this.maxDexBonus) {
        const src = this.maxDexSource ? ` (max Dex from ${this.maxDexSource})` : ' (max Dex)';
        return `+ ${this.maxDexBonus} Dex modifier${src}`;
      }
    }
    return `+ ${ability.ModifierString}`;
  }

  public get currentArmorClass(): number {
    const activeEffectsValue = this.activeEffects
      .filter(e => !this.losesDexToAc || e.modifierType !== 'Dodge')
      .reduce((acc, e) => acc + e.value, 0);

    return this.score +
      activeEffectsValue +
      this.size.modifier +
      this.abilities.reduce((acc, ability) => acc + this.getEffectiveAbilityModifier(ability, false), 0);
  }

  public get touchArmorClass(): number {
    const activeTouchEffectsValue = this.activeEffects
      .filter(e => {
        if (this.losesDexToAc && e.modifierType === 'Dodge') return false;
        const typeInfo = ModifierTypes[e.modifierType];
        const isShield = e.modifierType === 'Shield' || e.status.startsWith('Shield Specialization');
        const isArmor = e.modifierType === 'Armor' || e.status.startsWith('Heavy Armor Optimization') || e.status.startsWith('Greater Heavy Armor Optimization');
        return (typeInfo && typeInfo.againstTouch) || e.value < 0 || (this.applyShieldToTouch && isShield) || (this.applyArmorToTouch && isArmor);
      })
      .reduce((acc, e) => acc + e.value, 0);

    return this.score +
      this.size.modifier +
      this.abilities.reduce((acc, ability) => acc + this.getEffectiveAbilityModifier(ability, false), 0) +
      activeTouchEffectsValue;
  }

  public get flatFootedArmorClass(): number {
    const activeFlatFootedEffectsValue = this.activeEffects
      .filter(e => e.modifierType !== 'Dodge')
      .reduce((acc, e) => acc + e.value, 0);

    const abilitiesValue = this.abilities.reduce((acc, ability) => {
      return acc + this.getEffectiveAbilityModifier(ability, true);
    }, 0);

    return this.score +
      this.size.modifier +
      abilitiesValue +
      activeFlatFootedEffectsValue;
  }

  public get touchString(): string {
    const activeTouchEffects = this.activeEffects.filter(e => {
      if (this.losesDexToAc && e.modifierType === 'Dodge') return false;
      const typeInfo = ModifierTypes[e.modifierType];
      const isShield = e.modifierType === 'Shield' || e.status.startsWith('Shield Specialization');
      const isArmor = e.modifierType === 'Armor' || e.status.startsWith('Heavy Armor Optimization') || e.status.startsWith('Greater Heavy Armor Optimization');
      return (typeInfo && typeInfo.againstTouch) || e.value < 0 || (this.applyShieldToTouch && isShield) || (this.applyArmorToTouch && isArmor);
    });
    const effectsStr = activeTouchEffects.length > 0
      ? activeTouchEffects.map(e => `${e.value >= 0 ? '+' : ''}${e.value} (${e.status})`).join(', ')
      : '';
    const effectsPart = effectsStr ? `, ${effectsStr}` : '';
    return `${this.touchArmorClass} (base: ${this.score})${effectsPart} ${this.size.string} ${this.abilities.map(a => this.formatAbilityString(a, false)).join(', ')}`;
  }

  public get flatFootedString(): string {
    const activeFlatFootedEffects = this.activeEffects.filter(e => e.modifierType !== 'Dodge');
    const effectsStr = activeFlatFootedEffects.length > 0
      ? activeFlatFootedEffects.map(e => `${e.value >= 0 ? '+' : ''}${e.value} (${e.status})`).join(', ')
      : '';
    const effectsPart = effectsStr ? `, ${effectsStr}` : '';

    const abilitiesStr = this.abilities.map(a => this.formatAbilityString(a, true)).join(', ');

    return `${this.flatFootedArmorClass} (base: ${this.score})${effectsPart} ${this.size.string} ${abilitiesStr}`;
  }

  public override get string(): string {
    const baseString = `${this.currentArmorClass} (base: ${this.score})  ${this.EffectsString}`;
    return `${baseString} ${this.size.string} ${this.abilities.map(a => this.formatAbilityString(a, false)).join(', ')}`;
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
