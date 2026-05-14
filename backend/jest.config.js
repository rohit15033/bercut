module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['services/**/*.js', 'routes/**/*.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
}
