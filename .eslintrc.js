module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { node: true, es2022: true },
  ignorePatterns: [
    "artifacts/",
    "cache/",
    "types/",
    "coverage/",
    "typechain-types/**",
    "ignition/**",
    "scripts/**/*.js",
    "utils/**/*.js"
  ],
  rules: {
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }
    ],
  },
  overrides: [
    {
      files: ["**/*.js"],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
      },
    },
    {
      files: ["test/**/*.ts", "test/**/*.js", "**/*.test.ts", "**/*.spec.ts"],
      rules: {
        "@typescript-eslint/no-unused-expressions": "off",
      },
    },
  ],
};
