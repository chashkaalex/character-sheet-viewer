import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const configDir = path.join(rootDir, 'config');

function runStep(name: string, command: string) {
    console.log(`\n--- [STEP] ${name} ---`);
    console.log(`Running: ${command}`);
    try {
        execSync(command, { stdio: 'inherit', cwd: rootDir });
    } catch (e) {
        console.error(`\n❌ Error during ${name}. Aborting pipeline.`);
        process.exit(1);
    }
}

function copyConfig(env: 'test' | 'prod') {
    const src = path.join(configDir, `.clasp.${env}.json`);
    const dest = path.join(distDir, '.clasp.json');
    
    if (!fs.existsSync(src)) {
        console.error(`❌ Configuration file not found: ${src}`);
        process.exit(1);
    }

    console.log(`Injecting ${env} configuration into dist/...`);
    fs.copyFileSync(src, dest);
}

import * as readline from 'readline';

function getCommitMessageArg(): string | null {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-m' || args[i] === '--message') {
            return args[i + 1] || null;
        }
        if (args[i].startsWith('-m=')) {
            return args[i].substring(3) || null;
        }
        if (args[i].startsWith('--message=')) {
            return args[i].substring(10) || null;
        }
    }
    return null;
}

async function promptForCommitMessage(): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('\n📝 Enter commit message for uncommitted changes: ', (answer: string) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function handleGitPush() {
    console.log('\n--- [STAGE] Git Commit & Push ---');
    try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir }).toString().trim() || 'main';
        const status = execSync('git status --porcelain', { cwd: rootDir }).toString().trim();

        if (status !== '') {
            let message = getCommitMessageArg();
            if (!message) {
                message = await promptForCommitMessage();
            }

            if (!message) {
                const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                message = `chore: automated deploy release (${timestamp})`;
                console.log(`No message provided. Using default: "${message}"`);
            }

            console.log('Staging changes...');
            execSync('git add -A', { stdio: 'inherit', cwd: rootDir });
            console.log(`Committing changes: "${message}"`);
            execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'inherit', cwd: rootDir });
        } else {
            console.log('Working directory clean. Checking for pending commits to push...');
        }

        console.log(`Pushing to origin/${branch}...`);
        execSync(`git push origin ${branch}`, { stdio: 'inherit', cwd: rootDir });
        console.log(`✅ Successfully pushed to origin/${branch}!`);
    } catch (err: any) {
        console.error('❌ Failed during Git commit/push stage:', err.message);
        process.exit(1);
    }
}

async function main() {
    // 1. Git Stash
    runStep('Backup (Git Stash)', 'npm run backup');

    // 2. Lint
    runStep('Linting', 'npm run lint:fix');

    // 3. Local TS Tests
    runStep('Local TS Tests', 'npm run test:local');

    // 4. Build (Agnostic)
    runStep('Building dist/', 'node build/build.js');

    // 5. TEST STAGE
    console.log('\n--- [STAGE] TEST Environment Deployment ---');
    copyConfig('test');
    runStep('Push to TEST', 'cd dist && clasp push');
    runStep('Remote Verification (TEST)', 'npx ts-node --compiler-options "{\\"module\\":\\"CommonJS\\",\\\"esModuleInterop\\\":true}" src/tests/remote_tests/remote_tests.ts test');

    // 6. PROD STAGE
    console.log('\n--- [STAGE] PROD Environment Deployment ---');
    copyConfig('prod');
    runStep('Push to PROD', 'cd dist && clasp push');

    // 7. Git Push
    await handleGitPush();

    console.log('\n✅ PIPELINE COMPLETED SUCCESSFULLY! All environments and git remote updated.');
}

main().catch((err) => {
    console.error('Unexpected error in pipeline:', err);
    process.exit(1);
});

