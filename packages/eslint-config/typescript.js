import tseslint from 'typescript-eslint';

export const typescriptFiles = ['**/*.{ts,tsx,mts,cts}'];

export const requiredTypeAwareRules = [
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/no-floating-promises',
  '@typescript-eslint/no-misused-promises',
  '@typescript-eslint/no-unsafe-argument',
  '@typescript-eslint/no-unsafe-assignment',
  '@typescript-eslint/no-unsafe-call',
  '@typescript-eslint/no-unsafe-declaration-merging',
  '@typescript-eslint/no-unsafe-enum-comparison',
  '@typescript-eslint/no-unsafe-function-type',
  '@typescript-eslint/no-unsafe-member-access',
  '@typescript-eslint/no-unsafe-return',
  '@typescript-eslint/no-unsafe-type-assertion',
  '@typescript-eslint/no-unsafe-unary-minus',
  '@typescript-eslint/only-throw-error',
  '@typescript-eslint/require-await',
  '@typescript-eslint/switch-exhaustiveness-check',
];

/** @param {{ tsconfigRootDir: string }} options */
export function createTypeScriptConfig({ tsconfigRootDir }) {
  const requiredRules = Object.fromEntries(
    requiredTypeAwareRules.map((ruleName) => [ruleName, 'error']),
  );

  return {
    files: typescriptFiles,
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: {
          // vitest.config.ts/vitest.setup.ts aren't part of any app's own
          // tsconfig `include` (that would pull them into that app's real
          // build/rootDir) - lint them against an inferred single-file
          // project instead of requiring project membership. Named exactly,
          // not a broad `*.config.ts` glob, so this never collides with an
          // app that already covers its own root configs via a real project
          // (e.g. apps/web and apps/admin's vite.config.ts + tsconfig.node.json).
          allowDefaultProject: ['vitest.config.ts', 'vitest.setup.ts'],
        },
        tsconfigRootDir,
      },
    },
    rules: {
      ...requiredRules,
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          minimumDescriptionLength: 10,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Numbers always stringify predictably - disallowing them here would mean
      // wrapping routine `${count} items`-style interpolation in String() everywhere
      // for no real safety benefit. Everything else stays disallowed (objects,
      // nullish values, etc. can still produce misleading output).
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  };
}
