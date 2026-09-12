// jest.config.js
//
// Jest configuration for user-service unit tests.
// Coverage output in multiple formats:
//   - text-summary  : printed to console for quick visual feedback
//   - lcov          : consumed by SonarQube (Sonar reads lcov.info)
//   - html          : local browsing in coverage/lcov-report/index.html
// junit.xml is generated separately via jest-junit reporter
// (see package.json test script).

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/db.js',           // exclude DB init (integration concern)
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov', 'html', 'cobertura'],

  // Fail fast if coverage drops below threshold — same target that
  // SonarQube Quality Gate enforces (75% line coverage on new code)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 75,
      statements: 75,
    },
  },

  // Show individual test names in output
  verbose: true,

  // Prevent tests hanging on open DB handles etc.
  forceExit: true,
  detectOpenHandles: true,
};
