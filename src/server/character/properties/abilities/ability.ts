import { ModifiableProperty } from '../../00_property';
import { AbilityName } from './ability_types';

export class Ability extends ModifiableProperty {
  public name: AbilityName;

  constructor(baseScore: number, name: AbilityName) {
    super(baseScore, name);
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
    super(0, name);
    this.name = name;
    this.ability = ability;
  }

  public get bonus(): number {
    return this.currentScore + this.ability.modifier;
  }

  public override get string(): string {
    return `${this.bonus}: ${this.ability.ModifierString} ${this.EffectsString}`;
  }

  public override get state(): any {
    return {
      ...super.state,
      bonus: this.bonus
    };
  }
}
