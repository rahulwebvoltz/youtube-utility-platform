import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { createTypeScriptConfig } from './typescript.js';

const javascriptFiles = ['**/*.{cjs,js,mjs}'];

/** @param {{ tsconfigRootDir: string }} options */
export function createBaseConfig({ tsconfigRootDir }) {
  return tseslint.config(
    { ignores: ['dist/**', 'build/**', '.turbo/**', 'node_modules/**', 'coverage/**'] },
    js.configs.recommended,
    { languageOptions: { globals: globals.node } },
    createTypeScriptConfig({ tsconfigRootDir }),
    {
      files: javascriptFiles,
      extends: [tseslint.configs.disableTypeChecked],
    },
    prettier,
  );
}

export default createBaseConfig;
