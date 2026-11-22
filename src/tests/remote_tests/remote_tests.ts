import { callGasFunction, Environment } from './bridge';
import { CharacterRep } from '../../server/character/character_rep';

const THRORS_TEST_ID = '1_Is4lS5xB7Wz14-SKDw7NpWKI17FO6hFN6TzZjgbIaU';
const BESS_TEST_ID = '1NOnQwIPqsf3ZwlILiAUDKofC7zJ-LscSOtQK6AbanFU';
const MORTY_TEST_ID = '16BzGkqc1L2QHkkCmzky6dWKuOnzyneCqxx5IZI2kLu4';
const NAETHAN_TEST_ID = '1tJX7ybJxkz-Uob02sh7JCSKp5pYiVMDaTZCRnzDjHB0';

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
    },
    [MORTY_TEST_ID]: {
        docId: MORTY_TEST_ID,
        name: 'Mortfinn aep Dessantein (Morty)',
        race: 'Elf'
    },
    [NAETHAN_TEST_ID]: {
        docId: NAETHAN_TEST_ID,
        name: 'Naethan',
        race: 'Human'
    }
};

/**
 * Compares actual character representation with expected subset.
 */
function compareCharacterReps(actual: CharacterRep, expected: Partial<CharacterRep>): string[] {
    const errors: string[] = [];

    for (const key in expected) {
        const k = key as keyof CharacterRep;
        const actualValue = actual[k];
        const expectedValue = expected[k];

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

/**
 * Validates deep structural integrity of a parsed CharacterRep across all major D&D 3.5 subsystems.
 */
function verifyDeepCharacterStructure(charRep: CharacterRep): string[] {
    const errors: string[] = [];

    if (!charRep.appVersion || typeof charRep.appVersion !== 'string') {
        errors.push('Missing or invalid appVersion');
    }
    if (!charRep.initBonus || typeof charRep.initBonus.currentScore !== 'number') {
        errors.push('Invalid initBonus');
    }
    if (!charRep.ac || typeof charRep.ac.bonus !== 'number' || typeof charRep.ac.touch?.bonus !== 'number' || typeof charRep.ac.flatFooted?.bonus !== 'number') {
        errors.push('Invalid AC / Touch / Flat-Footed representation');
    }
    if (!charRep.saves || typeof charRep.saves.Fort?.currentScore !== 'number' || typeof charRep.saves.Ref?.currentScore !== 'number' || typeof charRep.saves.Will?.currentScore !== 'number') {
        errors.push('Invalid saving throws (Fort, Ref, Will)');
    }
    for (const ab of ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']) {
        if (!charRep.abilities?.[ab] || typeof charRep.abilities[ab].currentScore !== 'number' || typeof charRep.abilities[ab].modifier !== 'number') {
            errors.push(`Invalid ability score: ${ab}`);
        }
    }
    if (!Array.isArray(charRep.weapons) || charRep.weapons.length === 0) {
        errors.push('No weapons parsed (at least Unarmed should be present)');
    } else {
        const unarmed = charRep.weapons.find(w => w.name === 'Unarmed');
        if (!unarmed || !unarmed.attackBonus || typeof unarmed.attackBonus.bonus !== 'number' || !unarmed.fullAttack?.normal?.summaryString) {
            errors.push('Invalid Unarmed weapon or missing fullAttack sequence');
        }
    }
    if (!charRep.skills || Object.keys(charRep.skills).length === 0) {
        errors.push('No skills found in character representation');
    }
    if (!Array.isArray(charRep.actions) || !charRep.actions.includes('Fighting Defensively') || !charRep.actions.includes('Total Defense')) {
        errors.push('Missing standard combat actions in actions list');
    }

    return errors;
}

async function runRemoteTests(env: Environment) {
    console.log(`\n🚀 Running Remote Tests against [${env.toUpperCase()}] environment...`);
    let totalFailed = 0;

    // 1. Verify GetAppVersion endpoint
    console.log('\n[Test] Verifying GetAppVersion endpoint...');
    try {
        const appVersion = await callGasFunction(env, 'GetAppVersion', []);
        if (typeof appVersion === 'string' && appVersion.length > 0) {
            console.log(`✅ Passed: GetAppVersion returned '${appVersion}'.`);
        } else {
            console.error(`❌ Failed: GetAppVersion returned invalid value: ${appVersion}`);
            totalFailed++;
        }
    } catch (e: any) {
        console.error(`❌ Failed GetAppVersion: ${e.message}`);
        totalFailed++;
    }

    const baselineReps: Record<string, CharacterRep> = {};

    // 2. Verify all 4 characters parse cleanly with deep structural checks
    for (const [docId, expected] of Object.entries(expectations)) {
        console.log(`\n[Test] Verifying character: ${expected.name || docId} (${docId})`);
        try {
            const charRep = await callGasFunction(env, 'GetCharacterRepByDocId', [docId]) as CharacterRep;

            if (!charRep) {
                console.error(`❌ Failed: No data returned for ${expected.name || docId}`);
                totalFailed++;
                continue;
            }

            baselineReps[docId] = charRep;

            const errors = [
                ...compareCharacterReps(charRep, expected),
                ...verifyDeepCharacterStructure(charRep)
            ];

            if (errors.length > 0) {
                console.error(`❌ Failed: ${expected.name || docId} has validation errors:`);
                errors.forEach(err => console.error(`  - ${err}`));
                totalFailed++;
            } else {
                console.log(`✅ Passed: ${expected.name || docId} matches expectations and deep structural checks (AC ${charRep.ac.bonus}, HP ${charRep.hp.current}/${charRep.hp.max}, Weapons: ${charRep.weapons.length}).`);
            }

            if (docId === THRORS_TEST_ID) {
                if (charRep.actions && charRep.actions.includes('Use Thror\'s Holy Symbol')) {
                    console.log('✅ Passed: Action "Use Thror\'s Holy Symbol" is available on Thror.');
                } else {
                    console.error('❌ Failed: Action "Use Thror\'s Holy Symbol" is not available on Thror.');
                    totalFailed++;
                }
            }

            if (docId === NAETHAN_TEST_ID) {
                if (charRep.actions && charRep.actions.includes('Combat Expertise') && charRep.actions.includes('Furious Counterstrike')) {
                    console.log('✅ Passed: Crusader & Feat actions ("Combat Expertise", "Furious Counterstrike") are available on Naethan.');
                } else {
                    console.error('❌ Failed: Expected Crusader/Feat actions missing on Naethan.');
                    totalFailed++;
                }
            }
        } catch (e: any) {
            console.error(`❌ Failed with error: ${e.message}`);
            totalFailed++;
        }
    }

    // 3. Round-Trip Mutation Tests (only on TEST environment to keep PROD untouched)
    if (env === Environment.TEST && baselineReps[NAETHAN_TEST_ID]) {
        const naethanBase = baselineReps[NAETHAN_TEST_ID];
        const baseAc = naethanBase.ac.bonus;
        const baseSword = naethanBase.weapons.find(w => w.name.toLowerCase().includes('longsword') || w.name === 'Unarmed')!;
        const baseAtk = baseSword.attackBonus.bonus;

        console.log('\n[Test] Verifying Round-Trip Combat Expertise & Status Expiry on Naethan (TEST)...');
        try {
            // Activate Combat Expertise -2 -> +2 Dodge AC, -2 Attack
            const afterCe = await callGasFunction(env, 'OnUseNumberAction', [NAETHAN_TEST_ID, 'Combat Expertise', 2]) as CharacterRep;
            const ceSword = afterCe?.weapons?.find(w => w.name === baseSword.name);

            if (afterCe && afterCe.ac.bonus === baseAc + 2 && ceSword && ceSword.attackBonus.bonus === baseAtk - 2) {
                console.log(`✅ Passed: Combat Expertise -2 raised AC (${baseAc} -> ${afterCe.ac.bonus}) and lowered attack (${baseAtk} -> ${ceSword.attackBonus.bonus}).`);
            } else {
                console.error(`❌ Failed: Combat Expertise -2 did not produce expected AC/Attack change. Got AC=${afterCe?.ac?.bonus}, Atk=${ceSword?.attackBonus?.bonus}`);
                totalFailed++;
            }

            // Clean up status via RemoveStatusFromCharacter
            const afterRestore = await callGasFunction(env, 'RemoveStatusFromCharacter', [NAETHAN_TEST_ID, 'Combat Expertise -2']) as CharacterRep;
            const restoredSword = afterRestore?.weapons?.find(w => w.name === baseSword.name);
            if (afterRestore && afterRestore.ac.bonus === baseAc && restoredSword && restoredSword.attackBonus.bonus === baseAtk) {
                console.log('✅ Passed: RemoveStatusFromCharacter cleanly restored Naethan to baseline AC and Attack.');
            } else {
                console.error('❌ Failed: RemoveStatusFromCharacter did not restore baseline stats.');
                totalFailed++;
            }
        } catch (e: any) {
            console.error(`❌ Failed round-trip Combat Expertise test: ${e.message}`);
            totalFailed++;
        }
    }

    // 4. Verify direct Rolz API posting via UrlFetchApp
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
