module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        '**/*.ts',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**',
        '!jest.config.js',
        '!seedAdmin.ts',
        '!types/**/*.d.ts'
    ],
    coveragePathIgnorePatterns: [
        "/node_modules/"
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/'
    ],
    testTimeout: 30000,
    verbose: true,
    resetModules: true,
    restoreMocks: true,
    moduleFileExtensions: ['ts', 'js', 'json']
};
