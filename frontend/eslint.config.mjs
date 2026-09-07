import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["test/**", "tests/**", "**/*.spec.*", "**/*.test.*", ".next/", ".next-e2e/", "coverage/", "dist/", "node_modules/"],
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