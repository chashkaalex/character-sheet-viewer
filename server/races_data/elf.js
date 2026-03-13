const { CreatureSize } = require('../character/property');
const { Sizes } = require('../_constants');
const { RacesData } = require('./_races_general_data');

const Elf = {
    get size() { return new CreatureSize(Sizes['Medium']); },
    speed: 30,
    effects: [
        { property: 'Special', description: 'Immunity to magic sleep effects.' },
        { property: 'Special', description: '+2 racial saving throw bonus against enchantment spells or effects.' },
        { property: 'Special', description: 'Low-Light Vision: An elf can see twice as far as a human in starlight, moonlight, torchlight, and similar conditions of poor illumination.' },
        { property: 'Special', description: 'Weapon Proficiency: Elves receive the Martial Weapon Proficiency feats for the longsword, rapier, longbow (including composite longbow), and shortbow (including composite shortbow) as bonus feats.' },
        { property: 'Listen', modifierType: 'Racial', value: 2 },
        { property: 'Search', modifierType: 'Racial', value: 2 },
        { property: 'Spot', modifierType: 'Racial', value: 2 },
        { property: 'Special', description: 'An elf who merely passes within 5 feet of a secret or concealed door is entitled to a Search check to notice it as if she were actively looking for it.' }
    ]
};

RacesData.set('Elf', Elf);

if (typeof module !== 'undefined') {
    module.exports = Elf;
}
