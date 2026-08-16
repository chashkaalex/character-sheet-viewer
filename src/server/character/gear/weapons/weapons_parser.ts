import { ICharacter } from '@server/character/icharacter';
import { IsAWeapon, UnarmedWeapon, ItemWeapon } from './weapons';
import { Item } from '@server/character/gear/items/items';

/**
 * Parses weapons from the character document and item list.
 * @param character The character object to populate.
 */
export function ParseWeapons(character: ICharacter): void {
    // 1. Always add Unarmed default weapon
    const unarmed = new UnarmedWeapon('Unarmed', character);
    if (unarmed) {
        character.weapons.push(unarmed);
    }

    // 2. Identify and add weapons from items in Battle Gear
    character.battleGear.forEach((item: Item) => {
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



    // Register 'Weapons' property as initialized, which triggers any pending weapon effects
    character.registerProperty('Weapons', {} as any);

    // 4. Recalculate weapon bonuses to update statsString with new feat/status/flaw bonuses
    character.weapons.forEach(weapon => {
        weapon.calculateBonuses(character);
    });
}
