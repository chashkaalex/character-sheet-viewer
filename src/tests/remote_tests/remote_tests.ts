import { callGasFunction, Environment } from './bridge';
import { CharacterRep } from '../../server/character/character_rep';

const THRORS_TEST_ID = '1_Is4lS5xB7Wz14-SKDw7NpWKI17FO6hFN6TzZjgbIaU';
const BESS_TEST_ID = '1NOnQwIPqsf3ZwlILiAUDKofC7zJ-LscSOtQK6AbanFU';

/**
 * Expectations dictionary using Partial<CharacterRep>.
 * This allows us to define only the fields we want to verify for each character,
 * while maintaining full type safety.
 */
const expectations: Record<string, Partial<CharacterRep>> = {
    [THRORS_TEST_ID]: {
        docId: THRORS_TEST_ID,
        name: 'Thror Eiermocker',
        race: 'Dwarf'
    },
    [BESS_TEST_ID]: {
        docId: BESS_TEST_ID,
        name: 'Bess Mockston',
        race: 'Half-Elf'
    }
};

/**
 * Compares actual character representation with expected subset.
 * Iterates through all keys present in the 'expected' object.
 * Returns an array of error messages, or empty if they match.
 */
function compareCharacterReps(actual: CharacterRep, expected: Partial<CharacterRep>): string[] {
    const errors: string[] = [];

    // Iterate through all keys defined in the expectation
    for (const key in expected) {
        const k = key as keyof CharacterRep;
        const actualValue = actual[k];
        const expectedValue = expected[k];

        // Use JSON.stringify for a simple deep comparison of objects/arrays if needed,
        // though for docId, name, and race it works perfectly as a value check.
        if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
            errors.push(`${k} mismatch: expected '${expectedValue}', got '${actualValue}'`);
        }
    }

    if (!actual.parseSuccess) {
        errors.push('Character report indicates parse failure (parseSuccess is false).');
    }

    if (actual.parseErrors && actual.parseErrors.length > 0) {
        errors.push(`Parse errors found: ${actual.parseErrors.join(', ')}`);
    }

    return errors;
}

async function runRemoteTests(env: Environment) {
    console.log(`\n🚀 Running Remote Tests against [${env.toUpperCase()}] environment...`);
    let totalFailed = 0;

    for (const [docId, expected] of Object.entries(expectations)) {
        console.log(`\n[Test] Verifying character: ${expected.name || docId} (${docId})`);
        try {
            const charRep = await callGasFunction(env, 'GetCharacterRepByDocId', [docId]) as CharacterRep;

            if (!charRep) {
                console.error(`❌ Failed: No data returned for ${expected.name || docId}`);
                totalFailed++;
                continue;
            }

            const errors = compareCharacterReps(charRep, expected);

            if (errors.length > 0) {
                console.error(`❌ Failed: ${expected.name || docId} has mismatches:`);
                errors.forEach(err => console.error(`  - ${err}`));
                totalFailed++;
            } else {
                console.log(`✅ Passed: ${expected.name || docId} matches expectations.`);
            }

            // Verify a ModifiableProperty exists and has a state (e.g. Initiative)
            if (charRep.initBonus && typeof charRep.initBonus.currentScore === 'number') {
                console.log('✅ Passed: ModifiableProperty (Initiative) is valid.');
            } else {
                 console.error('❌ Failed: ModifiableProperty (Initiative) is invalid or missing.');
                 totalFailed++;
            }

            // Verify Thror has "Use Thror's Holy Symbol" action available
            if (docId === THRORS_TEST_ID) {
                if (charRep.actions && charRep.actions.includes('Use Thror\'s Holy Symbol')) {
                    console.log('✅ Passed: Action "Use Thror\'s Holy Symbol" is available.');
                } else {
                    console.error('❌ Failed: Action "Use Thror\'s Holy Symbol" is not available on Thror.');
                    totalFailed++;
                }
            }

        } catch (e: any) {
            console.error(`❌ Failed with error: ${e.message}`);
            totalFailed++;
        }
    }

    // Verify direct Rolz API posting via UrlFetchApp
    console.log('\n[Test] Verifying direct Rolz API posting via UrlFetchApp...');
    try {
        const rolzResponse = await callGasFunction(env, 'PostRollToRolz', ['oy2gymrcju', '#d20+5 #Test Roll', 'Test Character']);
        if (rolzResponse && rolzResponse.includes('dicemsg')) {
            console.log('✅ Passed: PostRollToRolz returned a valid Rolz JSON response with a dice message.');
        } else {
            console.error(`❌ Failed: PostRollToRolz response did not match expectations. Got: ${rolzResponse}`);
            totalFailed++;
        }
    } catch (e: any) {
        console.error(`❌ Failed to verify direct Rolz API posting: ${e.message}`);
        totalFailed++;
    }

    if (totalFailed > 0) {
        console.error(`\n❌ Remote Tests on [${env.toUpperCase()}] FAILED (${totalFailed} errors detected).`);
        process.exit(1);
    } else {
        console.log(`\n✅ All Remote Tests on [${env.toUpperCase()}] PASSED.`);
    }
}

// Get environment from command line argument
const argEnv = process.argv[2]?.toLowerCase();
const targetEnv = (argEnv === 'prod') ? Environment.PROD : Environment.TEST;

runRemoteTests(targetEnv);
