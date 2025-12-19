module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        '**/*.js',
        '!**/node_modules/**',
        '!**/coverage/**',
        '!jest.config.js',
        '!seedAdmin.js'
    ],
    coveragePathIgnorePatterns: [
        "/node_modules/"
    ],
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    resetModules: true,
    restoreMocks: true
};
