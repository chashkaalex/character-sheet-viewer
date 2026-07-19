module.exports = {
    rootDir: '..',
    verbose: true,
    testEnvironment: 'node',
    roots: ['<rootDir>/src/tests/local_tests'],
    testMatch: ['**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'config/tsconfig.json',
            isolatedModules: true,
        }],
    },
};
