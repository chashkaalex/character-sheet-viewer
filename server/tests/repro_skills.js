const { ParserUtils } = require('../parser');

const lines = [
  'Skills:',
  'Balance (Dex): 9',
  'Concentration (Con): 2',
  'Climb (Str): 2',
  'Escape Artist (Dex): 2',
  'Jump (Str): 5',
  'Hide (Dex): 8',
  'Knowledge (Religion) (Int): 8',
  'Listen (Wis): 10',
  'Move Silently (Dex): 8',
  'Profession (Lamplighter) (Wis): 2',
  'Spot (Wis): 10',
  'Spellcraft (Int): 4',
  'Tumble (Dex): 10',
  '',
  'Skills Synergy:',
  'Balance: +2 Monastic Tradition (School Bonus)',
  'Jump: +2 Tumble',
  'Tumble: + 2 Balance, Jump'
];

const result = ParserUtils.ParseDocLines(lines);

console.log('Skills Section Lines:', result.sectionLines['Skills']);
console.log('Section Lines Keys:', Object.keys(result.sectionLines));
