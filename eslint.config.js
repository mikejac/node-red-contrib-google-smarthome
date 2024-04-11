const js = require('@eslint/js');
const jsdoc = require('eslint-plugin-jsdoc'); 
const globals = require('globals'); 

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
    js.configs.recommended,
    jsdoc.configs['flat/recommended'],
    {
        files: ["**/*.js", "**/*.html"],
        languageOptions: {
            globals: {
                ...globals.es6,
                ...globals.node,
                ...globals.mocha,
                RED: "readonly"
            },
            sourceType: "commonjs"
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
            "no-constant-condition": ["error",  {
                "checkLoops": false
            }],
        }
    }
];
