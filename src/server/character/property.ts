import { ModifierTypes, Sizes, ModifierType, AbilityName, SizeInfo } from './_constants';
import { StaticallyApplicableEffect, BaseEffect } from './state';

export class ModifiableProperty {
  public score: number;
  public currentScore: number;
  public effects: StaticallyApplicableEffect[];
  public activeEffects: StaticallyApplicableEffect[];

  constructor(baseScore: number) {
    this.score = baseScore;
    this.currentScore = baseScore;
    this.effects = [];
    this.activeEffects = [];
  }

  // Removal is managed by recreating the character
  public applyEffect(effect: StaticallyApplicableEffect): void {
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

  public applyPermanentEffect(value: number): void {
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
    return {
      score: this.score,
      currentScore: this.currentScore,
      string: this.string
    };
  }
}

export class Ability extends ModifiableProperty {
  public name: AbilityName;

  constructor(baseScore: number, name: AbilityName) {
    super(baseScore);
    this.name = name;
  }

  public get modifier(): number {
    return Math.floor((this.currentScore - 10) / 2);
  }

  // Extend base state with ability-specific properties
  public override get state(): any {
    return {
      ...super.state,
      name: this.name,
      modifier: this.modifier
    };
  }

  public get ModifierString(): string {
    return `${this.modifier} ${this.name} modifier`;
  }
}

export class AbilityBasedProperty extends ModifiableProperty {
  public name: string;
  public ability: Ability;

  constructor(name: string, ability: Ability) {
    super(0);
    this.name = name;
    this.ability = ability;
  }

  public get bonus(): number {
    return this.ability.modifier + this.currentScore;
  }

  public override get string(): string {
    return `${this.bonus}: ${this.score} + ${this.ability.ModifierString} , ${this.EffectsString}`;
  }

  public override get state(): any {
    return {
      ...super.state,
      bonus: this.bonus
    };
  }
}

export class Skill extends ModifiableProperty {
  public name: string;
  public ability: Ability;
  public synergySkills: Skill[];

  constructor(name: string, rank: number, ability: Ability) {
    super(rank);
    this.name = name;
    this.ability = ability;
    this.synergySkills = [];
  }

  public get bonus(): number {
    return this.ability.modifier + this.currentScore + this.synergySkills.reduce((acc, skill) => acc + (skill.currentScore >= 5 ? 2 : 0), 0);
  }

  public override get string(): string {
    const synergySkillsString = this.synergySkills.length > 0 ? `${this.synergySkills.map(s => `+2 ${s.name} synergy`).join(', ')}` : '';
    return `${this.bonus}: ${this.score} rank + ${this.ability.ModifierString} ${synergySkillsString} ${this.EffectsString}`;
  }

  public override get state(): any {
    return {
      ...super.state,
      bonus: this.bonus
    };
  }
}

export class CreatureSize {
  public currentSize: SizeInfo;
  public effects: StaticallyApplicableEffect[];

  constructor(size: SizeInfo) {
    this.currentSize = size;
    this.effects = [];
  }

  public get modifier(): number {
    return this.currentSize.modifier;
  }

  public get bonus(): number {
    return this.currentSize.bonus;
  }

  public applyEffect(effect: StaticallyApplicableEffect): void {
    this.currentSize = effect.value > 0 ? Sizes[this.currentSize.next] : Sizes[this.currentSize.previous];
    this.effects.push(effect);
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

  constructor(bab: ModifiableProperty, ability: Ability, size: CreatureSize, enhancement: number = 0) {
    this.bab = bab;
    this.ability = ability;
    this.size = size;
    this.enhancement = enhancement;
  }

  public get bonus(): number {
    return this.bab.currentScore + this.ability.modifier + this.size.modifier + this.enhancement;
  }

  public get state(): any {
    const enhancementString = this.enhancement !== 0 ? `, +${this.enhancement} enhancement` : '';
    return {
      bonus: this.bonus,
      string: `${this.bonus}: ${this.bab.string}, + ${this.ability.ModifierString}, ${this.size.string}${enhancementString}`
    };
  }
}

export class SpecialAttackBonus extends ModifiableProperty {
  public strength: Ability;
  public size: CreatureSize;

  constructor(strength: Ability, size: CreatureSize) {
    super(0);
    this.strength = strength;
    this.size = size;
  }

  public get bonus(): number {
    const score = this.currentScore;
    const strengthModifier = this.strength.modifier;
    const sizeBonus = this.size.bonus;
    return score + strengthModifier + sizeBonus;
  }

  public override get string(): string {
    return `${this.bonus}: ${this.strength.ModifierString}, ${this.size.bonusString} ${this.EffectsString}`;
  }

  public override get state(): any {
    return {
      ...super.state,
      bonus: this.bonus
    };
  }
}

export class WeaponDamageBonus {
  public ability: Ability | null;
  public globalDmgBonus: ModifiableProperty;
  public weaponSpecificBonus: number;

  constructor(ability: Ability | null, globalDmgBonus: ModifiableProperty, weaponSpecificBonus: number = 0) {
    this.globalDmgBonus = globalDmgBonus;
    this.ability = ability;
    this.weaponSpecificBonus = weaponSpecificBonus;
  }

  public get bonus(): number {
    const abilityModifier = this.ability ? this.ability.modifier : 0;
    return abilityModifier + this.globalDmgBonus.currentScore + this.weaponSpecificBonus;
  }

  public get state(): any {
    const abilityString = this.ability ? this.ability.ModifierString : '';
    const globalDmgBonusString = this.globalDmgBonus.EffectsString;
    const weaponSpecificBonusString = this.weaponSpecificBonus !== 0 ? `, +${this.weaponSpecificBonus} weapon bonus` : '';
    return {
      bonus: this.bonus,
      string: `${this.bonus}: ${abilityString} ${globalDmgBonusString}${weaponSpecificBonusString}`
    };
  }
}

export class ArmorClass extends ModifiableProperty {
  public abilities: Ability[];
  public size: CreatureSize;

  constructor(abilities: Ability[], size: CreatureSize) {
    super(10);
    this.abilities = abilities;
    this.size = size;
  }

  public get currentArmorClass(): number {
    return this.currentScore +
      this.size.modifier +
      this.abilities.reduce((acc, ability) => acc + ability.modifier, 0);
  }

  public override get string(): string {
    const baseString = `${this.currentArmorClass} (base: ${this.score})  ${this.EffectsString}`;
    return `${baseString} ${this.size.string} ${this.abilities.map(a => `+ ${a.ModifierString}`).join(', ')}`;
  }

  public override get state(): any {
    return {
      ...super.state,
      bonus: this.currentArmorClass
    };
  }
}

export class ListOfSpecialProperties {
  public list: BaseEffect[];

  constructor() {
    this.list = [];
  }

  public applyEffect(effect: BaseEffect): void {
    this.list.push(effect);
  }

  public get state(): any {
    return {
      list: this.list
    };
  }
}

