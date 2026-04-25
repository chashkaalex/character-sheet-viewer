import { ParserUtils } from './parser_utils';
import {
  ModifiableProperty,
  CreatureSize,
  SpecialAttackBonus,
  ListOfSpecialProperties,
  AbilityBasedProperty,
  ArmorClass,
  Skill,
  Ability
} from './property';
import { SpellCasting } from './spells';
import { ParseAbilities } from './parsers/abilities';
import { Sizes, AbilityNames, SaveNames, SkillsAbilities, SpecialAttackNames } from './_constants';
import { BodySlots } from './items';
import { ParsePreparedSpellsFreeStyle } from './parsers/prepared_spells';
import { ParseSkills } from './parsers/skills';
import { ParseStatuses } from './parsers/statuses';
import { ParseFeats } from './parsers/feats';
import { ParseFlaws } from './parsers/flaws';
import { ParseWeapons } from './parsers/weapons';
import { ParseItems } from './parsers/items';
import { ParseRaceAndClasses, ApplyClassesEffects, ApplyRacesEffects } from './parsers/races_and_classes';
import { ICharacter } from './icharacter';
import { AbilitiesMap, CharacterClass } from './common_types';
import { Status } from './state';

declare let require: any;

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

// Ensure data files are loaded (side effects)
import '../races_data/dwarf';
import '../races_data/elf';
import '../races_data/human';
import '../races_data/half-elf';

import { RacesData } from '../races_data/_races_general_data';

import { ClassesData } from '../classes_data/_classes_general_data';

export class Character implements ICharacter {
    public docId: string;
    public lines: string[];
    public parseSuccess: boolean;
    public parseErrors: string[] = [];
    public parseWarnings: string[] = [];
    public sectionLines: Record<string, string[]>;
    public attackLine: string | null;
    public resistanceLine: string | null;
    public abilitiesLines: Record<string, string>;
    public name: string;
    public size: CreatureSize;
    public abilities: AbilitiesMap = {};
    public bodySlots: Map<string, number>;
    public spellCasting: SpellCasting;
    public race: string = '';
    public classes: CharacterClass[] = [];
    public skills: Skill[] = [];
    public statuses: Status[] = [];
    public feats: any[][] = [];
    public flaws: any[][] = [];
    public battleGear: any[] = [];
    public possessions: any[] = [];
    public domains: string[] = [];
    public bab: ModifiableProperty;
    public specialAttacks: Record<string, ModifiableProperty> = {};
    public resistances: string = '';
    public hp: { current: number; max: number };
    public HD: number = 0;
    public temporaryHp: number = 0;
    public damageBonus: ModifiableProperty;
    public weapons: any[] = [];
    public Special: ListOfSpecialProperties;
    public speed: ModifiableProperty;
    public partyName: string | null = null;
    public partyMembers: string[] = [];

    // Added during parsing
    public InitiativeBonus!: AbilityBasedProperty;
    public attacksOfOpportunity!: ModifiableProperty;
    public ac!: ArmorClass;
    public saves!: Record<string, AbilityBasedProperty>;
    public effectiveMonkLevel?: ModifiableProperty;

    constructor(lines: string[], docId: string = 'unknown') {
        this.docId = docId;
        this.lines = lines;

        const parseResult = ParserUtils.ParseDocLines(this.lines);
        this.sectionLines = parseResult.sectionLines;
        this.attackLine = parseResult.attackLine;
        this.resistanceLine = parseResult.resistanceLine;
        this.abilitiesLines = parseResult.abilitiesLines;
        this.parseSuccess = parseResult.success;

        if (parseResult.errors && parseResult.errors.length > 0) {
            this.parseErrors.push(...parseResult.errors);
        }

        this.name = this.lines[0];
        this.size = new CreatureSize(Sizes['Medium']);
        this.bodySlots = new Map(BodySlots.map(slot => [slot.slotName, slot.possibleAmount]));
        this.spellCasting = new SpellCasting();
        this.bab = new ModifiableProperty(0);
        this.hp = { current: 0, max: 0 };
        this.damageBonus = new ModifiableProperty(0);
        this.Special = new ListOfSpecialProperties();
        this.speed = new ModifiableProperty(0);
    }

