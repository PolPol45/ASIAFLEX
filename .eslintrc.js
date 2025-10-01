module.exports = {
  env: {
    browser: false,
    es6: true,
    node: true,
    mocha: true,
  },
  extends: ["eslint:recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    warnOnUnsupportedTSVersion: false,
  },
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "prettier/prettier": "error",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "prefer-const": "error",
    "no-var": "error",
  },
  ignorePatterns: ["node_modules/", "dist/", "artifacts/", "cache/", "typechain-types/", "coverage/"],
};
