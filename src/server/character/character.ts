import { ParseDocLines } from './parsers/doc_parser';
import { STANDARD_COMBAT_ACTIONS } from './actions/actions_effects';
import {
    ModifiableProperty,
    CreatureSize,
    SpecialAttackBonus,
    ListOfSpecialProperties,
    IPropertyRegistry,
    BaseProperty,
    setPropertyRegistry,
    GearItem
} from './property';
import { SpellCasting, ExtractAndValidateSpell } from './spells';
import { AbilityNames, AbilitiesMap } from './properties/abilities/ability_types';
import { Ability, AbilityBasedProperty } from './properties/abilities/ability';
import { ParseAbilities } from './properties/abilities/ability_parser';
import { Sizes, SpecialAttackNames } from './constants';
import { BodySlots, BodySlotsMap, Item } from './gear/items/items';
import { ParsePreparedSpells } from './parsers/prepared_spells';
import { Skill, ParseSkills, SkillsAbilities } from './properties/skills';
import { ParseStatuses } from './state/statuses_parser';
import { ParseFeats } from './properties/feats/feats_parser';
import { ParseFlaws } from './properties/flaws/flaws_parser';
import { ParseWeapons } from './gear/weapons/weapons_parser';
import { ParseItems } from './gear/items/items_parser';
import { ParseRaceAndClasses, ApplyClassesEffects, ApplyRacesEffects, CharacterClass } from './properties/race_and_classes';
import { CreateArmorClass, ArmorClass } from './properties/armorClass';
import { CreateSaves, SavesMap, SaveNames } from './properties/saves';
import { ParseHp } from './state/hp';
import { initializeGeneralEffects } from './general_effects';
import { ICharacter } from './icharacter';
import { Status } from './state/state';
import { BaseEffect, EffectData, EffectFactory, MutatingEffect, StaticPropertyEffect } from './state/effects';
import { Weapon } from './gear/weapons/weapons';

// Ensure data files are loaded (side effects)
import '../classes_data/cleric';
import '../classes_data/bard';
import '../classes_data/monk';
import '../classes_data/sacred_fist';
import '../classes_data/fighter';
import '../classes_data/rogue';
import '../classes_data/shadowdancer';
import '../classes_data/beguiler';
import '../classes_data/unseen_seer';
import '../classes_data/crusader';

// Ensure data files are loaded (side effects)
import '../races_data/dwarf';
import '../races_data/elf';
import '../races_data/human';
import '../races_data/half-elf';

import { RacesData } from '../races_data/races_general_data';

import { ClassesData } from '../classes_data/classes_general_data';
import { UpdateHpCallback, OnCastSpellCallback } from './manipulation_types';
import { ApplyEncumbranceEffects, EncumbranceState } from './properties/encumbrance';
import './actions/actions_effects';

export class Character implements ICharacter, IPropertyRegistry {
    public docId: string;
    public lines: string[];
    public parseSuccess: boolean;
    public parseErrors: string[] = [];
    public parseWarnings: string[] = [];
    public sectionLines: Record<string, string[]>;
    public attackLine: string | null;
    public resistanceLine: string | null;
    public hpLine: string | null;
    public abilitiesLines: Record<string, string>;
    public name: string;
    public rolzRoomId?: string;
    public size: CreatureSize;
    public abilities: AbilitiesMap = {};
    public bodySlots: BodySlotsMap;
    public spellCasting: SpellCasting;
    public race: string = '';
    public classes: CharacterClass[] = [];
    public skills: Skill[] = [];
    public statuses: Status[] = [];
    public actions: string[] = [...STANDARD_COMBAT_ACTIONS];
    public actionCategoryResources: Record<string, { remaining: number; max: number; label?: string }> = {};
    public feats: EffectData[][] = [];
    public flaws: EffectData[][] = [];
    public battleGear: Item[] = [];
    public possessions: Item[] = [];
    public bab: ModifiableProperty;
    public attackBonus: ModifiableProperty;
    public meleeAttackBonus: ModifiableProperty;
    public rangedAttackBonus: ModifiableProperty;
    public acp: ModifiableProperty;
    public specialAttacks: Record<string, ModifiableProperty> = {};
    public resistances: string = '';
    public dr: ModifiableProperty;
    public sr: ModifiableProperty;
    public hp: { current: number; max: number };
    public HD: number = 0;
    public temporaryHp: number = 0;
    public nonlethalDamage: number = 0;
    public damageBonus: ModifiableProperty;
    public meleeDamageBonus: ModifiableProperty;
    public rangedDamageBonus: ModifiableProperty;
    public weapons: Weapon[] = [];
    public Special: ListOfSpecialProperties;
    public speed: ModifiableProperty;
    public partyName: string | null = null;
    public partyMembers: string[] = [];
    public quickStatuses: string[] = [];
    public partyNickname: string | null = null;
    public manipulationCallbacks = {
        UpdateHp: [] as UpdateHpCallback[],
        OnCastSpell: [] as OnCastSpellCallback[]
    };

