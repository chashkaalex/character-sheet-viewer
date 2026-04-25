module.exports = {
    rootDir: '..',
    verbose: true,
    testEnvironment: 'node',
    roots: ['<rootDir>/src/local_tests'],
    testMatch: ['**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
};
