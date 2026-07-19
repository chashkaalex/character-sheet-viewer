import { ModifierType } from '../_constants';
import { BaseProperty, currentRegistry } from '../00_property';
import type { ICharacter } from '../icharacter';
import { SkillsAbilities } from '../properties/skills';

/**
 * Valid property names that can be targeted by effects.
 */
export type EffectPropertyName = string;

/**
 * Resolver for dynamic values that depend on character state.
 */
export type EffectValueResolver = (character: Readonly<ICharacter>) => number;

/**
 * Callback for effects that directly mutate the character object.
 * @param character The character to mutate.
 * @param args Optional runtime-injected arguments (e.g. parsed casterClassName).
 */
export type MutatingEffectCallback = (character: ICharacter, args: Record<string, unknown>) => void;

// --- Data Interfaces for Declarative Definitions ---

export interface BaseEffectData {
    status: string;
    description?: string;
}

export interface DescriptionEffectData extends BaseEffectData {
    description: string;  // required here
}

export interface StaticPropertyEffectData extends BaseEffectData {
    property: EffectPropertyName;
    value: number;
    modifierType: ModifierType;
}

export interface PermanentPropertyEffectData extends BaseEffectData {
    property: EffectPropertyName;
    value: number;
}

export interface DynamicPropertyEffectData extends BaseEffectData {
    property: EffectPropertyName;
    valueResolver: EffectValueResolver;
    modifierType: ModifierType;
}

export interface MutatingEffectData extends BaseEffectData {
    callback: MutatingEffectCallback;
    /** Runtime-injected arguments resolved at parse time (e.g. { casterClassName: 'Cleric' }) */
    args?: Record<string, unknown>;
}

/** Union type for all declarative effect definitions */
export type EffectData = StaticPropertyEffectData
    | PermanentPropertyEffectData
    | DynamicPropertyEffectData
    | MutatingEffectData
    | DescriptionEffectData;

// --- Abstract Base ---

export abstract class BaseEffect {
    public status: string;
    public description: string;

    constructor(status: string, description: string = '') {
        this.status = status;
        this.description = description;
    }

    public abstract ApplyEffect(character: ICharacter): void;
}

// --- Concrete Implementations ---

/**
 * Adds a description entry to the character's Special properties stash.
 * Used for feats/items that grant abilities without a numeric bonus.
 */
export class DescriptionEffect extends BaseEffect {
    constructor(data: DescriptionEffectData) {
        super(data.status, data.description);
    }

    public ApplyEffect(character: ICharacter): void {
        character.Special.applyEffect(this);
    }
}

/**
 * Applies a fixed numeric bonus to a named character property.
 */
export class StaticPropertyEffect extends BaseEffect {
    public property: EffectPropertyName;
    public value: number;
    public modifierType: ModifierType;

    constructor(data: StaticPropertyEffectData) {
        super(data.status, data.description);
        this.property = data.property;
        this.value = data.value;
        this.modifierType = data.modifierType;
    }

    public ApplyEffect(character: ICharacter): void {
        const isSkillProperty = SkillsAbilities[this.property] !== undefined ||
            ['Perform', 'Craft', 'Knowledge'].includes(this.property);

        const hasInitMethod = typeof character.HasPropertyInitialized === 'function';
        const isParsing = currentRegistry !== null;
        const isSkillsInitialized = !isParsing || !hasInitMethod || character.HasPropertyInitialized('Skills');
        const isPropInitialized = !isParsing || !hasInitMethod || character.HasPropertyInitialized(this.property);

        if (isSkillProperty) {
            if (isSkillsInitialized) {
                let matchedAny = false;
                character.skills.forEach((skill: any) => {
                    if (skill.name === this.property ||
                        skill.name.startsWith(this.property + ' ') ||
                        skill.name.startsWith(this.property + '(')) {
                        skill.applyEffect(this);
                        matchedAny = true;
                    }
                });
                if (matchedAny) {
                    return;
                }
                const prop = character.GetNamedProperty(this.property);
                if (prop instanceof BaseProperty) {
                    prop.applyEffect(this);
                } else {
                    character.parseWarnings.push(`StaticPropertyEffect: Property ${this.property} not found (${this.status})`);
                }
            } else {
                character.QueuePendingEffect(this.property, this);
            }
        } else {
            if (isPropInitialized) {
                const prop = character.GetNamedProperty(this.property);
                if (prop instanceof BaseProperty) {
                    prop.applyEffect(this);
                } else {
                    character.parseWarnings.push(`StaticPropertyEffect: Property ${this.property} not found (${this.status})`);
                }
            } else {
                character.QueuePendingEffect(this.property, this);
            }
        }
    }
}

/**
 * Permanently raises the base score of a named property.
 * Used for class/race level-table bonuses that don't participate in stacking logic.
 */
export class PermanentPropertyEffect extends BaseEffect {
    public property: EffectPropertyName;
    public value: number;

    constructor(data: PermanentPropertyEffectData) {
        super(data.status, data.description);
        this.property = data.property;
        this.value = data.value;
    }

