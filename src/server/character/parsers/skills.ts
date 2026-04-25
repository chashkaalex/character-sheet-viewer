import { SkillsAbilities, SkillsSynergyReversed, AbilityNames } from '../_constants';
import { ParserUtils } from '../parser_utils';
import { Skill } from '../property';
import { AbilitiesMap } from '../common_types';

/**
 * Parses skills from the character document.
 * @param skillsLines Lines containing skills information.
 * @param skills Array of Skill objects to populate.
 * @param abilities Map of character abilities.
 */
export function ParseSkills(skillsLines: string[], skills: Skill[], abilities: AbilitiesMap): void {
    skillsLines.forEach(line => {
        const basicSkillname = GetSkillNameFromLine(line);
        if (!basicSkillname) return; // Skip invalid or empty lines

        // Actual name should be the part of the line until '(ABILITY_NAME)'
        const skillAbilityName = AbilityNames.find(abilityName => line.includes(abilityName));
        if (!skillAbilityName) return;

        const name = line.substring(0, line.lastIndexOf('(' + skillAbilityName)).trim();

        const rank = ParserUtils.GetFirstNumberFromALine(line) || 0;

        const existingSkill = skills.find(s => s.name === name);
        if (existingSkill) {
            existingSkill.applyPermanentEffect(rank);
        } else {
            const thisSkillRelatedAbilityName = SkillsAbilities[basicSkillname];
            const ability = abilities[thisSkillRelatedAbilityName];
            if (ability) {
                skills.push(new Skill(name, rank, ability));
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

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = {
        ParseSkills
    };
}
