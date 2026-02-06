//test property update

const throrsTAndASheetId = '1_Is4lS5xB7Wz14-SKDw7NpWKI17FO6hFN6TzZjgbIaU';   //Thors t&a sheet

function TestCastSpell() {
  const slotData = {
    casterClassName: 'Cleric',
    spellLevel: 1,
    spellName: 'Resistance'
  };
  const character = OnCastSpell(throrsTAndASheetId, slotData);
  console.log(character);
}

function TestPrepareSpell() {
  const selectedSpell = 'Resistance';
  const slotData = {
    casterClassName: 'Cleric',
    spellLevel: 1
  };
  const character = OnPrepareSpell(throrsTAndASheetId, slotData, selectedSpell);
  console.log(character);
}

