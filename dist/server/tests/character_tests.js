function TestBessTAndASheet() {
  const bessTAndASheetId = '1Xo6O9bpBqeQfdYtkTIVaDW2pojFKAAHNsfeVWNXHyp8';  //Bess t&a sheet
  TestCharacterSheet(bessTAndASheetId);
}

function TestThrorsTAndASheet() {
  const throrsTAndASheetId = '1_Is4lS5xB7Wz14-SKDw7NpWKI17FO6hFN6TzZjgbIaU';  //Thors t&a sheet
  TestCharacterSheet(throrsTAndASheetId);
}

function TestThorsRealSheet() {
  const throrsRealSheetId = '1ifbgjE7ZqIoupLPpL7avxMA1oH89xvgalZC7cqV1tO8';       //Thors own sheet
  TestCharacterSheet(throrsRealSheetId);
}


function TestCharacterSheet(characterSheetId) {

  const character = GetCharacterByDocId(characterSheetId);

  console.log('first line is ' + character.name);

  const characterRepresentation = getCharacterRep(character);

  console.log('characterRepresentation is ' + characterRepresentation);
}

function checkTest(actual, expected, description) {
  const passed = actual === expected;
  console.log(`${description}: ${passed ? 'PASS' : 'FAIL'}`);
  if (!passed) {
    console.log(`  Expected: ${expected}, Got: ${actual}`);
  }
  return passed;
}

function TestModifiableProperty() {
  const modifiableProperty = new ModifiableProperty(10);

  //apply a generic effect
  const genericEffect = { status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 };
  modifiableProperty.applyEffect(genericEffect);

  checkTest(modifiableProperty.string, '12 (base: 10)  +2 (GenericStrengthBuff)', 'Generic effect test');
  checkTest(modifiableProperty.currentScore, 12, 'Generic effect test');

  const enhancementEffect = { status: 'EnhancementStrengthBuff', property: 'Str', modifierType: 'Enhancement', value: 2 };
  modifiableProperty.applyEffect(enhancementEffect);
  //effects with different modifier types should stack
  checkTest(modifiableProperty.string, '14 (base: 10)  +2 (GenericStrengthBuff), +2 (EnhancementStrengthBuff)', 'Enhancement effect test');
  checkTest(modifiableProperty.currentScore, 14, 'Enhancement effect test');

  const circumstanceEffect = { status: 'CircumstanceStrengthBuff', property: 'Str', modifierType: 'Circumstance', value: 2 };
  modifiableProperty.applyEffect(circumstanceEffect);
  //effects with different modifier types should stack
  checkTest(modifiableProperty.string, '16 (base: 10)  +2 (GenericStrengthBuff), +2 (EnhancementStrengthBuff), +2 (CircumstanceStrengthBuff)', 'Circumstance effect test');
  checkTest(modifiableProperty.currentScore, 16, 'Circumstance effect test');

  const anotherEnhancementEffect = { status: 'EnhancementStrengthBuff1', property: 'Str', modifierType: 'Enhancement', value: 2 };
  modifiableProperty.applyEffect(anotherEnhancementEffect);
  //effects with the same modifier type shouldn't stack
  checkTest(modifiableProperty.string, '16 (base: 10)  +2 (GenericStrengthBuff), +2 (EnhancementStrengthBuff), +2 (CircumstanceStrengthBuff)', 'Another enhancement effect test');
  checkTest(modifiableProperty.currentScore, 16, 'Another enhancement effect test');

  const anotherCircumstanceEffect = { status: 'CircumstanceStrengthBuff1', property: 'Str', modifierType: 'Circumstance', value: 2 };
  modifiableProperty.applyEffect(anotherCircumstanceEffect);
  //Circumstance effects always stack
  checkTest(modifiableProperty.string, '18 (base: 10)  +2 (GenericStrengthBuff), +2 (EnhancementStrengthBuff), +2 (CircumstanceStrengthBuff), +2 (CircumstanceStrengthBuff1)', 'Another circumstance effect test');
  checkTest(modifiableProperty.currentScore, 18, 'Another circumstance effect test');

  const strongerEnhancementEffect = { status: 'EnhancementStrengthBuff2', property: 'Str', modifierType: 'Enhancement', value: 3 };
  modifiableProperty.applyEffect(strongerEnhancementEffect);
  //stronger enhancement effect should replace the weaker one
  checkTest(modifiableProperty.string, '19 (base: 10)  +2 (GenericStrengthBuff), +2 (CircumstanceStrengthBuff), +2 (CircumstanceStrengthBuff1), +3 (EnhancementStrengthBuff2)', 'Stronger enhancement effect test');
  checkTest(modifiableProperty.currentScore, 19, 'Stronger enhancement effect test');

  const penaltyEffect = { status: 'PenaltyStrengthDebuff', property: 'Str', modifierType: 'Enhancement', value: -2 };
  //in this case, modifierType is Enhancement, but it would usually be "Generic".
  // It is as such to test the logic of the applyEffect function for stackable penalty effects.
  modifiableProperty.applyEffect(penaltyEffect);
  checkTest(modifiableProperty.string, '17 (base: 10)  +2 (GenericStrengthBuff), +2 (CircumstanceStrengthBuff), +2 (CircumstanceStrengthBuff1), +3 (EnhancementStrengthBuff2), -2 (PenaltyStrengthDebuff)', 'Penalty effect test');
  checkTest(modifiableProperty.currentScore, 17, 'Penalty effect test');

  //apply a permanent effect
  // const permanentEffect = {status: "StrengthBuff", property: "Str", modifierType: "Generic", value: 2}
  // modifiableProperty.applyPermanentEffect(permanentEffect);
  // checkTest(modifiableProperty.string, "18 (base: 10)  + 2 (StrengthBuff), + 2 (StrengthBuffEnhancement), + 2 (StrengthBuffCircumstance), + 2 (StrengthBuffEnhancement), + 2 (StrengthBuff)", "Permanent effect test");
  // checkTest(modifiableProperty.currentScore, 18, "Permanent effect test");
}

function TestParseRaceAndClasses() {
  const testString = '(Dwarf Monk 6/Cleric of Moradin 3/Sacred Fist 2)';
  const expected = {
    race: 'Dwarf',
    classes: [
      { name: 'Monk', level: 6 },
      { name: 'Cleric', level: 3 },
      { name: 'Sacred Fist', level: 2 }
    ]
  };

  const result = ParseRaceAndClasses(testString);

  checkTest(result.race, expected.race, 'Race test');

  // Check classes
  const classesMatch = expected.classes.every((expectedClass, index) => {
    const actualClass = result.classes[index];
    return actualClass &&
      checkTest(actualClass.name, expectedClass.name, `${index} class name test`) &&
      checkTest(actualClass.level, expectedClass.level, `${index} class level test`);
  });

  checkTest(classesMatch, true, 'Classes test');
}

// Run all tests
function RunAllTests() {
  console.log('Running Property tests...');
  TestModifiableProperty();


  console.log('\nRunning Race and Classes parsing tests...');
  TestParseRaceAndClasses();
}
