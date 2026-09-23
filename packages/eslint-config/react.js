import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import react from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { createTypeScriptConfig } from './typescript.js';

/** @param {{ tsconfigRootDir: string }} options */
export function createReactConfig({ tsconfigRootDir }) {
  return tseslint.config(
    { ignores: ['dist/**', 'build/**', '.turbo/**', 'node_modules/**', 'coverage/**'] },
    js.configs.recommended,
    react.configs.flat.recommended,
    react.configs.flat['jsx-runtime'],
    jsxA11y.flatConfigs.recommended,
    {
      languageOptions: { globals: globals.browser },
      settings: { react: { version: 'detect' } },
      plugins: {
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react/prop-types': 'off',
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      },
    },
    createTypeScriptConfig({ tsconfigRootDir }),
    prettier,
  );
}

export default createReactConfig;
