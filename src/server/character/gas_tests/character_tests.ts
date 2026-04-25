import { Character } from '../character';
import { OnCastSpell } from '../character_manipulation';
import { getCharacterRep } from '../character_rep';
import { ModifiableProperty } from '../property';
import { ParserUtils } from '../parser_utils';
import { ParseRaceAndClassesString } from '../parsers/races_and_classes';
import { GetCharacterByDocId } from '../../services/gas_server';

export function TestBessTAndESheet() {
  const bessTAndASheetId = '1Xo6O9bpBqeQfdYtkTIVaDW2pojFKAAHNsfeVWNXHyp8';  //Bess t&a sheet
  TestCharacterSheet(bessTAndASheetId);
}

export function TestThrorsTAndESheet() {
  const throrsTAndASheetId = '1_Is4lS5xB7Wz14-SKDw7NpWKI17FO6hFN6TzZjgbIaU';  //Thors t&a sheet
  TestCharacterSheet(throrsTAndASheetId);
}

export function TestThrorsRealSheet() {
  const throrsRealSheetId = '1ifbgjE7ZqIoupLPpL7avxMA1oH89xvgalZC7cqV1tO8';       //Thors own sheet
  TestCharacterSheet(throrsRealSheetId);
}

function TestCharacterSheet(characterSheetId: string) {

  const character = GetCharacterByDocId(characterSheetId);

  console.log('parsed character successfully' + (character as any).parseSuccess);
  if ((character as any).parseSuccess && character instanceof Character) {
    const characterRepresentation = getCharacterRep(character);

    console.log('characterRepresentation is ' + characterRepresentation);
  }
}

export function TestBessSpontaneousCast() {
  const bessTAndASheetId = '1Xo6O9bpBqeQfdYtkTIVaDW2pojFKAAHNsfeVWNXHyp8';  //Bess t&a sheet
  const slotData = {
    casterClassName: 'BardicSpecial',
    spellName: 'Inspire Courage',
    spellLevel: '1',
    slotIndex: 0,
    isUsed: false,
    isEmpty: true
  };
  console.log('Testing Spontaneous Cast on Bess with:', slotData);
  try {
    const result = OnCastSpell(bessTAndASheetId, slotData);
    console.log('Result:', result);
  } catch (error) {
    console.error('Error casting spontaneous spell:', error);
  }
}

export function TestThrorsOnSpellCast() {
  const throrsTAndASheetId = '1_Is4lS5xB7Wz14-SKDw7NpWKI17FO6hFN6TzZjgbIaU';  //Thors t&a sheet
  const slotData = {
    casterClassName: 'Cleric',
    slotIndex: 0,
    spellLevel: '1 - domain',
    spellName: 'Enlarge Person',
    isUsed: false,
    isEmpty: false
  };

  console.log('Testing Spontaneous Cast on Thors with:', slotData);

  try {
    const result = OnCastSpell(throrsTAndASheetId, slotData);
    console.log('Result:', result);
  } catch (error) {
    console.error('Error casting spontaneous spell:', error);
  }
}


function checkTest(actual: any, expected: any, description: string) {
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
  const genericEffect: any = { status: 'GenericStrengthBuff', property: 'Str', modifierType: 'Generic', value: 2 };
  modifiableProperty.applyEffect(genericEffect);

  checkTest(modifiableProperty.string, '12 (base: 10)  +2 (GenericStrengthBuff)', 'Generic effect test');
  checkTest(modifiableProperty.currentScore, 12, 'Generic effect test');

  const enhancementEffect: any = { status: 'EnhancementStrengthBuff', property: 'Str', modifierType: 'Enhancement', value: 2 };
  modifiableProperty.applyEffect(enhancementEffect);
  //effects with different modifier types should stack
  checkTest(modifiableProperty.string, '14 (base: 10)  +2 (GenericStrengthBuff), +2 (EnhancementStrengthBuff)', 'Enhancement effect test');
  checkTest(modifiableProperty.currentScore, 14, 'Enhancement effect test');

  const circumstanceEffect: any = { status: 'CircumstanceStrengthBuff', property: 'Str', modifierType: 'Circumstance', value: 2 };
  modifiableProperty.applyEffect(circumstanceEffect);
  //effects with different modifier types should stack
  checkTest(modifiableProperty.string, '16 (base: 10)  +2 (GenericStrengthBuff), +2 (EnhancementStrengthBuff), +2 (CircumstanceStrengthBuff)', 'Circumstance effect test');
  checkTest(modifiableProperty.currentScore, 16, 'Circumstance effect test');

  const anotherEnhancementEffect: any = { status: 'EnhancementStrengthBuff1', property: 'Str', modifierType: 'Enhancement', value: 2 };
  modifiableProperty.applyEffect(anotherEnhancementEffect);
  //effects with the same modifier type shouldn't stack
  checkTest(modifiableProperty.string, '16 (base: 10)  +2 (GenericStrengthBuff), +2 (EnhancementStrengthBuff), +2 (CircumstanceStrengthBuff)', 'Another enhancement effect test');
  checkTest(modifiableProperty.currentScore, 16, 'Another enhancement effect test');

  const anotherCircumstanceEffect: any = { status: 'CircumstanceStrengthBuff1', property: 'Str', modifierType: 'Circumstance', value: 2 };
  modifiableProperty.applyEffect(anotherCircumstanceEffect);
  //Circumstance effects always stack
  checkTest(modifiableProperty.string, '18 (base: 10)  +2 (GenericStrengthBuff), +2 (EnhancementStrengthBuff), +2 (CircumstanceStrengthBuff), +2 (CircumstanceStrengthBuff1)', 'Another circumstance effect test');
  checkTest(modifiableProperty.currentScore, 18, 'Another circumstance effect test');

  const strongerEnhancementEffect: any = { status: 'EnhancementStrengthBuff2', property: 'Str', modifierType: 'Enhancement', value: 3 };
  modifiableProperty.applyEffect(strongerEnhancementEffect);
  //stronger enhancement effect should replace the weaker one
  checkTest(modifiableProperty.string, '19 (base: 10)  +2 (GenericStrengthBuff), +2 (CircumstanceStrengthBuff), +2 (CircumstanceStrengthBuff1), +3 (EnhancementStrengthBuff2)', 'Stronger enhancement effect test');
  checkTest(modifiableProperty.currentScore, 19, 'Stronger enhancement effect test');

  const penaltyEffect: any = { status: 'PenaltyStrengthDebuff', property: 'Str', modifierType: 'Enhancement', value: -2 };
  //in this case, modifierType is Enhancement, but it would usually be "Generic".
  // It is as such to test the logic of the applyEffect function for stackable penalty effects.
  modifiableProperty.applyEffect(penaltyEffect);
  checkTest(modifiableProperty.string, '17 (base: 10)  +2 (GenericStrengthBuff), +2 (CircumstanceStrengthBuff), +2 (CircumstanceStrengthBuff1), +3 (EnhancementStrengthBuff2), -2 (PenaltyStrengthDebuff)', 'Penalty effect test');
  checkTest(modifiableProperty.currentScore, 17, 'Penalty effect test');
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

  const result = ParseRaceAndClassesString(testString);

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
export function RunAllTests() {
  console.log('Running Property tests...');
  TestModifiableProperty();


  console.log('\nRunning Race and Classes parsing tests...');
  TestParseRaceAndClasses();
}

// export to global scope for GAS