    // Added during parsing
    public InitiativeBonus!: AbilityBasedProperty;
    public attacksOfOpportunity!: ModifiableProperty;
    public ac!: ArmorClass;
    public saves!: SavesMap;
    public encumbrance!: EncumbranceState;
    private _dynamicModifiableProperties: Map<string, ModifiableProperty> = new Map();
    private _initializedProperties: Map<string, BaseProperty<any>> = new Map();
    private _pendingEffects: Map<string, BaseEffect[]> = new Map();
    private _registeredItems: GearItem[] = [];
    private _gearEffects: { statusName: string; pattern: string; effect: BaseEffect | EffectData }[] = [];

    public registerProperty(name: string, property: BaseProperty<any>): void {
        this._initializedProperties.set(name, property);
        this.ApplyPendingEffects(name);
    }

    public registerItem(item: GearItem): void {
        if (this._registeredItems.includes(item)) {
            return;
        }
        this._registeredItems.push(item);
        this._gearEffects.forEach(ge => {
            if (this.matchesGearPattern(item, ge.pattern)) {
                this.applyGearEffect(item, ge.effect);
            }
        });
    }

    public addGearEffect(statusName: string, pattern: string, effect: BaseEffect | EffectData): void {
        this._gearEffects.push({ statusName, pattern, effect });
        this._registeredItems.forEach(item => {
            if (this.matchesGearPattern(item, pattern)) {
                this.applyGearEffect(item, effect);
            }
        });
    }

    private matchesGearPattern(item: GearItem, pattern: string): boolean {
        if ('matchesPattern' in item && typeof (item as any).matchesPattern === 'function') {
            return (item as any).matchesPattern(pattern);
        }
        const patternLower = pattern.toLowerCase();
        return item.name.toLowerCase().includes(patternLower);
    }

    private applyGearEffect(item: GearItem, effect: BaseEffect | EffectData): void {
        const effInstance = EffectFactory(effect);
        if (effInstance instanceof MutatingEffect) {
            effInstance.callback(this, { ...effInstance.args, item });
            return;
        }
        if ('property' in effInstance) {
            const propName = (effInstance as any).property;
            const targetProp = (item as any)[propName];
            if (targetProp instanceof BaseProperty && effInstance instanceof StaticPropertyEffect) {
                targetProp.applyEffect(effInstance);
            }
        }
    }

    public HasPropertyInitialized(propertyName: string): boolean {
        if (this._initializedProperties.has(propertyName)) {
            return true;
        }
        const normalizedTarget = propertyName.toLowerCase().replace(/[\s-_]/g, '');
        for (const key of this._initializedProperties.keys()) {
            if (key.toLowerCase().replace(/[\s-_]/g, '') === normalizedTarget) {
                return true;
            }
        }
        return false;
    }

    public QueuePendingEffect(propertyName: string, effect: BaseEffect): void {
        if (!this._pendingEffects.has(propertyName)) {
            this._pendingEffects.set(propertyName, []);
        }
        this._pendingEffects.get(propertyName)!.push(effect);
    }

