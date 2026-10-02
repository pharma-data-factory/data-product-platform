import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const backendIndex = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
const appConfig = fs.readFileSync(
  path.resolve(__dirname, '../../../app-config.yaml'),
  'utf8',
);
const guestConfig = fs.readFileSync(
  path.resolve(__dirname, '../../../app-config.guest.yaml'),
  'utf8',
);
const productionConfig = fs.readFileSync(
  path.resolve(__dirname, '../../../app-config.production.yaml'),
  'utf8',
);

/**
 * The template directories both configs must register, kept as one list
 * because keeping two let them drift: `aas-data-product` was registered in
 * development and not in production, so a template that existed, was
 * contract-tested and appeared locally could not be used by anyone.
 *
 * Deliberately absent, matching `templateContract.test.ts`: `aas-asset`
 * publishes nothing, and `examples/` is the stock Backstage sample.
 */
const REGISTERED_TEMPLATE_DIRS = [
  'python-service',
  'node-service',
  'mqtt-connector',
  'mqtt-temperature-product',
  'rest-equipment-product',
  'unified-namespace',
  'machine-state-consumer',
  'oee-data-product',
  'aas-data-product',
];

describe('Backstage foundation', () => {
  it('starts the current backend architecture with required plugins', () => {
    expect(backendIndex).toContain(
      "import { createBackend } from '@backstage/backend-defaults'",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-catalog-backend'))",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-scaffolder-backend'))",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-scaffolder-backend-module-github'))",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-techdocs-backend'))",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-search-backend'))",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-auth-backend-module-github-provider'))",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@internal/plugin-data-products-backend'))",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@internal/plugin-entitlements-backend'))",
    );
    expect(backendIndex).toContain('permissionModulePlatformPolicy');
    expect(backendIndex).toContain('aasPlugin');
    expect(backendIndex).toContain('catalogModuleCertificationOverlay');
    expect(backendIndex).not.toContain(
      'plugin-permission-backend-module-allow-all-policy',
    );
    expect(backendIndex).not.toContain('plugin-kubernetes-backend');
    expect(backendIndex).toContain('backend.start()');
  });

  it('registers official templates in catalog configuration', () => {
    // Asserted against both configs from one list, and reported per directory
    // so the diff names the template and the environment that is missing it
    // rather than only that some string was absent. The two paths differ
    // because the configs resolve from different working directories.
    expect(
      REGISTERED_TEMPLATE_DIRS.map(dir => ({
        dir,
        development: appConfig.includes(`../../templates/${dir}/template.yaml`),
        production: productionConfig.includes(
          `./templates/${dir}/template.yaml`,
        ),
      })),
    ).toEqual(
      REGISTERED_TEMPLATE_DIRS.map(dir => ({
        dir,
        development: true,
        production: true,
      })),
    );
    expect(appConfig).toContain(
      'allow: [Component, System, API, Resource, Location, Template, Domain]',
    );
  });

  it('registers the app config schema so frontend visibility takes effect', () => {
    // packages/app/config.d.ts is only read when package.json names it. Without
    // the configSchema field the file is silently ignored, every key it marks
    // frontend-visible is stripped from the served config, and the Guest button
    // never appears however the YAML is written.
    const appPackage = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../app/package.json'),
        'utf8',
      ),
    );
    expect(appPackage.configSchema).toBe('config.d.ts');

    const schema = fs.readFileSync(
      path.resolve(__dirname, '../../app/config.d.ts'),
      'utf8',
    );
    expect(schema).toContain('guest?:');
    expect(schema).toContain('userEntityRef');
  });

  it('maps guest auth to the catalog guest user in the opt-in guest config', () => {
    // Guest moved out of app-config.yaml so the default login offers GitHub
    // only; scripts/ona-dev.sh adds this file when AUTH_GUEST_ENABLED=true.
    expect(guestConfig).toContain('userEntityRef: user:default/guest');
  });

  it('allows local frontend origins for Guest sign-in CORS', () => {
    expect(appConfig).toContain('http://localhost:3000');
    expect(appConfig).toContain('http://127.0.0.1:3000');
    expect(appConfig).toContain("'http://*:3000'");
  });

  it('ships PostgreSQL as the default persistence, not SQLite or memory', () => {
    // MVP1 item 8 / NXD-064 C-1. The shipped default used to be file-backed
    // SQLite with ursComposer.persistence.mode: memory, so the default stack
    // ran without the GxP controls that exist only in the Postgres schema.
    // Asserted on the base file, because a default that is only safe once an
    // overlay is layered is what C-1 objects to.
    // Matched as settings at the start of a line, not as substrings: both
    // spellings appear in the comment above them explaining what changed.
    expect(appConfig).toMatch(/^\s+client: pg$/m);
    expect(appConfig).toMatch(/^\s+mode: postgres$/m);
    expect(appConfig).not.toMatch(/^\s+client: better-sqlite3$/m);
    expect(appConfig).not.toMatch(/^\s+mode: memory$/m);
  });

  it('keeps memory mode available as a file you have to ask for', () => {
    // Removing the mode was never the position — NXD-064 C-1 and audit item 8
    // both say default or refuse, not delete. It moved to an overlay whose
    // first lines state what it costs, and it turns permissions off because
    // getPersistenceMode refuses the combination.
    const memoryConfig = fs.readFileSync(
      path.resolve(__dirname, '../../../app-config.memory.yaml'),
      'utf8',
    );
    expect(memoryConfig).toContain('mode: memory');
    expect(memoryConfig).toMatch(/permission:\s*\n\s*enabled: false/);
  });

  it('keeps GitHub credentials in environment substitution', () => {
    expect(appConfig).toContain('token: ${GITHUB_TOKEN}');
    expect(appConfig).not.toMatch(/ghp_[A-Za-z0-9]+/);
    expect(appConfig).not.toMatch(/-----BEGIN .*PRIVATE KEY-----/);
  });
  it('offers one test identity per URS approval role behind AUTH_DEMO_ENABLED', () => {
    // A test system needs every approval seat on the sign-in page without a
    // GitHub account per role. Each identity holds exactly one urs-* group so
    // the chain still needs four different sign-ins to walk.
    const root = path.resolve(__dirname, '../../..');
    const demo = yaml.parse(
      fs.readFileSync(path.join(root, 'app-config.demo.yaml'), 'utf8'),
    );
    expect(demo.auth.environment).toBe('development');

    const identities: Array<{ name: string; memberOf: string[] }> =
      demo.users.demoIdentities;
    const ursGroups = identities.map(i =>
      i.memberOf.filter(g => g.startsWith('urs-')),
    );
    expect(ursGroups).toEqual([
      ['urs-authors'],
      ['urs-business-reviewers'],
      ['urs-product-managers'],
      ['urs-quality-reviewers'],
    ]);
    expect(demo.auth.providers.demo.users).toEqual(identities.map(i => i.name));

    const onaDev = fs.readFileSync(
      path.join(root, 'scripts/ona-dev.sh'),
      'utf8',
    );
    expect(onaDev).toMatch(
      /env_value AUTH_DEMO_ENABLED\)" = "true" \]; then\s+out\+=\(--config "\$ROOT\/app-config\.demo\.yaml"\)/,
    );
  });
});
