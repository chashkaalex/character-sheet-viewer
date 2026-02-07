const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * reliable way to simulate GAS environment:
 * 1. Read all server files
 * 2. Concatenate them into a single file artifact
 * 3. Run in a separate Node process
 */

function getAllServerFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            // Recurse into subdirectories
            results = results.concat(getAllServerFiles(file));
        } else {
            // Is a file
            if (file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

function verify(targetDir, testDataPath) {
    console.log(`Verifying GAS context compatibility for files in: ${targetDir}`);

    const files = getAllServerFiles(targetDir);

    if (files.length === 0) {
        throw new Error(`No files found in ${targetDir}. Build might have failed or directory is empty.`);
    }

    // Order matters (alphabetical is default GAS behavior mostly)
    files.sort();

    console.log('Generating unified GAS context file...');

    // Start with imports needed for the test running environment, NOT for the server code itself
    // The server code is stripped of requires, so it relies on globals.
    let unifiedScript = `
// Unified Server File - Auto Generated
// This simulates the GAS global scope by having all code in one file.

const fs = require('fs'); // shim for test reading
const io = { // Minimal shim if needed, or just let valid node code run
};
`;

    files.forEach(file => {
        const code = fs.readFileSync(file, 'utf8');
        unifiedScript += `\n// File: ${path.relative(targetDir, file)}\n`;
        unifiedScript += code;
        unifiedScript += '\n';
    });

    if (testDataPath) {
        console.log(`Adding test verification logic from: ${testDataPath}`);

        // We inline the test logic logic. 
        // Note: We assume the server code defines classes like 'Character' globally in this file.

        // Read the actual test data file path to embed into the script as a string literal? 
        // No, let's just make the script read it or embed the content.
        // Embedding content is safer against path issues in the generated file.
        const testDataContent = fs.readFileSync(testDataPath, 'utf8');
        const safeTestData = JSON.stringify(testDataContent);

        // Append the test harness
        unifiedScript += `
// --- TEST HARNESS ---
(function() {
    console.log('\\n--- Starting Unified Context Test ---');
    try {
        const testData = ${safeTestData};
        const lines = testData.split('\\n').map(l => l.trim());
        
        if (typeof Character === 'undefined') {
            throw new Error("Character class is not defined! Check load order or file contents.");
        }

        console.log('Creating Character...');
        const char = new Character(lines, 'test-doc-id');
        console.log('Character created: ' + char.name);
        
        if (typeof getCharacterRep !== 'function') {
           // It might be inside character_rep.js
           throw new Error("getCharacterRep function is not defined!");
        }

        console.log('Generating Representation...');
        const rep = getCharacterRep(char);
        console.log('CharacterRep generated successfully for: ' + rep.name);
         
        // Validation
        if (!rep.abilities || !rep.abilities.Str) {
             throw new Error("CharacterRep missing abilities!");
        }
        console.log('✅ Unified Test Passed');

    } catch (e) {
        console.error('❌ Unified Test Failed');
        console.error(e);
        process.exit(1);
    }
})();
`;
    }

    // Write the unified file
    const outputDir = path.dirname(targetDir); // typically 'dist'
    const outputFile = path.join(outputDir, 'unified_server_debug.js');
    fs.writeFileSync(outputFile, unifiedScript);
    console.log(`Unified debug file written to: ${outputFile}`);

    // Execute it
    console.log('Executing unified file...');
    try {
        execSync(`node "${outputFile}"`, { stdio: 'inherit' });
        console.log('✅ execution successful.');
    } catch (e) {
        console.error('❌ execution failed.');
        throw new Error("Unified verification failed.");
    }
}

// Run directly if called as a script
if (require.main === module) {
    const distServerDir = path.join(__dirname, 'dist', 'server');
    const testDataFile = path.join(__dirname, 'server', 'tests', 'test_character_sheets', 'thror_test.txt');
    try {
        verify(distServerDir, testDataFile);
    } catch (e) {
        // fs.writeFileSync('error.log', e.toString()); // stdout is enough
        process.exit(1);
    }
}

module.exports = verify;
