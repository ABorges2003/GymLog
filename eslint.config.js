// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", ".claude/*", "android/*", "ios/*"],
  },
  {
    // Tests load modules after jest.mock() with require().
    files: ["**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
