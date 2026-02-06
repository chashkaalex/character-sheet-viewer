/**
 * Map of classes data
 * @type {Map<string, Object>}
 */

const ClassesData = new Map();

if (typeof module !== 'undefined') {
  module.exports = { ClassesData };
}

// class ClassData {
//     constructor(name, HD, skills, levelTable, spellCasting) {
//         this.name = name;
//         this.HD = HD;
//         this.skills = skills;
//         this.levelTable = levelTable;
//     }
// }

// class SpellCasterClassData extends ClassData {
//     constructor(name, HD, skills, levelTable, spellCasting) {
//         super(name, HD, skills, levelTable);
//         this.spellCasting = spellCasting;
//     }
// }
