import js from "@eslint/js";
import solid from "eslint-plugin-solid/configs/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "src-tauri/**", "node_modules/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, solid],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // tsc owns unused-detection via noUnusedLocals/noUnusedParameters (and it
      // honors the leading-underscore convention), so don't double-report here.
      "@typescript-eslint/no-unused-vars": "off",
      // Import ordering mirrors the layer-based structure (see notes/current-plan).
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^\\u0000"], // side-effect imports (e.g. global.css)
            ["^solid-js", "^@solidjs"], // Solid core + router
            ["^@?\\w"], // other third-party packages
            ["^~/api", "^~/types"], // backend boundary + shared types
            ["^~/hooks", "^~/lib"], // logic layer
            ["^~/components"], // components
            ["^~/"], // any other internal alias
            ["^\\.\\."], // parent relative
            ["^\\."], // sibling / index relative
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
);
