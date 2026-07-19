import { Item, Armor, IsAnArmor } from './items';
import { GetFirstNumberFromALine, GetPartOfTheLineUntilToken } from '../../parser_utils';
import { EffectFactory } from '../../state/effects';
import { ICharacter } from '@server/character/icharacter';

function ParseItemsLine(line: string): Item {
    let amount = 1;
    let nameLine = line;
    if (line.includes(' x ')) {
        const lineSplitByX = line.split(' x ');
        const amountLine = lineSplitByX.pop()?.trim();
        nameLine = lineSplitByX[0];
        if (amountLine) {
            const num = GetFirstNumberFromALine(amountLine);
            if (num) {
                amount = num;
            }
        }
    }
    let description = '';
    const firstParen = nameLine.indexOf('(');
    const lastParen = nameLine.lastIndexOf(')');
    if (firstParen !== -1 && lastParen !== -1 && lastParen > firstParen) {
        description = nameLine.substring(firstParen + 1, lastParen).trim();
    }

    const cleanItemName = GetPartOfTheLineUntilToken(nameLine, '(').trim().replace(/,/g, '');
    let item = cleanItemName;
    if (nameLine.toLowerCase().includes('holy symbol')) {
        item += ' (holy symbol)';
    }
    if (IsAnArmor(cleanItemName)) {
        return new Armor(item, amount, description);
    }
    return new Item(item, amount, description);
}

/**
 * Parses items from the character document and applies their effects.
 * @param character The character object to populate and modify.
 */
export function ParseItems(character: ICharacter): void {
    // Parsing Battle Gear
    const battleGearLines = character.sectionLines['Battle Gear'];
    if (battleGearLines) {
        const mergedLines: string[] = [];
        battleGearLines.forEach((line: string) => {
            if (line.trim() === '') return;
            if ((line.startsWith(' ') || line.startsWith('\t')) && mergedLines.length > 0) {
                mergedLines[mergedLines.length - 1] += ' ' + line.trim();
            } else {
                mergedLines.push(line);
            }
        });

        mergedLines.forEach((line: string) => {
            character.battleGear.push(ParseItemsLine(line));
        });

        character.battleGear.forEach((item: Item) => {
            let applyEffects = true;
            //check that the slot isn't taken
            if (item.bodySlot) {
                const numberOfAvailableSlots = character.bodySlots.get(item.bodySlot);
                if (numberOfAvailableSlots !== undefined && numberOfAvailableSlots > 0) {
                    character.bodySlots.set(item.bodySlot, numberOfAvailableSlots - 1);
                } else if (numberOfAvailableSlots !== undefined) {
                    character.parseWarnings.push(`Item ${item.name} body slot ${item.bodySlot} is already taken, effects will not be applied`);
                    applyEffects = false;
                }
            }
            if (applyEffects) {
                const itemEffects = item.effects;
                if (itemEffects && itemEffects.length > 0) {
                    itemEffects.forEach(effect => { EffectFactory(effect).ApplyEffect(character); });
                } else if (!item.IsUsable() && !item.isWeapon && item.bodySlot) {
                    character.parseWarnings.push(`Item ${item.name} effects not found`);
                }
            }
        });
    } else {
        character.parseWarnings.push('No battle gear found');
    }

    // Parsing Possessions
    const possessionsLines = character.sectionLines['Possessions'];
    if (possessionsLines) {
        const mergedLines: string[] = [];
        possessionsLines.forEach((line: string) => {
            if (line.trim() === '') return;
            if ((line.startsWith(' ') || line.startsWith('\t')) && mergedLines.length > 0) {
                mergedLines[mergedLines.length - 1] += ' ' + line.trim();
            } else {
                mergedLines.push(line);
            }
        });

        mergedLines.forEach((line: string) => {
            character.possessions.push(ParseItemsLine(line));
        });
    }
}
