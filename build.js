const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

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
        console.log(`Copied ${src} to ${dest}`);
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
copyFile(path.join(rootDir, 'appsscript.json'), path.join(distDir, 'appsscript.json'));
copyFile(path.join(rootDir, '.clasp.json'), path.join(distDir, '.clasp.json'));
copyFile(path.join(rootDir, '.claspignore'), path.join(distDir, '.claspignore'));

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
            console.log(`Processed server file: ${destPath}`);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Processing server files...');
if (fs.existsSync(serverSrcDir)) {
    processServerFiles(serverSrcDir, serverDistDir);
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
        console.log(`Built client script: ${outPath}`);
    });
}

console.log('Build complete! Output in dist/');
