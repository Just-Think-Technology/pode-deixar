module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 30000,
  verbose: true,
};
