import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["test/**", "tests/**", "**/*.spec.*", "**/*.test.*"],
  },
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
    },
    rules: {
      "no-console": "off",
    },
  },
]);