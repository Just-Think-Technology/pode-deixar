module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFiles: ['<rootDir>/test/load-env.ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testTimeout: 30000,
  verbose: true,
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  testEnvironmentOptions: {
    env: {
      NODE_ENV: 'test',
    },
  },
};