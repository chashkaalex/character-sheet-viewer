const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const srcDir = path.join(rootDir, 'src');

console.log('Starting build...');
console.log(`Target directory: ${distDir}`);

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
copyFile(path.join(rootDir, 'config', '.clasp.json'), path.join(distDir, '.clasp.json'));
copyFile(path.join(rootDir, 'config', '.claspignore'), path.join(distDir, '.claspignore'));

// 3. Process Server Files (Local Transpilation)
console.log('Processing server files...');
const serverSrcDir = path.join(srcDir, 'server');
const serverDistDir = path.join(distDir, 'server');
const serverTempOutDir = path.join(distDir, 'server_out');

// A. Transpile TypeScript server files locally
console.log('Transpiling server TypeScript files...');
try {
    if (fs.existsSync(serverSrcDir)) {
        execSync('npx tsc -p config/tsconfig.server.json', { stdio: 'inherit' });
    }
} catch (e) {
    console.error('❌ Server transpilation failed. Aborting.');
    process.exit(1);
}

/**
 * Strips module-specific code and renames exports to var
 */
function cleanContentForGAS(content) {
    // 1. Identify and resolve CJS import aliases created by tsc (e.g., const _constants_1 = ... )
    // These aliases are used in the transpiled code for members, but GAS uses raw global names.
    const importRegex = /^(?:var|const|let) (.*) = require\(.*\);$/gm;
    let match;
    let aliasReplacements = [];
    while ((match = importRegex.exec(content)) !== null) {
        const alias = match[1].trim();
        // Skip destructuring (tsc doesn't typically destructure for standard imports in CJS)
        if (!alias.startsWith('{')) {
            aliasReplacements.push(alias);
        }
    }

    // Apply alias replacements (e.g., _constants_1.ModifierTypes -> ModifierTypes)
    // Sort by length descending to avoid partial replacements (e.g., prepared_spells_1 vs spells_1)
    aliasReplacements.sort((a, b) => b.length - a.length);

    for (const alias of aliasReplacements) {
        const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        content = content.replace(new RegExp(`${escapedAlias}\\.`, 'g'), '');
    }

    // 2. Remove redundant early-export initializations (exports.X = void 0;) 
    // and redundant self-assignments (exports.X = X;)
    // Both cause "Identifier already declared" errors for classes in GAS.
    content = content.replace(/^exports\..* = void 0;$/gm, '');
    content = content.replace(/^exports\.(.*) = \1;$/gm, '');

    // 3. Replace remaining "exports.Name = ..." with "var Name = ..." to make it global in GAS
    content = content.replace(/^exports\.([a-zA-Z0-9_$]+) = /gm, 'var $1 = ');

    // 4. Remove the __esModule declaration
    content = content.replace(/^.*Object\.defineProperty\(exports,.*$/gm, '');

    // 5. Fix remaining "exports." usages (e.g. in function bodies)
    content = content.replace(/exports\./g, '');

    // 6. Remove require/import calls that weren't resolved (GAS is global)
    content = content.replace(/.*require\s*\(.*\).*/g, '');

    return content;
}

/**
 * Recursively processes server files, transforming .js/ts to .gs
 */
function processServerDir(src, dest, isTranspiled = false) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        
        if (entry.isDirectory()) {
            processServerDir(srcPath, path.join(dest, entry.name), isTranspiled);
        } else if (entry.isFile()) {
            // Handle script files
            if (entry.name.endsWith('.js') || entry.name.endsWith('.gs')) {
                const destName = entry.name.replace(/\.[jt]s$/, '.gs');
                const destPath = path.join(dest, destName);

                // If we are processing transpiled output, it takes priority
                // If we are processing legacy source, only copy if destination doesn't exist yet
                if (isTranspiled || !fs.existsSync(destPath)) {
                    let content = fs.readFileSync(srcPath, 'utf8');
                    content = cleanContentForGAS(content);
                    fs.writeFileSync(destPath, content);
                }
            } else if (entry.name.endsWith('.ts')) {
                // Skip .ts files in the source dir (they are handled by tsc)
                continue;
            } else {
                // Copy other files (json, txt, etc.) as is
                const destPath = path.join(dest, entry.name);
                if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }
    }
}

// Start processing
if (fs.existsSync(serverSrcDir)) {
    // 1. First, process transpiled files (if any)
    if (fs.existsSync(serverTempOutDir)) {
        console.log('Processing transpiled TypeScript output...');
        processServerDir(serverTempOutDir, serverDistDir, true);
        // Cleanup temp dir
        fs.rmSync(serverTempOutDir, { recursive: true, force: true });
    }

    // 2. Then, process all other source files (legacy JS, data files, subdirectories)
    console.log('Processing legacy source and data files...');
    processServerDir(serverSrcDir, serverDistDir, false);
}

// 4. Process Client Files
console.log('Processing client files...');
const clientSrcDir = path.join(srcDir, 'client');

if (fs.existsSync(clientSrcDir)) {
    // Run Vite for client build
    console.log('Running Vite build for client...');
    try {
        // Vite is configured to output to dist/_vite_temp via config/vite.config.ts
        execSync('npx vite build -c config/vite.config.ts', { stdio: 'inherit' });

        // Post-processing: Move built files to root of dist
        // and strip legacy include tags that Vite kept as text
        const builtHtmlPath = path.join(distDir, '_vite_temp', 'src', 'client', 'html', 'main.html');
        if (fs.existsSync(builtHtmlPath)) {
            let html = fs.readFileSync(builtHtmlPath, 'utf8');
            // Remove GAS include tags like <?!= include(...) ?>
            html = html.replace(/<\?!= include\(['"][^'"]+['"]\);? \?>/g, '');

            // Save to final location
            const finalDestMain = path.join(distDir, 'client', 'html', 'main.html');
            const finalDestDir = path.dirname(finalDestMain);
            if (!fs.existsSync(finalDestDir)) fs.mkdirSync(finalDestDir, { recursive: true });
            fs.writeFileSync(finalDestMain, html);
        }

        // Copy unauthorized.html (static)
        const unauthorizedSrc = path.join(srcDir, 'client', 'html', 'unauthorized.html');
        if (fs.existsSync(unauthorizedSrc)) {
            const finalDestUnauth = path.join(distDir, 'client', 'html', 'unauthorized.html');
            const finalDestDir = path.dirname(finalDestUnauth);
            if (!fs.existsSync(finalDestDir)) fs.mkdirSync(finalDestDir, { recursive: true });
            fs.copyFileSync(unauthorizedSrc, finalDestUnauth);
        }

        // Cleanup Vite temp output
        const viteTempDir = path.join(distDir, '_vite_temp');
        if (fs.existsSync(viteTempDir)) {
            fs.rmSync(viteTempDir, { recursive: true, force: true });
        }
    } catch (e) {
        console.error('❌ Vite build failed. Aborting.');
        process.exit(1);
    }
}

console.log(`Build complete! Output in ${distDir}/`);