    public ApplyPendingEffects(propertyName: string): void {
        const normalizedTarget = propertyName.toLowerCase().replace(/[\s-_]/g, '');
        for (const [key, effects] of this._pendingEffects.entries()) {
            if (key === propertyName || key.toLowerCase().replace(/[\s-_]/g, '') === normalizedTarget) {
                if (effects && effects.length > 0) {
                    this._pendingEffects.set(key, []);
                    effects.forEach(effect => {
                        effect.ApplyEffect(this);
                    });
                }
            }
        }
    }

    public ResolveAllRemainingPendingEffects(): void {
        for (const propertyName of Array.from(this._pendingEffects.keys())) {
            const effects = this._pendingEffects.get(propertyName);
            if (effects && effects.length > 0) {
                this.GetNamedProperty(propertyName);
            }
        }
    }


    constructor(lines: string[], docId: string = 'unknown') {
        initializeGeneralEffects();
        this.docId = docId;
        this.lines = lines;

        const parseResult = ParseDocLines(this.lines);
        this.sectionLines = parseResult.sectionLines;
        this.attackLine = parseResult.attackLine;
        this.resistanceLine = parseResult.resistanceLine;
        this.hpLine = parseResult.hpLine;
        this.abilitiesLines = parseResult.abilitiesLines;
        this.parseSuccess = parseResult.success;

        if (parseResult.errors && parseResult.errors.length > 0) {
            this.parseErrors.push(...parseResult.errors);
        }

        this.name = this.lines[0];

        const rolzRoomLine = this.lines.find(line => line.toLowerCase().startsWith('rolz room id:'));
        if (rolzRoomLine) {
            this.rolzRoomId = rolzRoomLine.split(':')[1].trim();
        }

        setPropertyRegistry(this);
        try {
            this.size = new CreatureSize(Sizes['Medium']);
            this.bodySlots = new Map(BodySlots.map(slot => [slot.slotName, slot.possibleAmount]));
            this.spellCasting = new SpellCasting();
            this.actions = [...STANDARD_COMBAT_ACTIONS];
            this.bab = new ModifiableProperty(0, 'bab');
            this.attackBonus = new ModifiableProperty(0, 'attackBonus');
            this.meleeAttackBonus = new ModifiableProperty(0, 'meleeAttackBonus');
            this.rangedAttackBonus = new ModifiableProperty(0, 'rangedAttackBonus');
            this.acp = new ModifiableProperty(0, 'acp');
            this.dr = new ModifiableProperty(0, 'dr');
            this.sr = new ModifiableProperty(0, 'sr');
            this.hp = { current: 0, max: 0 };
            this.damageBonus = new ModifiableProperty(0, 'damageBonus');
            this.meleeDamageBonus = new ModifiableProperty(0, 'meleeDamageBonus');
            this.rangedDamageBonus = new ModifiableProperty(0, 'rangedDamageBonus');
            this.Special = new ListOfSpecialProperties();
            this.speed = new ModifiableProperty(0, 'speed');
        } finally {
            setPropertyRegistry(null);
        }
    }