    public ApplyEffect(character: ICharacter): void {
        const isSkillProperty = SkillsAbilities[this.property] !== undefined ||
            ['Perform', 'Craft', 'Knowledge'].includes(this.property);

        const hasInitMethod = typeof character.HasPropertyInitialized === 'function';
        const isParsing = currentRegistry !== null;
        const isSkillsInitialized = !isParsing || !hasInitMethod || character.HasPropertyInitialized('Skills');
        const isPropInitialized = !isParsing || !hasInitMethod || character.HasPropertyInitialized(this.property);

        if (isSkillProperty) {
            if (isSkillsInitialized) {
                let matchedAny = false;
                character.skills.forEach((skill: any) => {
                    if (skill.name === this.property ||
                        skill.name.startsWith(this.property + ' ') ||
                        skill.name.startsWith(this.property + '(')) {
                        skill.applyPermanentEffect(this.value);
                        matchedAny = true;
                    }
                });
                if (matchedAny) {
                    return;
                }
                const prop = character.GetNamedProperty(this.property);
                if (prop instanceof BaseProperty) {
                    prop.applyPermanentEffect(this.value);
                } else {
                    character.parseWarnings.push(`PermanentPropertyEffect: Property ${this.property} not found (${this.status})`);
                }
            } else {
                character.QueuePendingEffect(this.property, this);
            }
        } else {
            if (isPropInitialized) {
                const prop = character.GetNamedProperty(this.property);
                if (prop instanceof BaseProperty) {
                    prop.applyPermanentEffect(this.value);
                } else {
                    character.parseWarnings.push(`PermanentPropertyEffect: Property ${this.property} not found (${this.status})`);
                }
            } else {
                character.QueuePendingEffect(this.property, this);
            }
        }
    }
}

/**
 * Resolves a character-dependent value at application time,
 * then applies the result as a static bonus.
 */
export class DynamicPropertyEffect extends BaseEffect {
    public property: EffectPropertyName;
    public valueResolver: EffectValueResolver;
    public modifierType: ModifierType;

    constructor(data: DynamicPropertyEffectData) {
        super(data.status, data.description);
        this.property = data.property;
        this.valueResolver = data.valueResolver;
        this.modifierType = data.modifierType;
    }

    public ApplyEffect(character: ICharacter): void {
        const resolvedValue = this.valueResolver(character);
        const resolvedEffect = new StaticPropertyEffect({
            status: this.status,
            description: this.description,
            property: this.property,
            value: resolvedValue,
            modifierType: this.modifierType
        });
        resolvedEffect.ApplyEffect(character);
    }
}

/**
 * Executes an arbitrary callback on the character.
 * Supports runtime-injected args (e.g. a parsed casterClassName) via the `args` field.
 */
export class MutatingEffect extends BaseEffect {
    public callback: MutatingEffectCallback;
    public args: Record<string, unknown>;

    constructor(data: MutatingEffectData) {
        super(data.status, data.description);
        this.callback = data.callback;
        this.args = data.args ?? {};
    }

    public ApplyEffect(character: ICharacter): void {
        this.callback(character, this.args);
    }
}

/**
 * Factory that converts declarative effect data or existing BaseEffect instances
 * into executable effect classes, dispatching by shape.
 */
export function EffectFactory(effect: BaseEffect | EffectData | any): BaseEffect {
    // Already a class instance — pass through
    if (effect instanceof BaseEffect) {
        return effect;
    }

    // MutatingEffect: has a callback function
    if (typeof effect.callback === 'function') {
        return new MutatingEffect(effect as MutatingEffectData);
    }

    // DynamicPropertyEffect: valueResolver is a function, or legacy value-as-function
    if (typeof effect.valueResolver === 'function' || (effect.property && typeof effect.value === 'function')) {
        const data: DynamicPropertyEffectData = {
            status: effect.status,
            description: effect.description,
            property: effect.property,
            valueResolver: effect.valueResolver ?? effect.value,
            modifierType: effect.modifierType ?? effect.modifier ?? 'Generic'
        };
        return new DynamicPropertyEffect(data);
    }

    // DescriptionEffect: has a description but no numeric value — covers both
    // { description } and the legacy { property: 'Special', description } shapes.
    if (effect.description && typeof effect.value !== 'number' && typeof effect.valueResolver !== 'function' && typeof effect.callback !== 'function') {
        return new DescriptionEffect(effect as DescriptionEffectData);
    }

    // StaticPropertyEffect: numeric value with a modifierType
    if (effect.property && typeof effect.value === 'number' && effect.modifierType) {
        return new StaticPropertyEffect(effect as StaticPropertyEffectData);
    }

    // PermanentPropertyEffect: numeric value without modifierType
    if (effect.property && typeof effect.value === 'number') {
        return new PermanentPropertyEffect(effect as PermanentPropertyEffectData);
    }

    throw new Error(`EffectFactory: Unknown or invalid effect format: ${JSON.stringify(effect)}`);
}
