import { existsSync } from 'node:fs';
import path from 'node:path';

// ESLint 9's flat config resolves relative to the process cwd, not per linted
// file - running a single `eslint` from the repo root would miss every
// package's own eslint.config.js (there's no root-level one on purpose, since
// each package/app needs its own tsconfigRootDir for type-aware linting).
// Group staged files by their workspace package and point ESLint at that
// package's config explicitly instead.
function eslintTasksByPackage(filenames) {
  const groups = new Map();

  for (const file of filenames) {
    const rel = path.relative(process.cwd(), file).split(path.sep).join('/');
    const match = /^(apps|packages)\/([^/]+)\//.exec(rel);
    if (!match) continue; // a root-level config file - prettier still formats it, just no eslint pass

    const pkgDir = `${match[1]}/${match[2]}`;
    // A handful of config-only packages (e.g. packages/eslint-config itself,
    // packages/tsconfig) have nothing to type-check and so carry no
    // eslint.config.js of their own - prettier still formats their files.
    if (!existsSync(path.resolve(pkgDir, 'eslint.config.js'))) continue;

    const list = groups.get(pkgDir) ?? [];
    list.push(file);
    groups.set(pkgDir, list);
  }

  return Array.from(groups.entries()).map(
    ([pkgDir, files]) =>
      `eslint --fix --max-warnings=0 --config ${pkgDir}/eslint.config.js ${files.map((f) => JSON.stringify(f)).join(' ')}`,
  );
}

/** @type {import("lint-staged").Configuration} */
const config = {
  '*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}': [eslintTasksByPackage, 'prettier --write'],
  '*.{css,json,less,md,mdx,sass,scss,yaml,yml}': 'prettier --write',
};

export default config;
