const LOG_DEBUG = false;

/**
 * @typedef {import('./character/character.js').Character} Character
 */

function doGet(e) {
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

/**
 * Retrieves a character object by document ID.
 * @param {string} docId The ID of the document containing the character data.
 * @returns {Character} Either a Character object or an error object
 */
function GetCharacterByDocId(docId) {
  console.log('docId is ' + docId);
  const doc = DocumentApp.openById(docId);

  console.log('opened document\'s name is ' + doc.getName());

  const character = new Character(doc);
  character.ParseCharacter();
  if (!character.parseSuccess) {
    return {
      error: true,
      parseErrors: character.parseErrors,
      errorMessage: 'Failed to parse character'
    };
  }
  return character;
}

function GetCharacterRepByDocId(docId) {

  const currentCharacter = GetCharacterByDocId(docId);
  if (currentCharacter.error) {
    return currentCharacter;
  }
  return getCharacterRep(currentCharacter);
}

