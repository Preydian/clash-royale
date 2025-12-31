import typescriptEslint from "@typescript-eslint/eslint-plugin";
import _import from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";
import jsdoc from 'eslint-plugin-jsdoc';

export default [{
ignores: [
  "**/__generated__/",
  "src/test/",
  "**/scripts/",
  "**/node_modules",
  "**/dist",
  "**/*.queries.ts",
  "**/server",
  "vite.config.ts",
  "tailwind.config.js",
  "postcss.config.js"
],
}, eslintConfigPrettier, js.configs.recommended, {
plugins: {
  "@typescript-eslint": typescriptEslint,
  import: _import,
  prettier,
  jsdoc,
},

files: ["src/**/*.ts", "src/**/*.tsx"],

languageOptions: {
  globals: {
      ...globals.node,
  },

  parser: tsParser,
  ecmaVersion: 12,
  sourceType: "module",

  parserOptions: {
      project: ["./tsconfig.json"],
  },
},

rules: {
  "prettier/prettier": "error",
  "object-curly-spacing": ["warn", "always"],
  "spaced-comment": ["warn", "always"],
  "no-unused-vars": "off",
  // "It is safe to disable this rule when using TypeScript because 
  //  TypeScript's compiler enforces this check."
  // https://eslint.org/docs/latest/rules/no-undef#handled_by_typescript
  // Applies for the below
  "no-redeclare": "off",
  "no-dupe-class-members": "off",
  "no-undef": "off",

  "import/no-extraneous-dependencies": ["error", {
      devDependencies: false,
      optionalDependencies: false,
      peerDependencies: false,
  }],

  "@typescript-eslint/no-unused-vars": ["warn", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
  }],

  "jsdoc/require-jsdoc": ["error", {"require": {
      "FunctionDeclaration": false,
  }}],

  // "@typescript-eslint/no-unsafe-assignment": "error",

  camelcase: "off",
  "no-unused-expressions": "warn",
  "no-multi-str": "off",
  "no-empty-pattern": "off",
  // "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-non-null-assertion": "off",

  "no-constant-condition": ["error", {
      checkLoops: false,
  }],

  "@typescript-eslint/no-unnecessary-condition": ["error", {
      allowConstantLoopConditions: true,
  }],

  "max-params": ["error", 2],
  curly: ["error", "multi-line"],

  // "@typescript-eslint/restrict-template-expressions": ["error", {
  //     // allowAny: false,
  //     allowNullish: false,
  //     allowBoolean: true,
  //     allowRegExp: false,
  // }],

  "no-console": "warn",
},
}];
