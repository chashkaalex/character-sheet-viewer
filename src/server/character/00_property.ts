import { ModifierTypes, Sizes, SizeInfo } from './_constants';
import type { Ability } from './properties/abilities/ability';
import { StaticPropertyEffect } from './state/effects';
import type { Item } from './gear/items/items';
import type { Weapon } from './gear/weapons/weapons';
import type { BaseEffect, EffectData } from './state/effects';

export type GearItem = Item | Weapon;

export interface IPropertyRegistry {
  registerProperty(name: string, property: BaseProperty<any>): void;
  registerItem(item: GearItem): void;
  addGearEffect(statusName: string, pattern: string, effect: BaseEffect | EffectData): void;
}

export let currentRegistry: IPropertyRegistry | null = null;

export function setPropertyRegistry(registry: IPropertyRegistry | null): void {
  currentRegistry = registry;
}

/** Structural type for entries in ListOfSpecialProperties. DescriptionEffect satisfies this. */
export interface SpecialPropertyEntry {
  status: string;
  description: string;
}

export abstract class BaseProperty<T> {
  public score: T;
  public currentScore: T;
  public effects: StaticPropertyEffect[];
  public activeEffects: StaticPropertyEffect[];
  public name?: string;

  constructor(baseScore: T, name?: string) {
    this.score = baseScore;
    this.currentScore = baseScore;
    this.effects = [];
    this.activeEffects = [];
    this.name = name;
    if (currentRegistry && name) {
      currentRegistry.registerProperty(name, this);
    }
  }

  public abstract applyEffect(effect: StaticPropertyEffect): void;
  public abstract applyPermanentEffect(value: number): void;
}

export class ModifiableProperty extends BaseProperty<number> {
  public isRollable: boolean;

  constructor(baseScore: number, name?: string, isRollable: boolean = false) {
    super(baseScore, name);
    this.isRollable = isRollable;
  }

  // Removal is managed by recreating the character
  public override applyEffect(effect: StaticPropertyEffect): void {
    // Add to effects list
    this.effects.push(effect);

    const isPenalty = effect.value < 0;
    const isStackable = ModifierTypes[effect.modifierType].isStackable;
    const currentActiveEffect = this.activeEffects
      .find(e => e.property === effect.property && e.modifierType === effect.modifierType);

    if (isPenalty || isStackable || !currentActiveEffect) {
      this.activeEffects.push(effect);
      this.currentScore += effect.value;
    } else if (effect.value > (currentActiveEffect.value || 0)) {
      this.currentScore += effect.value - currentActiveEffect.value;
      this.activeEffects.splice(this.activeEffects.indexOf(currentActiveEffect), 1);
      this.activeEffects.push(effect);
    }
  }

  public override applyPermanentEffect(value: number): void {
    // Just apply the value, no reason to manage the effect itself
    this.score += value;
    this.currentScore += value;
  }

  public get EffectsString(): string {
    if (this.activeEffects.length > 0) {
      const activeEffectsToDisplay = this.activeEffects.filter(e => e.value !== 0);
      if (activeEffectsToDisplay.length > 0) {
        return activeEffectsToDisplay.map(e => {
          const sign = e.value >= 0 ? '+' : '';
          return `${sign}${e.value} (${e.status})`;
        }).join(', ');
      }
    }
    return '';
  }

  public get string(): string {
    return `${this.currentScore} (base: ${this.score})  ${this.EffectsString}`;
  }

  public get state(): any {
    const sign = this.currentScore >= 0 ? '+' : '';
    const stateObj: any = {
      score: this.score,
      currentScore: this.currentScore,
      string: this.string
    };
    if (this.isRollable) {
      stateObj.rolzRollMessage = `#d20${sign}${this.currentScore}${this.name ? ' #' + this.name : ''}`;
    }
    return stateObj;
  }
}

export class CreatureSize extends BaseProperty<SizeInfo> {
  constructor(size: SizeInfo) {
    super(size, 'size');
  }

  public get currentSize(): SizeInfo {
    return this.currentScore;
  }

  public set currentSize(value: SizeInfo) {
    this.currentScore = value;
  }

  public get modifier(): number {
    return this.currentSize.modifier;
  }

  public get bonus(): number {
    return this.currentSize.bonus;
  }

  public override applyEffect(effect: StaticPropertyEffect): void {
    this.currentSize = effect.value > 0 ? Sizes[this.currentSize.next] : Sizes[this.currentSize.previous];
    this.effects.push(effect);
    this.activeEffects.push(effect);
  }

  public override applyPermanentEffect(value: number): void {
    // Shift the base size category permanently
    const nextSize = value > 0 ? Sizes[this.score.next] : Sizes[this.score.previous];
    this.score = nextSize;
    this.currentScore = nextSize;
  }

