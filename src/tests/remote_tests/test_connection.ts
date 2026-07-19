import { callGasFunction, Environment } from './bridge';

const THRO_TE_ID = '1_Is4lS5xB7Wz14-SKDw7NpWKI17FO6hFN6TzZjgbIaU';

async function testConnection(env: Environment) {
    console.log(`--- Testing Google Apps Script Connection [${env.toUpperCase()}] ---`);
    console.log(`Targeting Doc ID: ${THRO_TE_ID}`);

    try {
        console.log('Calling GetCharacterByDocId...');
        const result = await callGasFunction(env, 'GetCharacterByDocId', [THRO_TE_ID]);

        if (result) {
            console.log('Success! Received character data.');
            console.log('Character Name:', result.name);
            console.log('Race:', result.race);
            console.log('Classes:', result.classes.map((c: any) => `${c.name} ${c.level}`).join(', '));
        }
    } catch (err: any) {
        console.error('Test Failed:', err.message);
        if (err.errors) {
            console.error('Detailed Errors:', JSON.stringify(err.errors, null, 2));
        }
    }
}

async function runAllTests() {
    await testConnection(Environment.TEST);
    console.log('\n--------------------------------------------\n');
    await testConnection(Environment.PROD);
}

runAllTests();
