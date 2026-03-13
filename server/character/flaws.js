const FlawsEffects = {
    // Grudge Keeper: The actual effects (-2 penalty) are defined under the 'Keeping Grudge' status in _general_effects.js.
    // The flaw itself no longer applies conditional effects directly to avoid creating untrained skills.

    'Aggressive': [
        { status: 'Aggressive', property: 'InitiativeBonus', modifierType: 'Generic', value: 2 },
        { status: 'Aggressive', property: 'ac', modifierType: 'Generic', value: -1 }
    ],
    'Grudge Keeper': [
        { status: 'Keeping Grudge', property: 'Special', description: 'When hit, "keeping grudge" status is applied' }
    ],
    'Lightweight': [
        { status: 'Lightweight', property: 'Special', description: 'No attack bonus for Charge' },
        { status: 'Lightweight', property: 'Special', description: '-4 to resist Bull-rush, Grapple, Overrun, or Trip' },
        { status: 'Lightweight', property: 'Special', description: 'Half base weight' }
    ],
    'Can not harm Fey creatures unprovoked': [
        { status: 'Can not harm Fey creatures unprovoked', property: 'Special', description: 'Can not harm Fey creatures unprovoked' }
    ]
};

if (typeof module !== 'undefined') {
    module.exports = {
        FlawsEffects
    };
}
