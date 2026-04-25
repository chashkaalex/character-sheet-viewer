import { IsAWeapon, UnarmedWeapon, ItemWeapon } from '../weapons';

/**
 * Parses weapons from the character document and item list.
 * @param character The character object to populate.
 */
export function ParseWeapons(character: any): void {
    // 1. Always add Unarmed default weapon
    const unarmed = new UnarmedWeapon('Unarmed', character);
    if (unarmed) {
        character.weapons.push(unarmed);
    }

    // 2. Identify and add weapons from items in Battle Gear
    character.battleGear.forEach((item: any) => {
        if (IsAWeapon(item.name)) {
            // Avoid adding another "Unarmed" if it's explicitly in items (we already added the default)
            if (item.name.toLowerCase().includes('unarmed')) return;

            const weapon = new ItemWeapon(item, character);
            if (weapon) {
                character.weapons.push(weapon);
            }
        }
    });

    if (character.weapons.length === 0) {
        character.parseWarnings.push('No weapons found');
    }
}

// for CommonJS compatibility
// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = {
        ParseWeapons
    };
}