    public ParseCharacter(): void {
        // Parsing Abilities
        this.abilities = ParseAbilities(this.abilitiesLines);

        // Parsing Party
        const partyLines = this.sectionLines['Parties Membership'];
        if (partyLines && partyLines.length > 0) {
            this.partyName = partyLines[0].trim();
        }

        // Parsing Resistances
        if (this.resistanceLine) {
            this.resistances = this.resistanceLine.split(':')[1].trim();
        }

        // Saves
        this.saves = {
            Fort: new AbilityBasedProperty('Fort', this.abilities.Con!),
            Ref: new AbilityBasedProperty('Ref', this.abilities.Dex!),
            Will: new AbilityBasedProperty('Will', this.abilities.Wis!)
        };

        // Attacks of opportunity
        this.attacksOfOpportunity = new ModifiableProperty(1);

        // Parsing Special Attacks
        this.specialAttacks['Trip'] = new SpecialAttackBonus(this.abilities.Str!, this.size);
        this.specialAttacks['Grapple'] = new SpecialAttackBonus(this.abilities.Str!, this.size);
        this.specialAttacks['Disarm'] = new ModifiableProperty(0);

        // Parsing Race and Classes
        ParseRaceAndClasses(this);

        // AC, must be done after race and classes are parsed
        const acAbilities: Ability[] = [];
        this.classes.forEach(c => {
            const classData = ClassesData.get(c.name);
            if (classData && classData.acAbilityName) {
                const ability = this.abilities[classData.acAbilityName as keyof AbilitiesMap];
                if (ability && !acAbilities.includes(ability)) {
                    acAbilities.push(ability);
                }
            }
        });
        this.ac = new ArmorClass(acAbilities, this.size);

        // Apply class effects
        ApplyClassesEffects(this);

        // Apply race effects
        ApplyRacesEffects(this);

        // Calculating Initiative
        this.InitiativeBonus = new AbilityBasedProperty('InitiativeBonus', this.abilities.Dex!);

        // Parsing HP and Speed (from line)
        const hpLine = this.lines.find(line => line.includes('Hp') && line.includes('Speed'));
        if (hpLine) {
            const hpPartOfTheLine = hpLine.substring(hpLine.indexOf('Hp'), hpLine.indexOf('Speed'));
            const hpDigits = hpPartOfTheLine.match(/\d+/g);
            if (hpDigits) {
                this.hp.current = Number(hpDigits[0]);
                this.hp.max = Number(hpDigits[1]);
            }
        } else {
            this.LogParseError('HP - no line found');
        }

        // Parsing Skills
        const skillsSectionLines = this.sectionLines['Skills'];
        if (skillsSectionLines) {
            ParseSkills(skillsSectionLines, this.skills, this.abilities);
        }

        // Parsing Items
        ParseItems(this);

        // Updating spell slots
        if (this.spellCasting.isActive()) {
            this.spellCasting.updateSpellsData();
        }

        // Determine caster types
        let hasSpontaneous = false;
        this.classes.forEach(c => {
            const classData = ClassesData.get(c.name);
            if (classData && classData.spellCastingData) {
                if (classData.spellCastingData.preparation === 'Spontaneous') {
                    hasSpontaneous = true;
                }
            }
        });

        if (this.spellCasting.isActive()) {
            const preparedSpells = ParsePreparedSpellsFreeStyle(this.sectionLines['Prepared Spells']);
            if (preparedSpells) {
                this.spellCasting.updatePreparedSpells(preparedSpells as any);
            }
        }

        if (hasSpontaneous) {
            const knownSpells = this.ParseKnownSpells();
            if (knownSpells) {
                this.spellCasting.updateKnownSpells(knownSpells as any);
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
    }

    public hasWeaponFinesse(): boolean {
        return this.Special.list.some(s => s.status === 'Weapon Finesse');
    }

    public ApplyEffect(effect: any, isPermanent: boolean = false): void {
        const propertyName = effect.property || 'Special';
        const propertyKey = propertyName + (effect.casterClassName ? ` ${effect.casterClassName}` : '');

        effect = this.ResolveEffectValue(effect);

        if (effect.value === 0 && !effect.description && effect.property) {
            return;
        }

        const affectedProperty = this.GetNamedProperty(propertyKey);
        if (affectedProperty) {
            if (effect.value !== undefined || effect.description) {
                isPermanent ? affectedProperty.applyPermanentEffect(effect.value) : affectedProperty.applyEffect(effect);
            }
        } else {
            this.parseWarnings.push(`Property ${propertyKey} for effect ${effect.status} not found`);
        }
    }

    public ResolveEffectValue(effect: any): any {
        if (typeof effect.value === 'function') {
            effect.value = effect.value(this);
        }
        return effect;
    }

    public GetNamedProperty(propertyName: string): any {
        if ((this as any)[propertyName]) {
            return (this as any)[propertyName];
        } else if ((AbilityNames as unknown as string[]).includes(propertyName)) {
            return this.abilities[propertyName as keyof AbilitiesMap];
        } else if ((SaveNames as unknown as string[]).includes(propertyName)) {
            return (this.saves as any)[propertyName];
        } else if (SkillsAbilities[propertyName]) {
            let skill = this.skills.find(s => s.name === propertyName);
            if (!skill) {
                const abilityName = SkillsAbilities[propertyName];
                skill = new Skill(propertyName, 0, this.abilities[abilityName as keyof AbilitiesMap]!);
                this.skills.push(skill);
            }
            return skill;
        } else if ((SpecialAttackNames as unknown as string[]).includes(propertyName)) {
            return this.specialAttacks[propertyName];
        } else if (propertyName.includes('casterLevel')) {
            const casterClassName = propertyName.split(' ')[1];
            return this.spellCasting.GetCasterLevel(casterClassName);
        } else if (propertyName === 'effectiveMonkLevel') {
            this.effectiveMonkLevel = new ModifiableProperty(0);
            return this.effectiveMonkLevel;
        } else {
            this.parseWarnings.push(`Property ${propertyName} not found`);
            return null;
        }
    }

    public static ValidatePreparedSpell(casterClassName: string, spellLevel: number, spellLevelName: string, spellName: string, domains: string[]): boolean {
        if (typeof spellName === 'string' && spellName.toLowerCase().startsWith('spontaneous')) {
            return true;
        }

        const classData = ClassesData.get(casterClassName);
        if (!classData || !classData.spellCastingData || !classData.spellCastingData.spells) {
            return true;
        }

        const casterClassSpells = classData.spellCastingData.spells;
        const correctSpells: string[] = [];
        if (spellLevelName.includes('domain')) {
            domains.forEach(domain => {
                if (casterClassSpells.domainSpells && casterClassSpells.domainSpells[domain]) {
                    correctSpells.push(...casterClassSpells.domainSpells[domain].slice(0, spellLevel));
                }
            });
        } else {
            for (let level = 0; level <= spellLevel; level++) {
                if (casterClassSpells[level]) {
                    correctSpells.push(...casterClassSpells[level]);
                }
            }
        }
        return correctSpells.includes(spellName);
    }

    public ParseKnownSpells(): any {
        const sectionName = 'Spells Known';
        const knownSpellsLines = this.sectionLines[sectionName];

        if (!knownSpellsLines) return null;

        const knownSpellsItems = knownSpellsLines.map(line => ({ text: line, item: null }));

        if (knownSpellsLines && knownSpellsLines.length > 0 && this.spellCasting.isActive()) {
            let defaultCasterClass = '';
            this.classes.forEach(c => {
                const classData = ClassesData.get(c.name);
                if (classData && classData.spellCastingData && classData.spellCastingData.preparation === 'Spontaneous') {
                    defaultCasterClass = classData.spellCastingData.casterClass;
                }
            });

            const knownSpells = ParserUtils.ParsePreparedSpellsStructure(
                knownSpellsItems,
                this.domains,
                () => true,
                defaultCasterClass
            );
            return knownSpells;
        }
        return null;
    }

    public InflictDamage(amount: number): void {
        if (this.temporaryHp > 0) {
            if (this.temporaryHp >= amount) {
                this.temporaryHp -= amount;
                return;
            } else {
                amount -= this.temporaryHp;
                this.temporaryHp = 0;
            }
        }
        this.hp.current = Math.max(0, this.hp.current - amount);
    }

    public CureDamage(amount: number): void {
        this.hp.current = Math.min(this.hp.max, this.hp.current + amount);
    }

    public OnRoundsElapsed(amount: number): Status[] {
        const statusesToKeep: Status[] = [];
        this.statuses.forEach(status => {
            status.elapsed += amount;
            if (status.elapsed <= status.duration) {
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
        this.parseWarnings = parseWarnings;
    }
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = {
        Character,
        CharacterError
    };
}