    public ParseCharacter(): void {
        if (!this.parseSuccess) {
            return;
        }

        setPropertyRegistry(this);
        try {
            // Parsing Abilities
            this.abilities = ParseAbilities(this.abilitiesLines);

            // Parsing Party
            const partyLines = this.sectionLines['Parties Membership'];
            if (partyLines && partyLines.length > 0) {
                this.partyName = partyLines[0].trim();
            }

            // Parsing Resistances, DR, and SR
            if (this.resistanceLine) {
                this.resistances = this.resistanceLine.split(':')[1].trim();
                const drMatch = this.resistances.match(/\bDR\s+(\d+)\s*\/\s*([^\s,;]+)/i);
                if (drMatch) {
                    const drVal = parseInt(drMatch[1], 10);
                    if (!isNaN(drVal) && drVal > 0) {
                        this.dr.applyPermanentEffect(drVal);
                    }
                }
                const srMatch = this.resistances.match(/\b(?:SR|Spell\s+Resistance)\s+(\d+)\b/i);
                if (srMatch) {
                    const srVal = parseInt(srMatch[1], 10);
                    if (!isNaN(srVal) && srVal > 0) {
                        this.sr.applyPermanentEffect(srVal);
                    }
                }
            }

            // Saves
            this.saves = CreateSaves(this.abilities);

            // Attacks of opportunity
            this.attacksOfOpportunity = new ModifiableProperty(1, 'attacksOfOpportunity');

            // Parsing Special Attacks
            for (const attackName of SpecialAttackNames) {
                if (attackName === 'Trip' || attackName === 'Bull rush' || attackName === 'Overrun') {
                    this.specialAttacks[attackName] = new SpecialAttackBonus(this.abilities.Str!, this.size, attackName);
                } else if (attackName === 'Grapple') {
                    this.specialAttacks[attackName] = new SpecialAttackBonus(this.abilities.Str!, this.size, attackName, this.bab, this.attackBonus);
                } else {
                    this.specialAttacks[attackName] = new ModifiableProperty(0, attackName);
                }
            }

            // Parsing Race and Classes
            ({ race: this.race, classes: this.classes } = ParseRaceAndClasses(this.lines));
            if (!this.race || this.classes.length === 0) {
                this.LogParseError('Race and classes - parsing failed');
            }
            this.speed = new ModifiableProperty(RacesData.get(this.race)?.speed || 0, 'speed');

            // AC, must be done after race and classes are parsed
            this.ac = CreateArmorClass(this.classes, this.abilities, this.size);

            // Parsing Skills (Do this BEFORE applying effects so racial/class effects apply to the parsed skills)
            this.skills = ParseSkills(this.sectionLines['Skills'], this.abilities, this.acp);
            this.registerProperty('Skills', {} as any);
            this.skills.forEach(skill => this.ApplyPendingEffects(skill.name));

            // Apply class effects
            ApplyClassesEffects(this);

            // Apply race effects
            ApplyRacesEffects(this);

            // Calculating Initiative
            this.InitiativeBonus = new AbilityBasedProperty('InitiativeBonus', this.abilities.Dex!);

            // Parsing HP and Speed (from line)
            this.hp = ParseHp(this.hpLine!);

            // Parsing Items
            ParseItems(this);

            // Updating spell slots
            if (this.spellCasting.isActive()) {
                this.spellCasting.updateSpellsData(this);
            }

            if (this.spellCasting.isActive()) {
                const preparedSpells = ParsePreparedSpells(this.sectionLines['Prepared Spells']);
                if (preparedSpells) {
                    this.spellCasting.updatePreparedSpells(preparedSpells as any, this);
                }
            }

            // Parsing Statuses
            ParseStatuses(this);

            // Parsing Feats
            ParseFeats(this);

            // Parsing Flaws
            ParseFlaws(this);

            // Parsing Weapons
            ParseWeapons(this);

            // Resolve any remaining pending effects
            this.ResolveAllRemainingPendingEffects();

            // Re-sync spell casting metadata (e.g. Save DCs that depend on Spell Focus feats or item/status ability buffs)
            if (this.spellCasting.isActive()) {
                this.spellCasting.refreshSpellMetadata(this);
            }

            // Apply dynamic Constitution modifier delta (from statuses/ability damage/buffs after sheet base) to Max HP
            if (this.abilities.Con && this.HD > 0) {
                const baseConMod = Math.floor((this.abilities.Con.score - 10) / 2);
                const currentConMod = this.abilities.Con.modifier;
                const conModDelta = currentConMod - baseConMod;
                if (conModDelta !== 0) {
                    this.hp.max += conModDelta * this.HD;
                    if (this.hp.current > this.hp.max) {
                        this.hp.current = this.hp.max;
                    }
                }
            }

            // Calculate carrying capacity, total carried weight, and apply D&D 3.5 encumbrance penalties
            ApplyEncumbranceEffects(this);
        } finally {
            setPropertyRegistry(null);
        }
    }

