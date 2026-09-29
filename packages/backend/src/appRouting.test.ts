/**
 * A link this repository builds must point at a path this app serves.
 *
 * `PHASE_CLOSURE_PLAN.md` §9.6 recorded a defect here: `@backstage/plugin-
 * catalog-graph` is a declared dependency of this package that `App.tsx` never
 * registers, so the `/catalog-graph?rootEntityRefs=…` links built by
 * `catalogGraphPath` in `plugin-data-products` and by the Platform Components
 * page point at an unrouted path.
 *
 * **The defect does not exist.** Opened in a browser against the running app,
 * with `App.tsx` exactly as it ships, `/catalog-graph` renders the Catalog
 * Graph page — filter panel, the plugin's own query defaults, the lot.
 * `createApp` from `@backstage/frontend-defaults` **discovers** frontend
 * features from `package.json` dependencies; naming one in `features` is how
 * you configure or override it, not how you turn it on. The finding was
 * derived by reading `App.tsx` and never checked against the page. NXD-085.
 *
 * So the invariant worth holding is not the one that was assumed. It is:
 * **if something still links to the path, the package that serves it must
 * remain a dependency** — because discovery keys off `dependencies`, a
 * `yarn remove` is all it takes to break every one of those links, silently
 * and with `App.tsx` untouched.
 *
 * Deliberately not attempted: "every `@backstage/plugin-*` dependency that
 * exports `./alpha` must be registered in `App.tsx`". It flags thirteen
 * packages and eleven are correct as they are — `plugin-catalog-react` and
 * `plugin-search-react` are libraries with no page, and `plugin-scaffolder`,
 * `plugin-search` and `plugin-user-settings` are reached through this app's
 * own modules. A guard that cries wolf teaches people to add exceptions.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Lives here rather than in `packages/app`, whose ESLint config restricts
// `fs` and `path` — correctly, since nothing in a browser bundle may reach
// them. `templateContract.test.ts` beside it reads `templates/**` the same
// way: repository-structure assertions belong to the workspace that is
// allowed to look at the repository.
const ROOT = join(__dirname, '..', '..', '..');
const APP_PACKAGE_JSON = join(ROOT, 'packages', 'app', 'package.json');

/** Linked path → the dependency whose discovery serves it. */
const SERVED_BY = [
  { path: '/catalog-graph', dependency: '@backstage/plugin-catalog-graph' },
];

const SOURCE_ROOTS = [join(ROOT, 'packages'), join(ROOT, 'plugins')];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-types', 'coverage']);

function sourceFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !full.endsWith('appRouting.test.ts')) {
      // This file names the path it guards, so counting itself as a linker
      // would make the guard require the dependency forever.
      found.push(full);
    }
  }
  return found;
}

describe('app routing', () => {
  const files = SOURCE_ROOTS.flatMap(sourceFiles);
  const dependencies: Record<string, string> = JSON.parse(
    readFileSync(APP_PACKAGE_JSON, 'utf8'),
  ).dependencies;

  it('finds source files to check, so an empty sweep cannot pass silently', () => {
    // Without this, a broken directory walk turns the assertion below into a
    // vacuous truth — the failure mode of every "for each file" test.
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(SERVED_BY)(
    'keeps $dependency, because something links to $path',
    ({ path, dependency }) => {
      const linkers = files.filter(file =>
        readFileSync(file, 'utf8').includes(`${path}?`),
      );
      if (linkers.length === 0) {
        // Nobody links to it any more. Keeping the dependency is then a choice
        // rather than an obligation, and this row can go with the links.
        return;
      }

      expect({ path, declared: dependency in dependencies }).toEqual({
        path,
        declared: true,
      });
    },
  );
});
