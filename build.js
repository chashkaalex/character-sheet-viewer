const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');
const outDir = path.join(__dirname, 'client', 'script');

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Get all .js files from source directory
const files = fs.readdirSync(srcDir).filter(file => file.endsWith('.js'));

files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const outPath = path.join(outDir, file.replace('.js', '.html'));

    const content = fs.readFileSync(srcPath, 'utf8');
    const htmlContent = `<script>\n${content}\n</script>`;

    fs.writeFileSync(outPath, htmlContent);
    console.log(`Built ${outPath}`);
});

console.log('Build complete!');
