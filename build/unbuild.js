const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const gasServerDir = path.join(rootDir, 'gas_backup', 'server');
const localServerDir = path.join(rootDir, 'server');
const gasClientScriptDir = path.join(rootDir, 'gas_backup', 'client', 'script');
const gasClientHtmlDir = path.join(rootDir, 'gas_backup', 'client', 'html');
const gasClientStyleDir = path.join(rootDir, 'gas_backup', 'client', 'style');
const localClientSrcDir = path.join(rootDir, 'client', 'src');
const localClientHtmlDir = path.join(rootDir, 'client', 'html');
const localClientStyleDir = path.join(rootDir, 'client', 'style');

function unbuildServerFiles(gasDir, localDir) {
    if (!fs.existsSync(gasDir)) return;
    const entries = fs.readdirSync(gasDir, { withFileTypes: true });

    for (const entry of entries) {
        const gasPath = path.join(gasDir, entry.name);
        const localPath = path.join(localDir, entry.name);

        if (entry.isDirectory()) {
            if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, { recursive: true });
            unbuildServerFiles(gasPath, localPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const parentDir = path.dirname(localPath);
            if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
            
            if (!fs.existsSync(localPath)) {
                console.log(`New file from GAS: ${localPath}`);
                fs.copyFileSync(gasPath, localPath);
                continue;
            }

            // Extract requires and exports from local file
            const localLines = fs.readFileSync(localPath, 'utf8').split('\n');
            const requires = [];
            const exportsBlock = [];
            let inExports = false;

            for (const line of localLines) {
                if (line.includes('require(')) {
                    requires.push(line);
                }
                if (line.includes('if (typeof module !== \'undefined\')') || line.includes('module.exports =')) {
                    inExports = true;
                }
                if (inExports) {
                    exportsBlock.push(line);
                }
            }

            // Graft onto GAS file
            const gasContent = fs.readFileSync(gasPath, 'utf8');
            let newContent = requires.join('\n');
            if (requires.length > 0) newContent += '\n\n';
            newContent += gasContent;
            if (exportsBlock.length > 0 && !gasContent.includes('module.exports')) {
                newContent += '\n\n' + exportsBlock.join('\n');
            }

            fs.writeFileSync(localPath, newContent);
            console.log(`Unbuilt server script -> ${localPath}`);
        }
    }
}

function unbuildClientScripts(gasDir, localDir) {
    if (!fs.existsSync(gasDir)) return;
    const entries = fs.readdirSync(gasDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.html')) {
            const gasPath = path.join(gasDir, entry.name);
            const localName = entry.name.replace('.html', '.js');
            const localPath = path.join(localDir, localName);

            let content = fs.readFileSync(gasPath, 'utf8');
            content = content.replace(/<script>/gi, '').replace(/<\/script>/gi, '').trim();

            fs.writeFileSync(localPath, content);
            console.log(`Unbuilt client script -> ${localPath}`);
        }
    }
}

function copyDirRaw(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRaw(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Unbuilding server files...');
unbuildServerFiles(gasServerDir, localServerDir);

console.log('Unbuilding client scripts...');
unbuildClientScripts(gasClientScriptDir, localClientSrcDir);

console.log('Copying static HTML and styles...');
copyDirRaw(gasClientHtmlDir, localClientHtmlDir);
copyDirRaw(gasClientStyleDir, localClientStyleDir);

console.log('Unbuild complete!');
