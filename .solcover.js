module.exports = {
  skipFiles: [
    'test/',
    'node_modules/',
    'contracts/mocks/'
  ],
  measureStatementCoverage: true,
  measureFunctionCoverage: true,
  measureBranchCoverage: true,
  measureLineCoverage: true,
  istanbulReporter: ['html', 'lcov', 'text', 'json'],
  providerOptions: {
    mnemonic: "test test test test test test test test test test test junk"
  },
  mocha: {
    grep: "@skip-on-coverage",
    invert: true
  }
};