    public HasFeat(featName: string): boolean {
        return this.feats && this.feats.some(f => f.some(e => e.status === featName || e.status.startsWith(featName + ' (')));
    }

    public HasStatus(statusName: string): boolean {
        return this.statuses && this.statuses.some(s => s.name === statusName);
    }

    public HasClass(className: string): boolean {
        return this.classes && this.classes.some(c => c.name === className);
    }

    public GetClassLevel(className: string): number {
        if (!this.classes) return 0;
        const match = this.classes.find(c => c.name === className);
        return match ? match.level : 0;
    }

    public HasFlaw(flawName: string): boolean {
        return this.flaws && this.flaws.some(flaw => flaw.some(e => e.status === flawName));
    }

    public GetNamedProperty(propertyName: string): any {
        if (this._initializedProperties.has(propertyName)) {
            return this._initializedProperties.get(propertyName);
        }

        // Try case-insensitive and space/dash normalized lookup for initialized properties
        const normalizedTarget = propertyName.toLowerCase().replace(/[\s-_]/g, '');
        for (const [key, prop] of this._initializedProperties.entries()) {
            if (key.toLowerCase().replace(/[\s-_]/g, '') === normalizedTarget) {
                return prop;
            }
        }

        if (SkillsAbilities[propertyName] || this.skills.some(s => s.name === propertyName)) {
            let skill = this.skills.find(s => s.name === propertyName);
            if (!skill) {
                const baseSkillName = Object.keys(SkillsAbilities).find(k => propertyName.startsWith(k)) || 'Perform';
                const abilityName = SkillsAbilities[propertyName] || SkillsAbilities[baseSkillName];
                skill = new Skill(propertyName, 0, this.abilities[abilityName as keyof AbilitiesMap]!, this.acp);
                this.skills.push(skill);
            }
            return skill;
        } else {
            // If the character is a Bard, return a dummy ModifiableProperty for known but inactive
            // inspire specials to avoid warnings when Song of the Heart or other effects are parsed.
            const isInspireSpecial = ['Inspire Courage', 'Inspire Competence', 'Inspire Greatness', 'Inspire Heroics'].includes(propertyName);
            if (isInspireSpecial && this.HasClass('Bard')) {
                return new ModifiableProperty(0, propertyName);
            }

            const dynamicProp = this.GetModifiableProperty(propertyName);
            if (
                dynamicProp.score > 0 ||
                dynamicProp.effects.length > 0 ||
                this.HasPropertyInitialized(propertyName) ||
                (this._pendingEffects.has(propertyName) && this._pendingEffects.get(propertyName)!.length > 0)
            ) {
                if (!this.HasPropertyInitialized(propertyName)) {
                    this.registerProperty(propertyName, dynamicProp);
                }
                return dynamicProp;
            }
            this.parseWarnings.push(`Property ${propertyName} not found`);
            return null;
        }
    }

    public GetModifiableProperty(propertyName: string): ModifiableProperty {
        if (!this._dynamicModifiableProperties.has(propertyName)) {
            this._dynamicModifiableProperties.set(propertyName, new ModifiableProperty(0, propertyName));
        }
        return this._dynamicModifiableProperties.get(propertyName)!;
    }

    public static ValidatePreparedSpell(casterClassName: string, spellLevel: number, spellLevelName: string, spellName: string, domains: string[]): boolean {
        const { isValid } = ExtractAndValidateSpell(casterClassName, spellLevel, spellLevelName, spellName, domains);
        return isValid;
    }



    private normalizeEnergyType(rawType: string): string | null {
        const lower = rawType.trim().toLowerCase();
        if (lower === 'acid') return 'acid';
        if (['cold', 'frost', 'ice'].includes(lower)) return 'cold';
        if (['electricity', 'electric', 'lightning', 'shock'].includes(lower)) return 'electricity';
        if (['fire', 'flame'].includes(lower)) return 'fire';
        if (['sonic', 'sound'].includes(lower)) return 'sonic';
        return null;
    }

