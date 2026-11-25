import { Item, Armor, ArmorsData, BodySlots } from './items';
import { GetFirstNumberFromALine, GetPartOfTheLineUntilToken } from '../../parser_utils';
import { EffectFactory } from '../../state/effects';
import { ICharacter } from '@server/character/icharacter';
import { GetBaseWeaponWeight } from '../weapons/weapons';

export function FindArmorBaseName(fullName: string): string | null {
    if (ArmorsData.has(fullName)) return fullName;

    const sortedNames = Array.from(ArmorsData.keys()).sort((a, b) => b.length - a.length);
    for (const baseName of sortedNames) {
        if (fullName.toLowerCase().includes(baseName.toLowerCase())) {
            return baseName;
        }
    }
    return null;
}

export function IsAnArmor(name: string): boolean {
    return FindArmorBaseName(name) !== null;
}

export function GetBodySlot(itemName: string, description: string = ''): string | null {
    const lowerName = itemName.toLowerCase();

    if (lowerName.includes('holy symbol')) {
        return 'Holy Symbol';
    }

    // Standard armors (Light/Medium/Heavy, excluding Shields) always occupy the Body slot,
    // even if their name contains a word like "Shirt" (e.g., "Chain Shirt") or "Leather"/"Hide".
    const armorBaseName = FindArmorBaseName(itemName);
    if (armorBaseName) {
        const armorData = ArmorsData.get(armorBaseName);
        if (armorData && armorData.type !== 'Shield') {
            return 'Body';
        }
    }

    const findSlotInWords = (text: string): string | null => {
        const words = text.toLowerCase().replace(/[(),]/g, ' ').split(/\s+/).filter(Boolean);
        for (let i = 0; i < words.length; i++) {
            const bodySlot = BodySlots.find(slot => slot.names.includes(words[i]));
            if (bodySlot) {
                return bodySlot.slotName;
            }
        }
        return null;
    };

    const nameSlot = findSlotInWords(lowerName);
    if (nameSlot) {
        return nameSlot;
    }

    if (description && description.includes(') (')) {
        const firstGroup = description.split(') (')[0];
        return findSlotInWords(firstGroup);
    }

    return null;
}

/**
 * Keyword-based weight heuristics (in lb.) for unique, wondrous, and adventuring gear items
 * when no explicit weight is given in the character sheet description.
 */
export const ITEM_NAME_WEIGHT_RULES: Array<{ pattern: RegExp; weight: number }> = [
    // Weightless / negligible items per PHB/DMG (— weight)
    {
        pattern: /\b(?:ring|amulet|periapt|brooch|medallion|necklace|scarab|pendant|headband|phylactery|goggles|lenses|potion|scroll|parchment|pearl|gem|onyx|coin|bandage|oil|cure|worms|flint\s+and\s+steel|whetstone|needle|wire|feather|dice|cards|ear|ears|aquamarine|malachite)\b/i,
        weight: 0
    },

    // Shuriken / common typo "suriken"
    { pattern: /\b(?:shuriken|suriken)\b/i, weight: 0.1 },

    // Specific multi-word gear / wondrous categories
    { pattern: /\b(?:hand\s+wraps\s+with\s+adamantine\s+plates|gauntlets)\b/i, weight: 2 },
    { pattern: /\bchain\s+belt\b/i, weight: 2 },
    { pattern: /\bexplorer'?s\s+outfit\b/i, weight: 8 },
    { pattern: /\bnoble'?s\s+outfit\b/i, weight: 10 },
    { pattern: /\b(?:performer'?s\s+outfit|robe|outfit|kimono|garment)\b/i, weight: 4 },
    { pattern: /\b(?:handy\s+haversack|bedroll|climbing\s+kit|crowbar|rod)\b/i, weight: 5 },
    { pattern: /\b(?:iron\s+pot|rope)\b/i, weight: 10 },
    { pattern: /\b(?:waterskin|grappling\s+hook|staff)\b/i, weight: 4 },
    { pattern: /\b(?:helm|helmet|blanket|mandoline|lute|flute|book|spellbook)\b/i, weight: 3 },
    { pattern: /\b(?:backpack|spell\s+component\s+pouch|hammer|lantern)\b/i, weight: 2 },
    { pattern: /\b(?:holy\s+symbol|cloak|cape|mantle|vest|vestment|shirt|belt|bracers|bracelets|boots|shoes|striders|quiver|torch|soap|rations|flask|knife)\b/i, weight: 1 },
    { pattern: /\b(?:gloves|wraps|hat|sash|pouch|wand|vial)\b/i, weight: 0.5 },
    { pattern: /\bsaddle\b/i, weight: 25 }
];

export function GuessWeightFromItemName(name: string): number | null {
    for (const rule of ITEM_NAME_WEIGHT_RULES) {
        if (rule.pattern.test(name)) {
            return rule.weight;
        }
    }
    return null;
}

/**
 * Resolves the unit weight (in lb.) of an item, or returns null if its weight cannot be inferred:
 * 1. Explicit weight in description ("15 lb.", "0.5 lb")
 * 2. Standard PHB Armor/Shield weight from ArmorsData (halved for Mithral/Darkwood)
 * 3. Standard PHB Weapon weight from WeaponsData (halved for Mithral/Darkwood)
 * 4. Keyword-based heuristic from item name (GuessWeightFromItemName)
 */
export function InferItemWeight(name: string, description: string = '', material: string | null = null): number | null {
    if (description) {
        const weightMatch = description.match(/(\d+(?:\.\d+)?)\s*lb/i);
        if (weightMatch) {
            return parseFloat(weightMatch[1]);
        }
    }

    const isHalfWeightMaterial =
        material === 'Mithral' ||
        material === 'Darkwood' ||
        /\b(?:mithral|darkwood)\b/i.test(name) ||
        /\b(?:mithral|darkwood)\b/i.test(description);
    const materialMultiplier = isHalfWeightMaterial ? 0.5 : 1;

    const armorBase = FindArmorBaseName(name);
    if (armorBase) {
        const armorData = ArmorsData.get(armorBase);
        if (armorData && typeof armorData.weight === 'number') {
            return armorData.weight * materialMultiplier;
        }
    }

    const weaponBaseWeight = GetBaseWeaponWeight(name);
    if (weaponBaseWeight !== null) {
        return weaponBaseWeight * materialMultiplier;
    }

    return GuessWeightFromItemName(name);
}

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
        const armor = new Armor(item, amount, description);
        armor.line = line;
        return armor;
    }
    const parsedItem = new Item(item, amount, description);
    parsedItem.line = line;
    return parsedItem;
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
                    item.isEquipped = false;
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
            if (!item.isWeightKnown) {
                character.parseWarnings.push(`Item ${item.name} weight not found`);
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
