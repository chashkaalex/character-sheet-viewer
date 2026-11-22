const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const srcDir = path.join(rootDir, 'src');

console.log('Starting build...');
console.log(`Target directory: ${distDir}`);

// 0a. Stamp APP_VERSION into src/server/character/version.ts
try {
    let gitHash = 'local';
    try {
        gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch (_) {
        // Fallback if git is unavailable
    }
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const appVersion = `${dateStamp} (${gitHash})`;
    const versionFilePath = path.join(srcDir, 'server', 'character', 'version.ts');
    fs.writeFileSync(versionFilePath, `export const APP_VERSION = '${appVersion}';\n`);
    console.log(`Stamped APP_VERSION: ${appVersion}`);
} catch (e) {
    console.warn('⚠️ Could not stamp APP_VERSION:', e.message);
}

// 0. Run Type Checking
console.log('Running type check...');
try {
    execSync('npx tsc -p config/tsconfig.json --noEmit', { stdio: 'inherit' });
} catch (e) {
    console.error('❌ Type check failed. Aborting build.');
    process.exit(1);
}

// 1. Cleanup target directory
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

/**
 * Copies a file from src to dest
 */
function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

// 2. Copy config files
console.log('Copying config files...');
copyFile(path.join(rootDir, 'config', 'appsscript.json'), path.join(distDir, 'appsscript.json'));
copyFile(path.join(rootDir, 'config', '.claspignore'), path.join(distDir, '.claspignore'));

// 3. Bundle Server into a single clasp-uploadable file (dist/server/code.gs)
console.log('Bundling server with Vite...');
const GAS_ENTRY_FUNCTIONS = [
    'doGet',
    'include',
    'GetAppVersion',
    'GetCharacterByDocId',
    'GetCharacterRepByDocId',
    'UpdateHp',
    'AddStatusToCharacter',
    'RemoveStatusFromCharacter',
    'RemoveAllStatusesFromCharacter',
    'OnRoundsElapsed',
    'OnPrepareSpell',
    'OnCastSpell',
    'OnReplenishClassSpellSlots',
    'OnUseAction',
    'OnMoveAction',
    'OnUseNumberAction',
    'PostRollToRolz',
    'MoveInventoryItem',
    'UsePotion',
    'SetPinnedSpecialAttack',
    'SetSkillFilterPreference',
    'SetSpellLayoutPreference'
];

try {
    execSync('npx vite build -c config/vite.server.config.ts', { stdio: 'inherit' });
    const builtJsPath = path.join(distDir, 'server', 'code.js');
    const finalGsPath = path.join(distDir, 'server', 'code.gs');

    if (!fs.existsSync(builtJsPath)) {
        throw new Error(`Expected server bundle not found at ${builtJsPath}`);
    }

    let serverCode = fs.readFileSync(builtJsPath, 'utf8');
    const globalStubs = GAS_ENTRY_FUNCTIONS.map(
        (fnName) => `function ${fnName}() { return _ServerBundle.${fnName}.apply(this, arguments); }`
    ).join('\n');

    serverCode = `${serverCode}\n\n// --- Google Apps Script Top-Level Entry Points ---\n${globalStubs}\n`;
    fs.writeFileSync(finalGsPath, serverCode, 'utf8');
    fs.unlinkSync(builtJsPath);
} catch (e) {
    console.error('❌ Server Vite bundle failed. Aborting.', e.message);
    process.exit(1);
}

// 4. Process Client Files
console.log('Processing client files...');
const clientSrcDir = path.join(srcDir, 'client');

if (fs.existsSync(clientSrcDir)) {
    console.log('Running Vite build for client...');
    try {
        execSync('npx vite build -c config/vite.config.ts', { stdio: 'inherit' });

        const builtHtmlPath = path.join(distDir, '_vite_temp', 'src', 'client', 'html', 'main.html');
        if (fs.existsSync(builtHtmlPath)) {
            let html = fs.readFileSync(builtHtmlPath, 'utf8');
            html = html.replace(/<\?!= include\(['"][^'"]+['"]\);? \?>/g, '');

            const finalDestMain = path.join(distDir, 'client', 'html', 'main.html');
            const finalDestDir = path.dirname(finalDestMain);
            if (!fs.existsSync(finalDestDir)) fs.mkdirSync(finalDestDir, { recursive: true });
            fs.writeFileSync(finalDestMain, html);
        }

        const unauthorizedSrc = path.join(srcDir, 'client', 'html', 'unauthorized.html');
        if (fs.existsSync(unauthorizedSrc)) {
            const finalDestUnauth = path.join(distDir, 'client', 'html', 'unauthorized.html');
            const finalDestDir = path.dirname(finalDestUnauth);
            if (!fs.existsSync(finalDestDir)) fs.mkdirSync(finalDestDir, { recursive: true });
            fs.copyFileSync(unauthorizedSrc, finalDestUnauth);
        }

        const viteTempDir = path.join(distDir, '_vite_temp');
        if (fs.existsSync(viteTempDir)) {
            fs.rmSync(viteTempDir, { recursive: true, force: true });
        }
    } catch (e) {
        console.error('❌ Vite client build failed. Aborting.');
        process.exit(1);
    }
}

console.log(`Build complete! Output in ${distDir}/`);
