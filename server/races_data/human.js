const { CreatureSize } = require('../character/property');
const { Sizes } = require('../_constants');
const { RacesData } = require('./_races_general_data');

const Human = {
    get size() { return new CreatureSize(Sizes['Medium']); },
    speed: 30,
    effects: [
        // Example structure for reference:
        // { status: 'Human', property: 'BonusFeat', modifierType: 'Generic', value: 1 }
    ]
};

RacesData.set('Human', Human);

if (typeof module !== 'undefined') {
    module.exports = Human;
}
