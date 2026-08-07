// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "e2e/*"],
  },
  {
    rules: {
      // A DOM rule: it exists because a raw ' in HTML can be ambiguous. React Native <Text>
      // does no entity parsing, so "Don't" is simply correct here. Left on, it buried the
      // 14 real findings under 46 false ones.
      "react/no-unescaped-entities": "off",
    },
  },
]);
