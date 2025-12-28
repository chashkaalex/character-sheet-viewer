class ModifiableProperty {
  constructor(baseScore) {
    this.score = baseScore;
    this.currentScore = baseScore;
    this.effects = [];
    this.activeEffects = [];
  }

  //removal is managed by recreating the character
  applyEffect(effect) {
    //add to effects list
    this.effects.push(effect);

    const isPenalty = effect.value < 0;
    const isStackable = modifierTypes[effect.modifierType].isStackable;
    const currentActiveEffect = this.activeEffects
      .find(e => e.property === effect.property && e.modifierType === effect.modifierType);

    if (isPenalty || isStackable || !currentActiveEffect) {
      this.activeEffects.push(effect);
      this.currentScore += effect.value;
    } else if (effect.value > currentActiveEffect.value) {
      this.currentScore += effect.value - currentActiveEffect.value;
      this.activeEffects.splice(this.activeEffects.indexOf(currentActiveEffect), 1);
      this.activeEffects.push(effect);
    }
  }

  applyPermanentEffect(value) {  //just apply the value, no reason to manage the effect itself
    this.score += value;
    this.currentScore += value;
  }

  get EffectsString() {
    if (this.activeEffects.length > 0) {
      return this.activeEffects.map(e => {
        const sign = e.value >= 0 ? '+' : '';
        return `${sign}${e.value} (${e.status})`;
      }).join(', ');
    }
    return '';
  }

  get string() {
    return `${this.currentScore} (base: ${this.score})  ${this.EffectsString}`;
  }

  get state() {
    return {
      score: this.score,
      currentScore: this.currentScore,
      string: this.string
    };
  }
}

class Ability extends ModifiableProperty {
  constructor(baseScore, name) {
    super(baseScore);
    this.name = name;
  }

  get modifier() {
    return Math.floor((this.currentScore - 10) / 2);
  }

  // Extend base state with ability-specific properties
  get state() {
    return {
      ...super.state,
      name: this.name,
      modifier: this.modifier
    };
  }

  get ModifierString() {
    return `${this.modifier} ${this.name} modifier`;
  }
}

class AbilityBasedProperty extends ModifiableProperty {
  constructor(name, ability) {
    super(0);
    this.name = name;
    this.ability = ability;
  }

  get bonus() {
    return this.ability.modifier + this.currentScore;
  }

  get state() {
    return {
      bonus: this.bonus,
      string: `${this.bonus}: ${this.score} + ${this.ability.ModifierString} , ${this.EffectsString}`
    };
  }
}

class Skill extends ModifiableProperty {
  constructor(name, rank, ability) {
    super(rank);
    this.name = name;
    this.ability = ability;
    this.synergySkills = [];
  }

  get bonus() {
    return this.ability.modifier + this.currentScore + this.synergySkills.reduce((acc, skill) => acc + skill.currentScore >= 5 ? 2 : 0, 0);
  }

  // Extend base state with skill-specific properties
  get state() {
    const synergySkillsString = this.synergySkills.length > 0 ? `${this.synergySkills.map(s => `+2 ${s.name} synergy`).join(', ')}` : '';
    return {
      score: this.score,
      currentScore: this.currentScore,
      bonus: this.bonus,
      string: `${this.bonus}: ${this.score} rank + ${this.ability.ModifierString} ${synergySkillsString} ${this.EffectsString}`
    };
  }
}


class CreatureSize {
  constructor(size) {
    this.currentSize = size;
    this.effects = [];
  }

  get modifier() {
    return this.currentSize.modifier;
  }

  get bonus() {
    return this.currentSize.bonus;
  }

  applyEffect(effect) {
    this.currentSize = effect.value > 0 ? Sizes[this.currentSize.next] : Sizes[this.currentSize.previous];
    this.effects.push(effect);
  }

  get string() {
    const modifierSign = this.currentSize.modifier >= 0 ? '+' : '';
    const modifierString = modifierSign + this.currentSize.modifier;
    const sizeEffects = this.effects.length > 0 ? `(${this.effects.map(e => e.status).join(', ')})` : '';
    return `${modifierString} ${sizeEffects} size modifier`;
  }

  get bonusString() {
    const bonusSign = this.currentSize.bonus >= 0 ? '+' : '';
    const bonusString = bonusSign + this.currentSize.bonus;
    const sizeEffects = this.effects.length > 0 ? `(${this.effects.map(e => e.status).join(', ')})` : '';
    return `${bonusString} ${sizeEffects} size bonus`;
  }
}

class WeaponAttackBonus {
  constructor(bab, ability, size) {
    this.bab = bab;
    this.ability = ability;
    this.size = size;
  }

  get bonus() {
    return this.bab.currentScore + this.ability.modifier + this.size.modifier;
  }

  get state() {
    return {
      bonus: this.bonus,
      string: `${this.bonus}: ${this.bab.string}, + ${this.ability.ModifierString}, ${this.size.string}`
    };
  }
}

class SpecialAttackBonus extends ModifiableProperty {
  constructor(strength, size) {
    super(0);
    this.strength = strength;
    this.size = size;
  }

  get bonus() {
    const score = this.currentScore;
    const strengthModifier = this.strength.modifier;
    const sizeBonus = this.size.bonus;
    return score + strengthModifier + sizeBonus;
  }

  get state() {
    return {
      bonus: this.bonus,
      string: `${this.bonus}: ${this.strength.ModifierString}, ${this.size.bonusString} ${this.EffectsString}`
    };
  }
}

class WeaponDamageBonus {
  constructor(ability, dmgBonus /*ModifiableProperty*/) {
    this.dmgBonus = dmgBonus;
    this.ability = ability;
  }

  get bonus() {
    const abilityModifier = this.ability ? this.ability.modifier : 0;
    return abilityModifier + this.dmgBonus.currentScore;
  }

  get state() {
    const abilityString = this.ability ? this.ability.ModifierString : '';
    const dmgBonusString = this.dmgBonus.EffectsString;
    return {
      bonus: this.bonus,
      string: `${this.bonus}: ${abilityString} ${dmgBonusString}`
    };
  }
}

class ArmorClass extends ModifiableProperty {
  constructor(abilities, size) {
    super(10);
    this.abilities = abilities;
    this.size = size;
  }

  get currentArmorClass() {
    return this.currentScore +
      this.size.modifier +
      this.abilities.reduce((acc, ability) => acc + ability.modifier, 0);
  }

  get string() {
    return `${this.currentArmorClass} (base: ${this.score})  ${this.EffectsString}`;
  }

  get state() {
    return {
      bonus: this.currentArmorClass,
      string: `${this.string} ${this.size.string} ${this.abilities.map(a => `+ ${a.ModifierString}`).join(', ')}`
    };
  }
}

class ListOfSpecialProperties {
  constructor() {
    this.list = [];
  }

  applyEffect(effect) {
    this.list.push({ status: effect.status, description: effect.description });
  }

  get state() {
    return {
      list: this.list
    };
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    ModifiableProperty,
    Ability,
    AbilityBasedProperty,
    Skill,
    CreatureSize,
    WeaponAttackBonus,
    SpecialAttackBonus,
    WeaponDamageBonus,
    ArmorClass,
    ListOfSpecialProperties
  };
}
