import { EffectData } from '../../state/effects';

/**
 * @type {Object.<string, EffectData[]>}
 */
export const FlawsEffects: Record<string, EffectData[]> = {
    // Grudge Keeper: The actual effects (-2 penalty) are defined under the 'Keeping Grudge' status in _general_effects.js.
    // The flaw itself no longer applies conditional effects directly to avoid creating untrained skills.

    'Aggressive': [
        { status: 'Aggressive', property: 'InitiativeBonus', modifierType: 'Generic', value: 2 },
        { status: 'Aggressive', property: 'ac', modifierType: 'Generic', value: -1 }
    ],
    'Grudge Keeper': [
        {
            status: 'Keeping Grudge',
            description: 'When hit, "keeping grudge" status is applied',
            callback: (character) => {
                character.manipulationCallbacks.UpdateHp.push((char, amount, actionType, helpers) => {
                    const alreadyKeepingGrudge = char.HasStatus('Keeping Grudge');
                    if (actionType === 'inflict' && !alreadyKeepingGrudge) {
                        helpers.addStatus('Keeping Grudge', -1);
                    }
                });
            }
        }
    ],
    'Lightweight': [
        { status: 'Lightweight', property: 'Special', description: 'No attack bonus for Charge' },
        { status: 'Lightweight', property: 'Special', description: '-4 to resist Bull-rush, Grapple, Overrun, or Trip' },
        { status: 'Lightweight', property: 'Special', description: 'Half base weight' }
    ],
    'Can not harm Fey creatures unprovoked': [
        { status: 'Can not harm Fey creatures unprovoked', property: 'Special', description: 'Can not harm Fey creatures unprovoked' }
    ],
    'Loudmouth': [
        { status: 'Loudmouth', property: 'Diplomacy', modifierType: 'Generic', value: -4 },
        { status: 'Loudmouth', property: 'Move Silently', modifierType: 'Generic', value: -4 }
    ],
    'Stout': [
        { status: 'Stout', property: 'Bullrush', modifierType: 'Generic', value: 2 },
        { status: 'Stout', property: 'Overrun', modifierType: 'Generic', value: 2 }
    ],
    'Focused': [
        { status: 'Focused', property: 'Concentration', modifierType: 'Generic', value: 1 },
        { status: 'Focused', property: 'Spot', modifierType: 'Generic', value: -1 }
    ]
};
