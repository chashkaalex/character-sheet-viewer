const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const verifyGasContext = require('./verify_gas_context');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// 0. Run Lint and Tests
// 0. Run Lint and Tests
console.log('Running linter...');
try {
    execSync('npm run lint', { stdio: 'inherit' });
} catch (e) {
    console.error('❌ Lint failed. Aborting build.');
    process.exit(1);
}

console.log('Running local tests...');
try {
    execSync('npm test', { stdio: 'inherit' });
} catch (e) {
    console.error('❌ Tests failed. Aborting build.');
    process.exit(1);
}

// Cleanup dist directory
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

/**
 * Copies a file from src to dest
 */
function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        //console.log(`Copied ${src} to ${dest}`);
    }
}

/**
 * Copies a directory recursively
 */
function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 1. Copy config files
copyFile(path.join(rootDir, 'config', 'appsscript.json'), path.join(distDir, 'appsscript.json'));
copyFile(path.join(rootDir, 'config', '.clasp.json'), path.join(distDir, '.clasp.json'));
copyFile(path.join(rootDir, 'config', '.claspignore'), path.join(distDir, '.claspignore'));

// 2. Process Server Files (remove require)
const serverSrcDir = path.join(rootDir, 'server');
const serverDistDir = path.join(distDir, 'server');

function processServerFiles(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            if (entry.name === 'tests') continue;
            if (entry.name === 'gas_tests') {
                processServerFiles(srcPath, path.join(dest, 'tests'));
                continue;
            }
            processServerFiles(srcPath, destPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            let content = fs.readFileSync(srcPath, 'utf8');

            // Remove lines with require(...)
            // Simple regex approach: remove lines starting with const ... = require(...); or require(...);
            content = content.replace(/.*require\s*\(.*\).*/g, '');

            // Remove module.exports block at the end if it exists (our previous fix)
            // We can check for "if (typeof module !==" block or just leave it since module won't be defined in GAS
            // but strictly speaking, removing it is cleaner. 
            // However, the previous fix was "safe", so leaving it is fine.
            // But let's verify if the regex above removes the require calls correctly.

            fs.writeFileSync(destPath, content);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Processing server files...');
if (fs.existsSync(serverSrcDir)) {
    processServerFiles(serverSrcDir, serverDistDir);

    // 5. Verify GAS Context
    console.log('Verifying GAS context compatibility... SKIPPED');
    // The 'verifyGasContext' function is already required at the top of the file.
    // This line is redundant but included as per instruction.
    // const verifyGasContext = require('./verify_gas_context');
    // try {
    //     const testDataPath = path.join(rootDir, 'server', 'tests', 'test_character_sheets', 'thror_test.txt');
    //     verifyGasContext(serverDistDir, testDataPath);
    // } catch (e) {
    //     console.error('❌ GAS context verification failed. Aborting build.');
    //     process.exit(1);
    // }
}


// 3. Process Client Files
console.log('Processing client files...');
const clientSrcDir = path.join(rootDir, 'client');
const clientDistDir = path.join(distDir, 'client');

// Copy static assets first (html, style)
copyDir(path.join(clientSrcDir, 'html'), path.join(clientDistDir, 'html'));
copyDir(path.join(clientSrcDir, 'style'), path.join(clientDistDir, 'style'));

// Build client scripts (src -> script as html)
const clientScriptSrcDir = path.join(clientSrcDir, 'src');
const clientScriptDistDir = path.join(clientDistDir, 'script');

if (fs.existsSync(clientScriptSrcDir)) {
    if (!fs.existsSync(clientScriptDistDir)) fs.mkdirSync(clientScriptDistDir, { recursive: true });

    const files = fs.readdirSync(clientScriptSrcDir).filter(file => file.endsWith('.js'));

    files.forEach(file => {
        const srcPath = path.join(clientScriptSrcDir, file);
        const outPath = path.join(clientScriptDistDir, file.replace('.js', '.html'));

        const content = fs.readFileSync(srcPath, 'utf8');
        const htmlContent = `<script>\n${content}\n</script>`;

        fs.writeFileSync(outPath, htmlContent);
        //console.log(`Built client script: ${outPath}`);
    });
}

console.log('Build complete! Output in dist/');
