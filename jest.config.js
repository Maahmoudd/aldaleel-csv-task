export default {
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/logger.js',
    '!src/database/cli.js',
    '!src/database/migrations/**',
    '!src/database/seeders/**',
    '!src/server.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 85,
      lines: 80,
      statements: 80,
    },
  },
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  testEnvironment: 'node',
  transform: {},
};
