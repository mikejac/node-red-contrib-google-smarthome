import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc'; 
import globals from 'globals'; 

/** @type {import('eslint').Linter.Config[]} */
export default [
    // exclude build output
    {
        ignores: ["dist/**"]
    },

    js.configs.recommended,
    jsdoc.configs['flat/recommended'],
    {
        files: ["**/*.{js,mjs}", "**/*.html"],
        languageOptions: {
            globals: {
                ...globals.es6,
                ...globals.node,
                RED: "readonly"
            },
            sourceType: "module"
        },
        plugins: {
            jsdoc: jsdoc,
        },
        settings: {
            jsdoc: {
                mode: "typescript"
            }
        },
        rules: {
            "indent": ["error", 4, {
                "SwitchCase": 1
            }],
            "jsdoc/require-hyphen-before-param-description": 1,
            "jsdoc/tag-lines": ["error", "any", {
                "startLines": 1
            }],
        }
    },
    {
        files: ["test/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.mocha,
            },
        },
    }
];
