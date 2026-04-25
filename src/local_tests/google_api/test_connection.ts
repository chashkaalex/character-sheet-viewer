import { callGasFunction } from './bridge';

const THRO_TE_ID = '1_Is4lS5xB7Wz14-SKDw7NpWKI17FO6hFN6TzZjgbIaU';

async function testConnection() {
    console.log('--- Testing Google Apps Script Connection ---');
    console.log(`Targeting Doc ID: ${THRO_TE_ID}`);

    try {
        console.log('Calling GetCharacterByDocId...');
        const result = await callGasFunction('GetCharacterByDocId', [THRO_TE_ID]);

        if (result) {
            console.log('Success! Received character data.');
            console.log('Character Name:', result.name);
            console.log('Race:', result.race);
            console.log('Classes:', result.classes.map((c: any) => `${c.name} ${c.level}`).join(', '));
        } else {
            console.log('Failed to retrieve character data. Check GAS logs or API errors.');
        }
    } catch (err: any) {
        console.error('Test Failed:', err.message);
    }
}

testConnection();
