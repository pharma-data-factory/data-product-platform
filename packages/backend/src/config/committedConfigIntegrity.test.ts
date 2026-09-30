import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { ConfigReader } from '@backstage/config';

const ROOT = path.resolve(__dirname, '../../../..');

const RBAC_DEPLOYMENT_CONFIGS = [
  'app-config.yaml',
  'app-config.docker.yaml',
  'app-config.production.yaml',
  'app-config.marketplace-test.yaml',
] as const;

const COMMITTED_APP_CONFIGS = [
  ...RBAC_DEPLOYMENT_CONFIGS,
  'app-config.github.yaml',
  'app-config.local.yaml',
  // NXD-097. Committed and loaded by CI; its credentials come from the job's
  // environment and must stay there.
  'app-config.e2e.yaml',
] as const;

const SECRET_ASSIGNMENT =
  /^\s*(?:clientSecret|privateKey|webhookSecret|password|secret|token):\s*(.+)$/;

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

/** Layers config files the way the container entrypoints pass them to the backend. */
function mergeConfigs(relatives: readonly string[]): ConfigReader {
  return ConfigReader.fromConfigs(
    relatives.map(relative => ({
      context: relative,
      data: parseYaml(read(relative)) ?? {},
    })),
  );
}

describe('committed Control Plane configuration integrity', () => {
  it('enables the Permission Framework on every intended RBAC deployment overlay', () => {
    for (const relative of RBAC_DEPLOYMENT_CONFIGS) {
      // Read the parsed key rather than scanning the text for `enabled:`,
      // which cannot tell the Permission Framework apart from any other
      // feature flag in the file and reported a failure for an unrelated
      // `ursComposer.ai.enabled: false`.
      expect(mergeConfigs([relative]).getOptionalBoolean('permission.enabled')).toBe(
        true,
      );
    }
  });

  it('does not hard-code secrets in committed app-config overlays', () => {
    for (const relative of COMMITTED_APP_CONFIGS) {
      const text = read(relative);
      expect(text).not.toMatch(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(text).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
      expect(text).not.toMatch(/ghs_[A-Za-z0-9]{20,}/);
      expect(text).not.toMatch(/github_pat_[A-Za-z0-9_]+/);

      for (const line of text.split(/\r?\n/)) {
        const match = line.match(SECRET_ASSIGNMENT);
        if (!match) {
          continue;
        }
        const value = match[1].trim();
        if (!value || value.startsWith('#')) {
          continue;
        }
        expect(value).toMatch(/^\$\{[A-Z0-9_]+(?::-.*)?\}$/);
      }
    }
  });

  it('keeps credentials out of frontend-visible configuration keys', () => {
    for (const relative of COMMITTED_APP_CONFIGS) {
      const text = read(relative);
      expect(text).not.toMatch(
        /@visibility frontend\s*\r?\n\s+(?:clientSecret|privateKey|webhookSecret|password|secret|token):/,
      );
    }
  });

  it('omits catalog samples from hosted RBAC overlays', () => {
    expect(read('app-config.docker.yaml')).not.toContain('catalog/samples');
    expect(read('app-config.production.yaml')).not.toContain('catalog/samples');
    expect(read('app-config.yaml')).toContain('catalog/samples/entities.yaml');
  });

  // The deployed configuration is the base file plus an overlay, in that
  // order. Reading an overlay on its own says nothing about what the backend
  // actually sees, which is how production came to run the URS audit trail in
  // memory: the overlay simply did not mention the key, so the base value won.
  // These assertions merge the files the way the container entrypoints do.
  describe.each([
    ['production', ['app-config.yaml', 'app-config.production.yaml']],
    ['docker', ['app-config.yaml', 'app-config.docker.yaml']],
  ])('merged %s configuration', (_name, files) => {
    const config = mergeConfigs(files);

    it('stores URS records in Postgres, not in memory', () => {
      // In-memory mode has no audit trail, no immutability triggers and no
      // transactions, and loses every record on restart.
      expect(config.getOptionalString('ursComposer.persistence.mode')).toBe(
        'postgres',
      );
    });

    it('stores Validation Expert runs in Postgres, not in a file', () => {
      // NXD-090. The base file leaves the key unset, which falls back to a
      // JSON file inside the container; the plugin now refuses to start with
      // that in production, so an overlay that forgets it fails loudly.
      expect(
        config.getOptionalString('validationExpert.persistence.mode'),
      ).toBe('postgres');
    });

    it('runs as a production auth environment with permissions enabled', () => {
      expect(config.getOptionalString('auth.environment')).toBe('production');
      expect(config.getOptionalBoolean('permission.enabled')).toBe(true);
    });
  });

  describe('scaffolder author tools (NXD-098)', () => {
    const AUTHOR_TOOLS = [
      'sub-page:scaffolder/editor',
      'sub-page:scaffolder/actions',
      'sub-page:scaffolder/templating-extensions',
    ];

    /** `app.extensions` as the frontend reads it: id -> enabled flag. */
    function extensionFlags(files: string[]): Map<string, unknown> {
      const entries =
        (mergeConfigs(files).getOptional('app.extensions') as
          | Array<Record<string, unknown>>
          | undefined) ?? [];
      return new Map(entries.flatMap(entry => Object.entries(entry)));
    }

    it('switches them off in the merged production configuration', () => {
      const flags = extensionFlags(['app-config.yaml', 'app-config.production.yaml']);
      for (const id of AUTHOR_TOOLS) {
        expect(flags.get(id)).toBe(false);
      }
    });

    it('keeps every base extension setting, because an overlay list replaces the base list', () => {
      const base = extensionFlags(['app-config.yaml']);
      const production = extensionFlags([
        'app-config.yaml',
        'app-config.production.yaml',
      ]);
      expect(base.size).toBeGreaterThan(0);
      for (const [id, value] of base) {
        expect(production.get(id)).toEqual(value);
      }
    });

    it('leaves them available for local development', () => {
      const flags = extensionFlags(['app-config.yaml']);
      for (const id of AUTHOR_TOOLS) {
        expect(flags.has(id)).toBe(false);
      }
    });
  });

  it('does not embed credential values in frontend source', () => {
    const appSrc = path.join(ROOT, 'packages/app/src');
    const pluginSrc = path.join(ROOT, 'plugins/data-products/src');
    const files = [
      ...listFiles(appSrc, /\.(tsx?)$/),
      ...listFiles(pluginSrc, /\.(tsx?)$/),
    ];
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      expect(text).not.toMatch(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(text).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
      expect(text).not.toMatch(/ghs_[A-Za-z0-9]{20,}/);
      expect(text).not.toMatch(/github_pat_[A-Za-z0-9_]+/);
    }
  });
});

function listFiles(dir: string, match: RegExp): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...listFiles(full, match));
    } else if (match.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}
