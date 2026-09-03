import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig({
  ignores: [
    // Ignore test files - they should be validated by Jest, not ESLint
    "test/**",
    "tests/**",
    "**/*.spec.*",
    "**/*.test.*",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ],
  rules: {
    ...nextVitals,
    ...nextTs,
    "react-hooks/set-state-in-effect": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
});

export default eslintConfig;
