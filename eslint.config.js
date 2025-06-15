import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Custom rule to enforce .js extensions on local imports
const localImportExtensionRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce .js extension on local module imports",
      category: "Possible Errors",
    },
    fixable: "code",
    schema: [],
    messages: {
      missingJsExtension:
        'Local imports must end with .js extension. Import "{{source}}" should be "{{corrected}}"',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        // Check if it's a relative import (starts with . or ..)
        if (
          typeof source === "string" &&
          (source.startsWith("./") || source.startsWith("../"))
        ) {
          // Check if it doesn't end with .js
          if (!source.endsWith(".js")) {
            // Allow if it already has another extension (like .json, .d.ts, etc.)
            const hasExtension = /\.[a-zA-Z0-9]+$/.test(source);
            if (!hasExtension) {
              const corrected = source + ".js";
              context.report({
                node: node.source,
                messageId: "missingJsExtension",
                data: {
                  source,
                  corrected,
                },
                fix(fixer) {
                  return fixer.replaceText(node.source, `"${corrected}"`);
                },
              });
            }
          }
        }
      },
    };
  },
};

export default tseslint.config(
  // Ignore dist and node_modules
  {
    ignores: ["dist/**/*", "node_modules/**/*"],
  },

  // Base JavaScript recommended rules for JS config files
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
    rules: {
      "no-console": "warn",
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  // TypeScript configuration
  {
    files: ["**/*.ts"],
    plugins: {
      "local-imports": {
        rules: {
          "require-js-extension": localImportExtensionRule,
        },
      },
    },
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Basic ESLint rules
      "no-unused-vars": "off", // Turn off base rule
      "no-console": "warn",
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",

      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-inferrable-types": "off",

      // Import rules
      "no-duplicate-imports": "error",

      // Custom rule for local imports
      "local-imports/require-js-extension": "error",
    },
  },
);
