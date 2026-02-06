
const fs = require('fs');
const path = require('path');
const { Character } = require('../character/character');


// Mock DocumentApp for GetCharacterLinesFromDoc if needed,
// OR just manually read a text file and split it.
// GetCharacterLinesFromDoc expects a Google Doc object.
// However, Character constructor just takes `lines`.
// So we can just read a text file.

const THRORS_TEST_FILE = path.join(__dirname, 'test_character_sheets', 'thror_test.txt');

const fileContent = fs.readFileSync(THRORS_TEST_FILE, 'utf8');
const lines = fileContent.split('\n').map(l => l.trim());

console.log('Creating Character from local text file...');
try {
  const char = new Character(lines, 'local-test-doc-id');
  char.ParseCharacter();
  console.log('Character created successfully!');
  console.log('Name:', char.lines[0]); // Assuming first line is name in this simple dump

  console.log('Classes:', char.classes);
  console.log('Abilities:', char.abilities);

  if (char.parseErrors.length > 0) {
    console.error('Parse Errors:', char.parseErrors);
  }
  if (char.parseWarnings.length > 0) {
    console.warn('Parse Warnings:', char.parseWarnings);
  }

} catch (e) {
  console.error('Error creating character:', e);
}