  public get string(): string {
    const modifierSign = this.currentSize.modifier >= 0 ? '+' : '';
    const modifierString = modifierSign + this.currentSize.modifier;
    const sizeEffects = this.effects.length > 0 ? `(${this.effects.map(e => e.status).join(', ')})` : '';
    return `${modifierString} ${sizeEffects} size modifier`;
  }

  public get bonusString(): string {
    if (this.currentSize.bonus === 0) {
      return '';
    }
    const bonusSign = this.currentSize.bonus > 0 ? '+' : '';
    const bonusString = bonusSign + this.currentSize.bonus;
    const sizeEffects = this.effects.length > 0 ? `(${this.effects.map(e => e.status).join(', ')})` : '';
    return `${bonusString} ${sizeEffects} size bonus`;
  }
}

export class WeaponAttackBonus {
  public bab: ModifiableProperty;
  public ability: Ability;
  public size: CreatureSize;
  public enhancement: number;
  public featBonus: ModifiableProperty;

  constructor(bab: ModifiableProperty, ability: Ability, size: CreatureSize, enhancement: number = 0, featBonus: ModifiableProperty = new ModifiableProperty(0)) {
    this.bab = bab;
    this.ability = ability;
    this.size = size;
    this.enhancement = enhancement;
    this.featBonus = featBonus;
  }

  public get bonus(): number {
    return this.bab.currentScore + this.ability.modifier + this.size.modifier + this.enhancement + this.featBonus.currentScore;
  }

  public get state(): any {
    const enhancementString = this.enhancement !== 0 ? `, +${this.enhancement} enhancement` : '';
    const featString = this.featBonus.EffectsString ? `, ${this.featBonus.EffectsString}` : '';
    return {
      bonus: this.bonus,
      string: `${this.bonus}: ${this.bab.string}, + ${this.ability.ModifierString}, ${this.size.string}${enhancementString}${featString}`
    };
  }
}

export class SpecialAttackBonus extends ModifiableProperty {
  public strength: Ability;
  public size: CreatureSize;
  public bab?: ModifiableProperty;

  constructor(strength: Ability, size: CreatureSize, name?: string, bab?: ModifiableProperty) {
    super(0, name, true);
    this.strength = strength;
    this.size = size;
    this.bab = bab;
  }

  public get bonus(): number {
    const score = this.currentScore;
    const strengthModifier = this.strength.modifier;
    const sizeBonus = this.size.bonus;
    const babBonus = this.bab ? this.bab.currentScore : 0;
    return score + strengthModifier + sizeBonus + babBonus;
  }

  public override get string(): string {
    const babPart = this.bab ? `, ${this.bab.currentScore} BAB` : '';
    return `${this.bonus}: ${this.strength.ModifierString}, ${this.size.bonusString}${babPart} ${this.EffectsString}`;
  }

  public override get state(): any {
    const parentState = super.state;
    const sign = this.bonus >= 0 ? '+' : '';
    return {
      ...parentState,
      bonus: this.bonus,
      rolzRollMessage: `#d20${sign}${this.bonus}${this.name ? ' #' + this.name : ''}`
    };
  }
}

export class WeaponDamageBonus {
  public ability: Ability | null;
  public globalDmgBonus: ModifiableProperty;
  public weaponSpecificBonus: number;
  public featBonus: ModifiableProperty;

  constructor(ability: Ability | null, globalDmgBonus: ModifiableProperty, weaponSpecificBonus: number = 0, featBonus: ModifiableProperty = new ModifiableProperty(0)) {
    this.globalDmgBonus = globalDmgBonus;
    this.ability = ability;
    this.weaponSpecificBonus = weaponSpecificBonus;
    this.featBonus = featBonus;
  }

  public get bonus(): number {
    const abilityModifier = this.ability ? this.ability.modifier : 0;
    return abilityModifier + this.globalDmgBonus.currentScore + this.weaponSpecificBonus + this.featBonus.currentScore;
  }

  public get state(): any {
    const abilityString = this.ability ? this.ability.ModifierString : '';
    const globalDmgBonusString = this.globalDmgBonus.EffectsString;
    const weaponSpecificBonusString = this.weaponSpecificBonus !== 0 ? `, +${this.weaponSpecificBonus} weapon bonus` : '';
    const featBonusString = this.featBonus.EffectsString ? `, ${this.featBonus.EffectsString}` : '';
    return {
      bonus: this.bonus,
      string: `${this.bonus}: ${abilityString} ${globalDmgBonusString}${weaponSpecificBonusString}${featBonusString}`
    };
  }
}

export class ListOfSpecialProperties {
  public list: SpecialPropertyEntry[];

  constructor() {
    this.list = [];
  }

  public applyEffect(effect: SpecialPropertyEntry): void {
    this.list.push(effect);
  }

  public get state(): any {
    return {
      list: this.list
    };
  }
}
