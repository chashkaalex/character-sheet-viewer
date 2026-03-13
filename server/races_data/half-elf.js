const { CreatureSize } = require('../character/property');
const { Sizes } = require('../_constants');
const { RacesData } = require('./_races_general_data');

const HalfElf = {
    get size() { return new CreatureSize(Sizes['Medium']); },
    speed: 30,
    effects: [
        { property: 'Special', description: 'Immunity to sleep spells and similar magical effects.' },
        { property: 'Special', description: '+2 racial bonus on saving throws against enchantment spells or effects.' },
        { property: 'Special', description: 'Low-Light Vision: A half-elf can see twice as far as a human in starlight, moonlight, torchlight, and similar conditions of poor illumination.' },
        { property: 'Special', description: 'Elven Blood: For all effects related to race, a half-elf is considered an elf.' },
        { property: 'Listen', modifierType: 'Racial', value: 1 },
        { property: 'Search', modifierType: 'Racial', value: 1 },
        { property: 'Spot', modifierType: 'Racial', value: 1 },
        { property: 'Diplomacy', modifierType: 'Racial', value: 2 },
        { property: 'Gather Information', modifierType: 'Racial', value: 2 }
    ]
};

RacesData.set('Half-Elf', HalfElf);

if (typeof module !== 'undefined') {
    module.exports = HalfElf;
}
