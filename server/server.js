const { Character, CharacterError } = require('./character/character');
const { getCharacterRep } = require('./character/character_rep');

const LOG_DEBUG = false;

function doGet(_e) {
  if (LOG_DEBUG) {
    recordUserLog('doGet', 'Web App initial load started.', 'INFO');
  }

  const userEmail = getConnectedUserEmail();

  const allowedUsers = getAllowedUsers();
  if (!allowedUsers.includes(userEmail)) {
    const template = HtmlService.createTemplateFromFile('client/html/unauthorized');
    template.userEmail = userEmail;
    return template.evaluate();
  }

  try {
    const template = HtmlService.createTemplateFromFile('client/html/main');
    return template.evaluate();
  } catch (error) {
    Logger.log('ERROR in rendering: ' + error.message);
    return 'ERROR: Could not render page. ' + error.message;
  }
}

/**
 * Retrieves the list of allowed users from Script Properties and parses it into an array.
 * @returns {string[]} An array of allowed user email addresses.
 */
function getAllowedUsers() {
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
    Logger.log('Error parsing ALLOWED_USERS_LIST: ' + e.message);
    return [];
  }
}

function getConnectedUserEmail() {
  let userEmail = Session.getActiveUser().getEmail();
  Logger.log('Connected user email: ' + userEmail);
  if (userEmail == '') {
    userEmail = Session.getEffectiveUser().getEmail();
    Logger.log('Effective user email: ' + userEmail);
  }
  return userEmail;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

const { GetCharacterLinesFromDoc } = require('./gdocs');
const { recordUserLog } = require('./gsheet_logger');

/**
 * Retrieves a character object by document ID.
 * @param {string} docId The ID of the document containing the character data.
 * @returns {Character | CharacterError} Either a Character object or an error object
 */
function GetCharacterByDocId(docId) {
  console.log('docId is ' + docId);
  const doc = DocumentApp.openById(docId);

  console.log('opened document\'s name is ' + doc.getName());

  const lines = GetCharacterLinesFromDoc(doc);
  const character = new Character(lines, docId);
  character.ParseCharacter();
  if (!character.parseSuccess) {
    return new CharacterError('Failed to parse character', character.parseErrors);
  }
  return character;
}

/**
 * Retrieves a character representation by document ID.
 * @param {string} docId The ID of the document containing the character data.
 * @returns {import("./character/character_rep").CharacterRep | CharacterError} Either a CharacterRep object or an error object
   */
function GetCharacterRepByDocId(docId) {

  const currentCharacter = GetCharacterByDocId(docId);
  if (currentCharacter instanceof CharacterError) {
    return currentCharacter;
  }
  return getCharacterRep(currentCharacter);
}

if (typeof module !== 'undefined') {
  module.exports = {
    GetCharacterByDocId,
    GetCharacterRepByDocId,
    include,
    doGet
  };
}