    public getEnergyResistance(energyType: string): number {
        const canonical = this.normalizeEnergyType(energyType);
        if (!canonical || !this.resistances) return 0;

        let maxRes = 0;
        const numFirstRegex = /(\d+)\s*(acid|cold|frost|ice|electricity|electric|lightning|shock|fire|flame|sonic|sound)\b/gi;
        let match: RegExpExecArray | null;
        while ((match = numFirstRegex.exec(this.resistances)) !== null) {
            if (this.normalizeEnergyType(match[2]) === canonical) {
                maxRes = Math.max(maxRes, parseInt(match[1], 10));
            }
        }

        const typeFirstRegex = /\b(acid|cold|frost|ice|electricity|electric|lightning|shock|fire|flame|sonic|sound)(?:\s+resistance)?\s*(\d+)/gi;
        while ((match = typeFirstRegex.exec(this.resistances)) !== null) {
            if (this.normalizeEnergyType(match[1]) === canonical) {
                maxRes = Math.max(maxRes, parseInt(match[2], 10));
            }
        }

        return maxRes;
    }

    public InflictDamage(amount: number, energyDamage?: Record<string, number>): number {
        const rawPhysical = Math.max(0, Math.floor(Number(amount) || 0));
        const drReduction = this.dr ? Math.max(0, this.dr.currentScore) : 0;
        let totalDamage = rawPhysical > 0 ? Math.max(0, rawPhysical - drReduction) : 0;

        if (energyDamage && typeof energyDamage === 'object') {
            Object.entries(energyDamage).forEach(([type, rawVal]) => {
                const val = Math.max(0, Math.floor(Number(rawVal) || 0));
                if (val <= 0) return;
                if (type.trim().toLowerCase() === 'nonlethal') {
                    const effectiveNl = Math.max(0, val - drReduction);
                    this.nonlethalDamage += effectiveNl;
                    return;
                }
                const resistance = this.getEnergyResistance(type);
                totalDamage += Math.max(0, val - resistance);
            });
        }

        let remainingDamage = totalDamage;
        if (this.temporaryHp > 0 && remainingDamage > 0) {
            if (this.temporaryHp >= remainingDamage) {
                this.temporaryHp -= remainingDamage;
                return totalDamage;
            } else {
                remainingDamage -= this.temporaryHp;
                this.temporaryHp = 0;
            }
        }
        if (remainingDamage > 0) {
            this.hp.current = Math.max(-10, this.hp.current - remainingDamage);
        }
        return totalDamage;
    }

    public CureDamage(amount: number): void {
        const healAmount = Math.max(0, Math.floor(Number(amount) || 0));
        this.hp.current = Math.min(this.hp.max, this.hp.current + healAmount);
        if (this.nonlethalDamage > 0 && healAmount > 0) {
            this.nonlethalDamage = Math.max(0, this.nonlethalDamage - healAmount);
        }
    }

    public OnRoundsElapsed(amount: number): Status[] {
        const statusesToKeep: Status[] = [];
        this.statuses.forEach(status => {
            status.elapsed += amount;
            if (status.duration < 0 || status.elapsed <= status.duration) {
                statusesToKeep.push(status);
            }
        });
        return statusesToKeep;
    }

    public LogParseError(errorMessage: string): void {
        this.parseErrors.push(`${errorMessage} parsing failed`);
        this.parseSuccess = false;
    }
}

export class CharacterError {
    public error: boolean = true;
    public errorMessage: string;
    public parseErrors: string[];
    public parseWarnings: string[];
    public parseSuccess: boolean = false;

    constructor(errorMessage: string, parseErrors: string[] = [], parseWarnings: string[] = []) {
        this.errorMessage = errorMessage;
        this.parseErrors = parseErrors;
    }
}
