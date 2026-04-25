const { execSync } = require('child_process');

console.log('Creating pre-deploy backup...');
try {
    const status = execSync('git status --porcelain').toString();
    if (status.trim() !== '') {
        // Stage all changes, stash them securely, and immediately re-apply them so the build continues
        execSync('git add .');
        execSync('git stash push -m "Pre-deploy automated backup"');
        execSync('git stash apply');
        console.log('✅ Changes backed up to git stash successfully!');
    } else {
        console.log('✅ Working directory clean, no backup needed.');
    }
} catch (e) {
    console.warn('⚠️ Backup process encountered an issue (this will not stop deployment):', e.toString());
}
