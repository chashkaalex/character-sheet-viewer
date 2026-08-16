import { CharacterError } from '../character/character';
import { recordUserLog } from './gsheet_logger';
import { CharacterRep } from '../character/character_rep';
import {
    GetCharacterByDocId,
    GetCharacterRepByDocId,
    UpdateHp,
    AddStatusToCharacter,
    RemoveStatusFromCharacter,
    RemoveAllStatusesFromCharacter,
    OnRoundsElapsed,
    OnPrepareSpell,
    OnCastSpell,
    OnReplenishClassSpellSlots,
    OnUseAction,
    OnMoveAction,
    OnUseNumberAction,
    MoveInventoryItem,
    UsePotion
} from '../character/character_manipulation';

const LOG_DEBUG = false;

/**
 * Main entry point for the web app.
 */
export function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput | string {
    Logger.log('doGet called with parameters: ' + JSON.stringify(e ? e.parameter : 'null'));

    if (LOG_DEBUG) {
        recordUserLog('doGet', 'Web App initial load started.', 'INFO');
    }

    const userEmail = getConnectedUserEmail();
    const allowedUsers = getAllowedUsers();

    if (!allowedUsers.includes(userEmail)) {
        const template = HtmlService.createTemplateFromFile('client/html/unauthorized');
        // @ts-ignore
        template.userEmail = userEmail;
        return template.evaluate();
    }

    const characterId = e && e.parameter ? (e.parameter.id || e.parameter.docId) : null;
    Logger.log('Extracted characterId: ' + characterId);

    let title = 'Character Sheet Viewer';
    let characterPayload: CharacterRep | null = null;

    if (characterId) {
        try {
            const characterRep = GetCharacterRepByDocId(characterId);
            if (!(characterRep instanceof CharacterError)) {
                title = characterRep.name;
                characterPayload = characterRep;
                Logger.log('Found character name for title: ' + title);
            } else {
                Logger.log('CharacterError found while setting title: ' + characterRep.errorMessage);
            }
        } catch (err) {
            Logger.log('Error fetching character for title: ' + (err as Error).message);
        }
    }

    Logger.log('Final title set to: ' + title);

    try {
        const template = HtmlService.createTemplateFromFile('client/html/main');
        // @ts-ignore
        template.scriptUrl = ScriptApp.getService().getUrl();
        // @ts-ignore
        template.hasId = !!characterId;
        // @ts-ignore
        template.characterId = characterId || '';
        // @ts-ignore
        template.characterPayload = characterPayload ? JSON.stringify(characterPayload) : 'null';
        return template.evaluate().setTitle(title);
    } catch (error) {
        Logger.log('ERROR in rendering: ' + (error as Error).message);
        return 'ERROR: Could not render page. ' + (error as Error).message;
    }
}

/**
 * Retrieves the list of allowed users from Script Properties and parses it into an array.
 * @returns {string[]} An array of allowed user email addresses.
 */
function getAllowedUsers(): string[] {
    const SCRIPT_PROPS = PropertiesService.getScriptProperties();
    const KEY = 'ALLOWED_USERS_LIST';

    const allowedUsersString = SCRIPT_PROPS.getProperty(KEY);

    if (!allowedUsersString) {
        Logger.log('Error: ALLOWED_USERS_LIST property not found.');
        return [];
    }

    try {
        const allowedUsersArray = JSON.parse(allowedUsersString);
        return allowedUsersArray;
    } catch (e) {
        Logger.log('Error parsing ALLOWED_USERS_LIST: ' + (e as Error).message);
        return [];
    }
}

function getConnectedUserEmail(): string {
    let userEmail = Session.getActiveUser().getEmail();
    Logger.log('Connected user email: ' + userEmail);
    if (userEmail == '') {
        userEmail = Session.getEffectiveUser().getEmail();
        Logger.log('Effective user email: ' + userEmail);
    }
    return userEmail;
}

/**
 * Helper for including HTML files in templates.
 */
export function include(filename: string): string {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function PostRollToRolz(room: string, text: string, from: string): string {
    // Convert rollable dice commands (e.g. #d20+5 #Str Check) to the inline format expected by Rolz API (e.g. Str Check [d20+5])
    let apiText = text;
    if (text.startsWith('#')) {
        const parts = text.split(' ').map(p => p.trim()).filter(Boolean);
        if (parts.length > 0) {
            const diceExpr = parts[0].substring(1); // remove leading '#'
            const labelParts = parts.slice(1).map(p => p.startsWith('#') ? p.substring(1) : p);
            const label = labelParts.join(' ');
            apiText = label ? `${label} [${diceExpr}]` : `[${diceExpr}]`;
        }
    }

    const url = 'https://rolz.org/api/post';
    const payload = {
        room: room,
        text: apiText,
        from: from
    };
    const options = {
        method: 'post' as const,
        payload: payload
    };
    const response = UrlFetchApp.fetch(url, options);
    return response.getContentText();
}

// Re-export character manipulation functions for GAS global scope
export {
    GetCharacterByDocId,
    GetCharacterRepByDocId,
    UpdateHp,
    AddStatusToCharacter,
    RemoveStatusFromCharacter,
    RemoveAllStatusesFromCharacter,
    OnRoundsElapsed,
    OnPrepareSpell,
    OnCastSpell,
    OnReplenishClassSpellSlots,
    OnUseAction,
    OnMoveAction,
    OnUseNumberAction,
    PostRollToRolz,
    MoveInventoryItem,
    UsePotion
};

