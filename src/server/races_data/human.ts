import { CreatureSize } from '../character/00_property';
import { Sizes } from '../character/_constants';
import { RacesData } from './_races_general_data';
import { RaceData } from './race_types';

export const Human: RaceData = {
    size: new CreatureSize(Sizes['Medium']),
    speed: 30,
    effects: [
        // Example structure for reference:
        // { status: 'Human', property: 'BonusFeat', modifierType: 'Generic', value: 1 }
    ]
};

RacesData.set('Human', Human);

