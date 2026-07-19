import { GetFirstNumberFromALine } from '../parser_utils';
import { ModifiableProperty } from '../00_property';
import { AbilityName, AbilityNames, AbilitiesMap } from './abilities/ability_types';
import type { Ability } from './abilities/ability';

export const SkillsAbilities: Record<string, AbilityName | 'None'> = {
  'Appraise': 'Int',
  'Balance': 'Dex',
  'Bluff': 'Cha',
  'Climb': 'Str',
  'Concentration': 'Con',
  'Craft': 'Int',
  'Decipher Script': 'Int',
  'Diplomacy': 'Cha',
  'Disable Device': 'Int',
  'Disguise': 'Cha',
  'Escape Artist': 'Dex',
  'Forgery': 'Int',
  'Gather Information': 'Cha',
  'Handle Animal': 'Cha',
  'Heal': 'Wis',
  'Hide': 'Dex',
  'Intimidate': 'Cha',
  'Jump': 'Str',
  'Knowledge (arcana)': 'Int',
  'Knowledge (architecture and engineering)': 'Int',
  'Knowledge (dungeoneering)': 'Int',
  'Knowledge (geography)': 'Int',
  'Knowledge (history)': 'Int',
  'Knowledge (local)': 'Int',
  'Knowledge (nature)': 'Int',
  'Knowledge (nobility and royalty)': 'Int',
  'Knowledge (religion)': 'Int',
  'Knowledge (the planes)': 'Int',
  'Listen': 'Wis',
  'Move Silently': 'Dex',
  'Open Lock': 'Dex',
  'Perform': 'Cha',
  'Profession': 'Wis',
  'Ride': 'Dex',
  'Search': 'Int',
  'Sense Motive': 'Wis',
  'Sleight of Hand': 'Dex',
  'Speak Language': 'None',
  'Spellcraft': 'Int',
  'Spot': 'Wis',
  'Survival': 'Wis',
  'Swim': 'Str',
  'Tumble': 'Dex',
  'Use Magic Device': 'Cha',
  'Use Rope': 'Dex'
} as const;

export const SkillsSynergyReversed: Record<string, string[]> = {
  'Appraise': ['Craft'],
  'Balance': ['Tumble'],
  'Climb': ['Use Rope'],
  'Diplomacy': [
    'Bluff',
    'Knowledge (nobility and royalty)',
    'Sense Motive'
  ],
  'Disguise': ['Bluff'],
  'Escape Artist': ['Use Rope'],
  'Gather Information': ['Knowledge (local)'],
  'Intimidate': ['Bluff'],
  'Jump': ['Tumble'],
  'Knowledge (nature)': ['Survival'],
  'Ride': ['Handle Animal'],
  'Search': ['Knowledge (architecture and engineering)'],
  'Sleight of Hand': ['Bluff'],
  'Spellcraft': [
    'Knowledge (arcana)',
    'Use Magic Device'
  ],
  'Survival': [
    'Knowledge (dungeoneering)',
    'Knowledge (geography)',
    'Knowledge (nature)',
    'Knowledge (the planes)',
    'Search'
  ],
  'Tumble': ['Jump'],
  'Use Magic Device': [
    'Decipher Script',
    'Spellcraft'
  ],
  'Use Rope': ['Escape Artist']
} as const;

export class Skill extends ModifiableProperty {
  public name: string;
  public ability: Ability;
  public synergySkills: Skill[];
  public acp?: ModifiableProperty;

  constructor(name: string, rank: number, ability: Ability, acp?: ModifiableProperty) {
    super(rank, name);
    this.name = name;
    this.ability = ability;
    this.synergySkills = [];
    this.acp = acp;
  }

  public get bonus(): number {
    let val = this.ability.modifier + this.currentScore + this.synergySkills.reduce((acc, skill) => acc + (skill.currentScore >= 5 ? 2 : 0), 0);
    if (this.acp && (this.ability.name === 'Str' || this.ability.name === 'Dex')) {
      const penalty = this.acp.currentScore;
      if (penalty < 0) {
        val += (this.name === 'Swim') ? 2 * penalty : penalty;
      }
    }
    return val;
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

/**
 * Parses skills from the character document.
 * @param skillsLines Lines containing skills information.
 * @param abilities Map of character abilities.
 * @returns Array of Skill objects.
 */
export function ParseSkills(skillsLines: string[], abilities: AbilitiesMap, acp?: ModifiableProperty): Skill[] {
    const skills: Skill[] = [];

    skillsLines.forEach(line => {
        const basicSkillname = GetSkillNameFromLine(line);
        if (!basicSkillname) return; // Skip invalid or empty lines

        // Actual name should be the part of the line until '(ABILITY_NAME)'
        const skillAbilityName = AbilityNames.find(abilityName => line.includes(abilityName));
        if (!skillAbilityName) return;

        const name = line.substring(0, line.lastIndexOf('(' + skillAbilityName)).trim();

        const rank = GetFirstNumberFromALine(line) || 0;

        const existingSkill = skills.find(s => s.name === name);
        if (existingSkill) {
            existingSkill.applyPermanentEffect(rank);
        } else {
            const thisSkillRelatedAbilityName = SkillsAbilities[basicSkillname];
            const ability = abilities[thisSkillRelatedAbilityName];
            if (ability) {
                skills.push(new Skill(name, rank, ability, acp));
            }
        }
    });

    skills.forEach(skill => {
        const synergySkillsNames = SkillsSynergyReversed[skill.name];
        if (synergySkillsNames) {
            synergySkillsNames.forEach(synergySkillName => {
                const synergySkill = skills.find(s => s.name === synergySkillName);
                if (synergySkill && !skill.synergySkills.some(s => s.name === synergySkill.name)) {
                    skill.synergySkills.push(synergySkill);
                }
            });
        }
    });

    return skills;
}

/**
 * Gets skill name from a line.
 * @param line - The input line.
 * @returns The skill name or null.
 */
export function GetSkillNameFromLine(line: string): string | null {
    let skillName: string | null = null;
    for (const key of Object.keys(SkillsAbilities)) {
        if (line.toLowerCase().startsWith(key.toLowerCase())) {
            skillName = key;
            break;
        }
    }
    return skillName;
}
