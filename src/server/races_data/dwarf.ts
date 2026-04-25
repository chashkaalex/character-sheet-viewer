import { CreatureSize } from '../character/property';
import { Sizes } from '../character/_constants';
import { RacesData } from './_races_general_data';
import { RaceData } from './race_types';

export const Dwarf: RaceData = {
    size: new CreatureSize(Sizes['Medium']),
    speed: 20,
    effects: [
        { property: 'Special', description: 'Darkvision out to 60 feet.' },
        { property: 'Special', description: 'Stonecunning: +2 racial bonus on Search checks to notice unusual stonework.' },
        { property: 'Special', description: 'Weapon Familiarity: Dwarven waraxes and dwarven urgroshes are treated as martial weapons, rather than exotic weapons.' },
        { property: 'Special', description: 'Stability: +4 bonus on ability checks made to resist being bull rushed or tripped when standing on the ground.' },
        { property: 'Special', description: '+2 racial bonus on saving throws against poison.' },
        { property: 'Special', description: '+2 racial bonus on saving throws against spells and spell-like effects.' },
        { property: 'Special', description: '+1 racial bonus on attack rolls against orcs and goblinoids.' },
        { property: 'Special', description: '+4 dodge bonus to Armor Class against monsters of the giant type.' },
        { property: 'Special', description: '+2 racial bonus on Appraise checks that are related to stone or metal items.' },
        { property: 'Special', description: '+2 racial bonus on Craft checks that are related to stone or metal.' }
    ]
};

RacesData.set('Dwarf', Dwarf);

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = Dwarf;
}
