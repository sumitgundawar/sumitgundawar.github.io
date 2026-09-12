import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src/components/ui"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  /* The Worker gets the unused-symbol rule the site does not.
   *
   * This is the rule that would have caught the dead cron. postWeekly and
   * postAlerts were imported into worker/src/index.ts and never called, for the
   * entire life of the reporting feature, while wrangler.jsonc declared two cron
   * triggers against a Worker that exported only fetch. Nothing ran, no report
   * was ever delivered, and the only visible trace was those two imports, which
   * "off" made invisible.
   *
   * Scoped to the Worker rather than turned on globally, because the site has a
   * lot of intentionally-unused destructured values and this is about the one
   * package where an unused import means something is not wired up.
   */
  {
    files: ["worker/src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
);
