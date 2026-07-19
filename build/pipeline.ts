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

console.log('\n✅ PIPELINE COMPLETED SUCCESSFULLY! All environments updated.');
