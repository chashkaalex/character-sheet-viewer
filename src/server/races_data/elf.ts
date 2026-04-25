import { CreatureSize } from '../character/property';
import { Sizes } from '../character/_constants';
import { RacesData } from './_races_general_data';
import { RaceData } from './race_types';

export const Elf: RaceData = {
    size: new CreatureSize(Sizes['Medium']),
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

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = Elf;
}
