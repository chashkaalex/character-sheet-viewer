import { BaseEffect } from './state';
import { ApplicableEffectData } from './_general_effects';

export const StatusRelatedValue = (character: any, statusName: string, value: number): number => {
  return character.statuses && character.statuses.some((s: any) => s.name === statusName) ? value : 0;
};

export type FeatEffect = BaseEffect | ApplicableEffectData;

/**
 * @type {Object.<string, FeatEffect[]>}
 */
export const FeatEffects: Record<string, FeatEffect[]> = {
  'Acrobatic': [
    { status: 'Acrobatic', property: 'Jump', modifierType: 'Generic', value: 2 },
    { status: 'Acrobatic', property: 'Tumble', modifierType: 'Generic', value: 2 }
  ],
  'Agile': [
    { status: 'Agile', property: 'Balance', modifierType: 'Generic', value: 2 },
    { status: 'Agile', property: 'Escape Artist', modifierType: 'Generic', value: 2 }
  ],
  'Alertness': [
    { status: 'Alertness', property: 'Listen', modifierType: 'Generic', value: 2 },
    { status: 'Alertness', property: 'Spot', modifierType: 'Generic', value: 2 }
  ],
  'Animal Affinity': [
    { status: 'Animal Affinity', property: 'Handle Animal', modifierType: 'Generic', value: 2 },
    { status: 'Animal Affinity', property: 'Ride', modifierType: 'Generic', value: 2 }
  ],
  'Armor Proficiency (Light)': [
    { status: 'Armor Proficiency (Light)', description: 'Allows use of light armor without incurring nonproficiency penalties on attack rolls and all Strength-based and Dexterity-based ability and skill checks [1, 2].' }
  ],
  'Armor Proficiency (Medium)': [
    { status: 'Armor Proficiency (Medium)', description: 'Allows use of medium armor without incurring nonproficiency penalties on attack rolls and all Strength-based and Dexterity-based ability and skill checks [1, 2].' }
  ],
  'Armor Proficiency (Heavy)': [
    { status: 'Armor Proficiency (Heavy)', description: 'Allows use of heavy armor without incurring nonproficiency penalties on attack rolls and all Strength-based and Dexterity-based ability and skill checks [1, 2].' }
  ],
  'Athletic': [
    { status: 'Athletic', property: 'Climb', modifierType: 'Generic', value: 2 },
    { status: 'Athletic', property: 'Swim', modifierType: 'Generic', value: 2 }
  ],
  'Augment Summoning': [
    { status: 'Augment Summoning', property: 'Summoned Creatures Strength', modifierType: 'Enhancement', value: 4 },
    { status: 'Augment Summoning', property: 'Summoned Creatures Constitution', modifierType: 'Enhancement', value: 4 }
  ],
  'Blind-Fight': [
    { status: 'Blind-Fight', description: 'Reroll miss chance for concealment [3].' }
  ],
  'Cleave': [
    { status: 'Cleave', description: 'When making a single attack with a melee weapon, you can make a second attack against a different opponent within your reach [3].' }
  ],
  'Combat Casting': [
    {
      status: 'Combat Casting',
      property: 'Concentration',
      modifierType: 'Generic',
      value: (character: any) => StatusRelatedValue(character, 'Casting Defensively', 4)
    }
  ],
  'Combat Expertise': [
    { status: 'Combat Expertise', description: 'As a standard or full attack action in melee, you can take a penalty of up to -5 on attack rolls and add the same number as a dodge bonus to Armor Class [4].' }
  ],
  'Combat Reflexes': [
    {
      status: 'Combat Reflexes',
      property: 'attacksOfOpportunity',
      modifierType: 'Generic',
      value: (character: any) => character.abilities.Dex.modifier
    }
  ],
  'Deceitful': [
    { status: 'Deceitful', property: 'Disguise', modifierType: 'Generic', value: 2 },
    { status: 'Deceitful', property: 'Forgery', modifierType: 'Generic', value: 2 }
  ],
  'Deft Hands': [
    { status: 'Deft Hands', property: 'Sleight of Hand', modifierType: 'Generic', value: 2 },
    { status: 'Deft Hands', property: 'Use Rope', modifierType: 'Generic', value: 2 }
  ],
  'Diehard': [
    { status: 'Diehard', description: 'Remain conscious and act normally (except for charge or run) when reduced to between -1 and -9 hit points [8].' }
  ],
  'Diligent': [
    { status: 'Diligent', property: 'Appraise', modifierType: 'Generic', value: 2 },
    { status: 'Diligent', property: 'Decipher Script', modifierType: 'Generic', value: 2 }
  ],
  'Dodge': [
    { status: 'Dodge', property: 'AC (against selected opponent)', modifierType: 'Dodge', value: 1 }
  ],
  'Dragon Hunter': [
    {
      status: 'Dragon Hunter',
      property: 'ac',
      modifierType: 'Dodge',
      value: (character: any) => StatusRelatedValue(character, 'Fighting Dragon', 2)
    }
  ],
  'Dragonfoe': [
    {
      status: 'Dragonfoe',
      property: 'bab',
      modifierType: 'Generic',
      value: (character: any) => StatusRelatedValue(character, 'Fighting Dragon', 2)
    },
    { status: 'Dragonfoe', description: '+2 bonus on caster level checks made to overcome a dragon\'s spell resistance.' },
    { status: 'Dragonfoe', description: 'Dragons take a —2 penalty on saving throws against your spells, spell-like abilities, and supernatural abilities.' }
  ],
  'Endurance': [
    { status: 'Endurance', property: 'Checks/Saves (resist nonlethal damage)', modifierType: 'Generic', value: 4 }
  ],
  'Eschew Materials': [
    { status: 'Eschew Materials', description: 'Cast spells without material components that have negligible cost [9, 10].' }
  ],
  'Exotic Weapon Proficiency': [
    {
      status: 'Exotic Weapon Proficiency',
      property: 'Attack Rolls (specific exotic weapon)',
      modifierType: 'Generic',
      value: 0,
      description: 'Removes the -4 nonproficiency penalty when using the selected exotic weapon [11]. This feat can be gained multiple times for different weapons [12].'
    }
  ],
  'Extra Turning': [
    {
      status: 'Extra Turning',
      property: 'TurnRebukes',
      modifierType: 'Generic',
      value: 4,
      description: 'You can use your ability to turn or rebuke creatures four more times per day [13]. This feat can be gained multiple times [14].'
    }
  ],
  'Far Shot': [
    {
      status: 'Far Shot',
      description: 'When you use a projectile weapon, such as a bow, its range increment increases by one-half (multiply by 1½). When you use a thrown weapon, its range increment is doubled.'
    }
  ],
  'Great Fortitude': [
    { status: 'Great Fortitude', property: 'Fort', modifierType: 'Generic', value: 2 }
  ],
  'Improved Bull Rush': [
    { status: 'Improved Bull Rush', property: 'Bull Rush', modifierType: 'Generic', value: 4 }
  ],
  'Improved Counterspell': [
    { status: 'Improved Counterspell', description: 'When counterspelling, you may use a spell of the same school that is one or more spell levels higher than the target spell [15].' }
  ],
  'Improved Critical': [
    { status: 'Improved Critical', description: 'Doubles the threat range of the selected weapon. This effect does not stack with other effects that expand the threat range [15, 16]. This feat can be gained multiple times for different weapons [16].' }
  ],
  'Improved Disarm': [
    { status: 'Improved Disarm', property: 'Disarm', modifierType: 'Generic', value: 4 },
    { status: 'Improved Disarm', description: 'You do not provoke an attack of opportunity when you disarm an opponent [19].' }
  ],
  'Improved Feint': [
    { status: 'Improved Feint', description: 'You can make a Bluff check to feint in combat as a move action [20].' }
  ],
  'Improved Grapple': [
    { status: 'Improved Grapple', property: 'Grapple', modifierType: 'Generic', value: 4 },
    { status: 'Improved Grapple', description: 'You do not provoke an attack of opportunity when you initiate a grapple [20].' }
  ],
  'Improved Initiative': [
    { status: 'Improved Initiative', property: 'InitiativeBonus', modifierType: 'Generic', value: 4 }
  ],
  'Improved Overrun': [
    { status: 'Improved Overrun', property: 'Overrun', modifierType: 'Generic', value: 4 },
    { status: 'Improved Overrun', description: 'The target may not choose to avoid you.' }
  ],
  'Improved Turning': [
    { status: 'Improved Turning', property: 'Turning Checks (effective level)', modifierType: 'Generic', value: 1 }
  ],
  'Improved Unarmed Strike': [
    { status: 'Improved Unarmed Strike', description: 'Your unarmed strikes are considered armed, allowing you to deal lethal or nonlethal damage at your option, and do not provoke attacks of opportunity [9, 17, 18].' }
  ],
  'Improved Trip': [
    { status: 'Improved Trip', property: 'Trip', modifierType: 'Generic', value: 4 },
    { status: 'Improved Trip', description: 'You do not provoke an attack of opportunity when you attempt to trip an opponent [19].' }
  ],
  'Whirlwind Attack': [
    { status: 'Whirlwind Attack', description: 'Make one melee attack against each opponent within your reach [19].' }
  ],
  'Deflect Arrows': [
    { status: 'Deflect Arrows', description: 'Once per round, when you would normally be hit with a ranged weapon, you may deflect it to take no damage (requires at least one free hand and not being flat-footed) [21].' }
  ],
  'Snatch Arrows': [
    { status: 'Snatch Arrows', description: 'When using Deflect Arrows, you may catch the weapon. Thrown weapons can be immediately thrown back or kept [22].' }
  ],
  'Stunning Fist': [
    { status: 'Stunning Fist', description: 'Forces a foe damaged by your unarmed attack to make a Fortitude saving throw (DC 10 + 1/2 your character level + your Wisdom modifier) or be stunned for 1 round. Usable once per day for every four levels you have attained (Monks have additional uses) [23].' }
  ],
  'Investigator': [
    { status: 'Investigator', property: 'Gather Information', modifierType: 'Generic', value: 2 },
    { status: 'Investigator', property: 'Search', modifierType: 'Generic', value: 2 }
  ],
  'Iron Will': [
    { status: 'Iron Will', property: 'Will', modifierType: 'Generic', value: 2 }
  ],
  'Leadership': [
    { status: 'Leadership', description: 'Attract a cohort and followers [24, 25].' }
  ],
  'Lightning Reflexes': [
    { status: 'Lightning Reflexes', property: 'Reflex Saves', modifierType: 'Generic', value: 2 }
  ],
  'Magical Aptitude': [
    { status: 'Magical Aptitude', property: 'Spellcraft', modifierType: 'Generic', value: 2 },
    { status: 'Magical Aptitude', property: 'Use Magic Device', modifierType: 'Generic', value: 2 }
  ],
  'Martial Weapon Proficiency': [
    { status: 'Martial Weapon Proficiency', property: 'Attack Rolls (specific martial weapon)', modifierType: 'Generic', value: 0, description: 'Removes the –4 nonproficiency penalty when using the selected martial weapon [26]. This feat can be gained multiple times for different weapons [27].' }
  ],
  'Mobility': [
    { status: 'Mobility', property: 'AC (against attacks of opportunity from selected opponent)', modifierType: 'Dodge', value: 4, description: 'Against attacks of opportunity provoked by moving out of a threatened square from the opponent you designated with the Dodge feat [6].' }
  ],
  'Mounted Combat': [
    { status: 'Mounted Combat', description: 'You can make a Ride check (as a reaction) to negate a hit on your mount if your Ride check result is greater than the opponent’s attack roll [6, 28].' }
  ],
  'Mounted Archery': [
    { status: 'Mounted Archery', description: 'Reduces the penalties for making ranged attacks while mounted by half [29].' }
  ],
  'Ride-By Attack': [
    { status: 'Ride-By Attack', description: 'Move before and after a mounted charge [29].' }
  ],
  'Spirited Charge': [
    { status: 'Spirited Charge', description: 'When mounted and using the charge action, you deal double damage with a melee weapon (or triple damage with a lance) [7].' }
  ],
  'Trample': [
    { status: 'Trample', description: 'Your mounted opponent cannot avoid your overrun attempt [29].' }
  ],
  'Natural Spell': [
    { status: 'Natural Spell', description: 'Cast spells while in wild shape [28, 29].' }
  ],
  'Negotiator': [
    { status: 'Negotiator', property: 'Diplomacy', modifierType: 'Generic', value: 2 },
    { status: 'Negotiator', property: 'Sense Motive', modifierType: 'Generic', value: 2 }
  ],
  'Nimble Fingers': [
    { status: 'Nimble Fingers', property: 'Disable Device', modifierType: 'Generic', value: 2 },
    { status: 'Nimble Fingers', property: 'Open Lock', modifierType: 'Generic', value: 2 }
  ],
  'Nymph\'s Kiss': [
    { status: 'Nymph\'s Kiss', property: 'Diplomacy', modifierType: 'Circumstance', value: 2 },
    { status: 'Nymph\'s Kiss', property: 'Intimidate', modifierType: 'Circumstance', value: 2 },
    { status: 'Nymph\'s Kiss', property: 'Gather Information', modifierType: 'Circumstance', value: 2 },
    { status: 'Nymph\'s Kiss', property: 'Bluff', modifierType: 'Circumstance', value: 2 },
    { status: 'Nymph\'s Kiss', property: 'Use Magic Device', modifierType: 'Circumstance', value: 2 },
    { status: 'Nymph\'s Kiss', property: 'Disguise', modifierType: 'Circumstance', value: 2 }
  ],
  'Persuasive': [
    { status: 'Persuasive', property: 'Bluff', modifierType: 'Generic', value: 2 },
    { status: 'Persuasive', property: 'Intimidate', modifierType: 'Generic', value: 2 }
  ],
  'Point Blank Shot': [
    { status: 'Point Blank Shot', property: 'Ranged Attack Rolls (within 30 ft.)', modifierType: 'Generic', value: 1 },
    { status: 'Point Blank Shot', property: 'Ranged Damage Rolls (within 30 ft.)', modifierType: 'Generic', value: 1 }
  ],
  'Power Attack': [
    { status: 'Power Attack', description: 'On your action, you may choose to subtract a number (up to your base attack bonus) from all melee attack rolls and add the same number to all melee damage rolls. If attacking with a two-handed weapon, or a one-handed weapon in two hands, add twice the number to damage. Cannot add bonus to damage with a light weapon (except unarmed/natural attacks) [30].' }
  ],
  'Precise Shot': [
    { status: 'Precise Shot', description: 'You can shoot or throw ranged weapons at an opponent engaged in melee without taking the standard -4 penalty on your attack roll [31].' }
  ],
  'Practiced Spellcaster': [
    {
      status: 'Practiced Spellcaster',
      property: 'casterLevel',
      casterClassName: '',
      modifierType: 'Competence',
      value: (character: any) => {
        const practicedSpellcasterFeat = character.feats.find((feat: any) => {
          return feat.some((effect: any) => effect.status === 'Practiced Spellcaster');
        });
        const practicedSpellcasterClassName = practicedSpellcasterFeat.casterClassName;

        const classLevel = character.classes.find((cls: any) => cls.className === practicedSpellcasterClassName).level;
        if (classLevel + 4 >= character.HD) {
          return (character.HD - classLevel);
        }
        return 4;
      }
    }
  ],
  'Quick Draw': [
    { status: 'Quick Draw', description: 'Draw a weapon as a free action. Draw a hidden weapon as a move action. Throw weapons at your full normal rate of attacks [31, 32].' }
  ],
  'Rapid Reload': [
    { status: 'Rapid Reload', description: 'Reload a crossbow more quickly [33].' }
  ],
  'Run': [
    { status: 'Run', description: 'When running, you move five times your normal speed (instead of four times for light/medium load or three times for heavy load) [33, 34].' },
    { status: 'Run', property: 'Jump Checks (running start)', modifierType: 'Generic', value: 4 }
  ],
  'Self-Sufficient': [
    { status: 'Self-Sufficient', property: 'Heal', modifierType: 'Generic', value: 2 },
    { status: 'Self-Sufficient', property: 'Survival', modifierType: 'Generic', value: 2 }
  ],
  'Shield Proficiency': [
    { status: 'Shield Proficiency', description: 'Allows use of bucklers, small shields, and large shields without incurring nonproficiency penalties on attack rolls and all Strength-based and Dexterity-based ability and skill checks [2, 35].' }
  ],
  'Spring Attack': [
    { status: 'Spring Attack', description: 'Move before and after a single melee attack [7].' }
  ],
  'Improved Shield Bash': [
    { status: 'Improved Shield Bash', description: 'Retain your shield\'s shield bonus to your AC when you perform a shield bash [36].' }
  ],
  'Improved Natural Attack': [
    { status: 'Improved Natural Attack', description: 'Your natural weapon deals more damage [48].' }
  ],
  'Tower Shield Proficiency': [
    { status: 'Tower Shield Proficiency', description: 'Allows use of tower shields without incurring nonproficiency penalties on attack rolls and all Strength-based and Dexterity-based ability and skill checks [2, 37].' }
  ],
  'Simple Weapon Proficiency': [
    { status: 'Simple Weapon Proficiency', property: 'Attack Rolls (simple weapons)', modifierType: 'Generic', value: 0, description: 'Removes the -4 nonproficiency penalty when using simple weapons [38].' }
  ],
  'Skill Focus': [
    { status: 'Skill Focus', property: 'Skill Checks (selected skill)', modifierType: 'Generic', value: 3, description: 'You get a +3 bonus on all checks involving the selected skill. This feat can be gained multiple times for different skills [22].' }
  ],
  'Spell Focus': [
    { status: 'Spell Focus', property: 'Save DCs (against specific school of magic)', modifierType: 'Generic', value: 1, description: 'Add +1 to the Difficulty Class for all saving throws against spells from the selected school of magic. This feat can be gained multiple times for different schools [39].' }
  ],
  'Greater Spell Focus': [
    { status: 'Greater Spell Focus', property: 'Save DCs (against specific school of magic)', modifierType: 'Generic', value: 1, description: 'Add +1 to the Difficulty Class for all saving throws against spells from the selected school of magic. This bonus stacks with Spell Focus [40]. This feat can be gained multiple times for different schools [40].' }
  ],
  'Spell Mastery': [
    { status: 'Spell Mastery', description: 'You can prepare some spells without a spellbook [41].' }
  ],
  'Spell Penetration': [
    { status: 'Spell Penetration', property: 'Caster Level Checks (to defeat spell resistance)', modifierType: 'Generic', value: 2 }
  ],
  'Greater Spell Penetration': [
    { status: 'Greater Spell Penetration', property: 'Caster Level Checks (to defeat spell resistance)', modifierType: 'Generic', value: 2, description: 'This bonus stacks with the one from Spell Penetration [42].' }
  ],
  'Stealthy': [
    { status: 'Stealthy', property: 'Hide', modifierType: 'Generic', value: 2 },
    { status: 'Stealthy', property: 'Move Silently', modifierType: 'Generic', value: 2 }
  ],
  'Superior Unarmed Strike': [
    { status: 'Superior Unarmed Strike', description: 'Your unarmed strikes deal more damage [48].' }
  ],
  'Toughness': [
    { status: 'Toughness', property: 'Hit Points', modifierType: 'Generic', value: 3, description: 'You gain +3 hit points. This feat can be gained multiple times, and its effects stack [37, 43].' }
  ],
  'Track': [
    { status: 'Track', description: 'You can use the Survival skill to track creatures [41].' }
  ],
  'Two-Weapon Fighting': [
    { status: 'Two-Weapon Fighting', description: 'Reduce the attack penalties for fighting with two weapons [41].' }
  ],
  'Two-Weapon Defense': [
    { status: 'Two-Weapon Defense', property: 'ac', modifierType: 'Shield', value: 1 }
  ],
  'Improved Two-Weapon Fighting': [
    { status: 'Improved Two-Weapon Fighting', description: 'You get a second attack with your off-hand weapon [44].' }
  ],
  'Greater Two-Weapon Fighting': [
    { status: 'Greater Two-Weapon Fighting', description: 'You get a third attack with your off-hand weapon [42, 44].' }
  ],
  'Weapon Finesse': [
    { status: 'Weapon Finesse', description: 'You may use your Dexterity modifier instead of your Strength modifier on attack rolls [45].' }
  ],
  'Weapon Focus': [
    { status: 'Weapon Focus', description: 'You gain a +1 bonus on all attack rolls you make using the selected weapon. This feat can be gained multiple times for different weapons [46].' }
  ],
  'Weapon Specialization': [
    { status: 'Weapon Specialization', property: 'Damage Rolls (selected weapon)', modifierType: 'Generic', value: 2, description: 'You gain a +2 bonus on all damage rolls you make using the selected weapon. This feat can be gained multiple times for different weapons [47].' }
  ],
  'Greater Weapon Focus': [
    { status: 'Greater Weapon Focus', property: 'Attack Rolls (selected weapon)', modifierType: 'Generic', value: 1, description: 'You gain a +1 bonus on all attack rolls you make using the selected weapon. This bonus stacks with other bonuses on attack rolls, including the one from Weapon Focus [40]. This feat can be gained multiple times for different weapons [40].' }
  ],
  'Greater Weapon Specialization': [
    { status: 'Greater Weapon Specialization', property: 'Damage Rolls (selected weapon)', modifierType: 'Generic', value: 2, description: 'You gain a +2 bonus on all damage rolls you make using the selected weapon. This bonus stacks with other bonuses on damage rolls, including the one from Weapon Specialization [48]. This feat can be gained multiple times for different weapons [48].' }
  ],
  'Empower Spell': [
    { status: 'Empower Spell', description: 'All variable, numeric effects of an empowered spell are increased by one-half. Uses a spell slot two levels higher [49].' }
  ],
  'Enlarge Spell': [
    { status: 'Enlarge Spell', description: 'An enlarged spell has its range doubled. Uses a spell slot one level higher [50].' }
  ],
  'Extend Spell': [
    { status: 'Extend Spell', description: 'An extended spell lasts twice as long as normal. Uses a spell slot one level higher [12].' }
  ],
  'Heighten Spell': [
    { status: 'Heighten Spell', description: 'A heightened spell has a higher spell level than normal (up to a maximum of 9th level), increasing all effects dependent on spell level. Is prepared and cast as a spell of its effective level [51].' }
  ],
  'Maximize Spell': [
    { status: 'Maximize Spell', description: 'All variable, numeric effects of a maximized spell are maximized. Uses a spell slot three levels higher [52].' }
  ],
  'Quicken Spell': [
    { status: 'Quicken Spell', description: 'Cast a spell as a free action. Uses a spell slot four levels higher. Does not provoke an attack of opportunity [53, 54].' }
  ],
  'Silent Spell': [
    { status: 'Silent Spell', description: 'A silent spell can be cast with no verbal components. Uses a spell slot one level higher [55].' }
  ],
  'Still Spell': [
    { status: 'Still Spell', description: 'A stilled spell can be cast with no somatic components. Uses a spell slot one level higher [56].' }
  ],
  'Widen Spell': [
    { status: 'Widen Spell', description: 'An area spell\'s area is doubled. Uses a spell slot three levels higher [57].' }
  ],
  'Brew Potion': [
    { status: 'Brew Potion', description: 'You can create a potion of any 3rd-level or lower spell that you know and that targets one or more creatures (Caster Level 3rd prerequisite) [3].' }
  ],
  'Craft Magic Arms and Armor': [
    { status: 'Craft Magic Arms and Armor', description: 'You can create any magic weapon, armor, or shield whose prerequisites you meet (Caster Level 5th prerequisite) [58].' }
  ],
  'Craft Rod': [
    { status: 'Craft Rod', description: 'You can create any rod whose prerequisites you meet (Caster Level 9th prerequisite) [59].' }
  ],
  'Craft Staff': [
    { status: 'Craft Staff', description: 'You can create any staff whose prerequisites you meet (Caster Level 12th prerequisite) [60].' }
  ],
  'Craft Wand': [
    { status: 'Craft Wand', description: 'You can create a wand of any 4th-level or lower spell that you know (Caster Level 5th prerequisite) [61].' }
  ],
  'Craft Wondrous Item': [
    { status: 'Craft Wondrous Item', description: 'You can create any wondrous item whose prerequisites you meet (Caster Level 3rd prerequisite) [61].' }
  ],
  'Forge Ring': [
    { status: 'Forge Ring', description: 'You can create any ring whose prerequisites you meet (Caster Level 12th prerequisite) [62].' }
  ],
  'Scribe Scroll': [
    { status: 'Scribe Scroll', description: 'You can create a scroll of any spell that you know or have in your spellbook (Caster Level 1st prerequisite) [32, 35].' }
  ]
};

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = {
    FeatEffects,
    StatusRelatedValue
  };
}
