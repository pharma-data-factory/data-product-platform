import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

describe('MVP 1.1 pilot hardening', () => {
  it('keeps sample Data Products out of production and Docker Catalogs', () => {
    const production = read('app-config.production.yaml');
    const docker = read('app-config.docker.yaml');
    const local = read('app-config.yaml');
    const entities = read('catalog/entities.yaml');
    const samples = read('catalog/samples/entities.yaml');

    expect(local).toContain('catalog/samples/entities.yaml');
    expect(local).toContain('catalog/samples/industrial.yaml');
    expect(production).not.toContain('catalog/samples');
    expect(docker).not.toContain('catalog/samples');
    expect(read('catalog/samples/industrial.yaml')).toContain(
      "dataprod.platform/version: '1.0'",
    );
    expect(read('catalog/entities.yaml')).not.toContain('name: filler-01');
    expect(entities).not.toContain('sample-orders-product');
    expect(entities).not.toContain('example-oee-data-product');
    expect(entities).not.toContain('github.com/example');
    expect(samples).toContain('sample-orders-product');
    expect(samples).toContain('example-oee-data-product');
    expect(samples).toContain('pilot-oee-line-01');
    expect(samples).toContain('PILOT / TEST');
    expect(entities).not.toContain('pilot-oee-line-01');
    expect(production).toContain('./platform-components/catalog.yaml');
    expect(docker).toContain('./platform-components/catalog.yaml');
  });

  it('prevents secrets from being copied into Docker images', () => {
    const dockerignore = read('.dockerignore');
    expect(dockerignore).toMatch(/^\.env$/m);
    expect(dockerignore).toContain('.env.*');
    expect(dockerignore).toContain('*.pem');
    expect(dockerignore).toContain('*.key');
    expect(read('packages/backend/Dockerfile')).toContain(
      'COPY --chown=node:node platform-components ./platform-components',
    );
    expect(read('packages/backend/Dockerfile')).toContain('ENV NODE_ENV=production');
    expect(read('app-config.production.yaml')).not.toMatch(/^\s+guest:/m);
    expect(read('app-config.docker.yaml')).not.toMatch(/^\s+guest:/m);
  });

  it('does not grant Guest Platform Admin', () => {
    expect(read('catalog/org.yaml')).toContain('memberOf: [guests, data-product-developers]');
    expect(read('catalog/org.yaml')).not.toContain(
      'memberOf: [guests, platform-admins]',
    );
    expect(read('app-config.yaml')).toContain('group:default/data-product-developers');
    expect(read('app-config.yaml')).not.toContain(
      'group:default/platform-admins',
    );
  });

  it('labels AAS Control Plane persistence as an in-memory prototype', () => {
    expect(read('plugins/aas-backend/src/router.ts')).toContain("persistence: 'in-memory'");
    expect(read('plugins/aas-backend/src/router.ts')).toContain('prototype: true');
    expect(read('packages/app/src/modules/assets/AssetsPage.tsx')).toContain('PROTOTYPE');
  });

  it('keeps one canonical UNS source', () => {
    expect(read('templates/unified-namespace/CANONICAL.md')).toContain('uns/');
    expect(read('docs/pilot-readiness.md')).toContain('Canonical source `uns/`');
  });

  it('records the pilot hardening gate and Wave 1 freeze', () => {
    expect(read('docs/pilot-hardening-gate.md')).toContain('PILOT_READY_WITH_CONDITIONS');
    expect(read('docs/pilot-hardening-gate.md')).toContain('OEE_GO');
    expect(read('docs/pilot-hardening-gate.md')).toContain('SQLITE_ACCEPTABLE_FOR_OEE_PILOT');
    expect(read('docs/pilot-hardening-gate.md')).toContain('UNS_OPTIONAL_FOR_OEE_PILOT');
    expect(read('docs/pilot-hardening-gate.md')).toContain('AAS_OPTIONAL_FOR_OEE_PILOT');
    expect(read('docs/pilot-readiness.md')).toContain('PILOT_READY_WITH_CONDITIONS');
    expect(read('docs/platform-components/wave-1-baseline.md')).toContain('1.0.0');
    expect(read('docs/platform-components/wave-1-baseline.md')).toContain('CERTIFIED');
    expect(read('docs/oee/mvp-boundary.md')).toContain('Do not change OEE formulas');
    expect(read('docs/mvp-1.0-baseline.md')).toContain('TECHNICAL_MVP_COMPLETE');
    expect(read('docs/mvp-1.0-baseline.md')).toContain('oee-data-product');
    expect(read('docs/pilot-exit-gate.md')).toContain('PILOT_EXIT_FAIL');
    expect(read('docs/pilot-exit-gate.md')).toContain('TECHNICAL_MVP_COMPLETE');
    expect(read('docs/pilot-exit-gate.md')).toContain('OEE_GITHUB_LIVE_PROOF_NOT_RUN');
    expect(read('.gitignore')).toContain('.env.*');
    expect(read('docker-compose.yml')).toContain('This is NOT the production image');
  });

  it('keeps Catalog entity documentation links as absolute URLs', () => {
    const files = [
      'catalog/entities.yaml',
      'platform-components/operations/health/catalog-info.yaml',
      'platform-components/examples/machine-metrics/catalog-info.yaml',
    ];
    for (const file of files) {
      const urls = [...read(file).matchAll(/^\s+- url: (.+)$/gm)].map(
        match => match[1],
      );
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) {
        expect(url).toMatch(/^https?:\/\//);
      }
    }
  });

  it('labels Machine Metrics as a REFERENCE composition, not a Golden Path', () => {
    const catalog = read(
      'platform-components/examples/machine-metrics/catalog-info.yaml',
    );
    expect(catalog).toContain('dataprod.platform/catalog-class: REFERENCE');
    expect(catalog).toContain('dataprod.platform/certification-status: TESTED');
    expect(catalog).toContain('Not OEE');
  });

  it('keeps production commercial profile local and AWS fail-closed documented', () => {
    const production = read('app-config.production.yaml');
    expect(production).toContain('entitlementProvider: local');
    expect(production).toContain('This is NOT AWS production');
    expect(production).toContain('environment: production');
    expect(production).not.toContain('dangerouslyAllowSignInWithoutUserInCatalog');
    expect(read('app-config.docker.yaml')).toContain('# @visibility frontend');
    expect(read('docs/github-setup.md')).toContain('Actions | Read-only');
  });

  it('keeps generated Data Products independent of the Control Plane', () => {
    const mqttMain = read(
      'templates/mqtt-temperature-product/content/app/main.py',
    );
    const restMain = read(
      'templates/rest-equipment-product/content/app/main.py',
    );
    expect(mqttMain).not.toMatch(/backstage|localhost:7007/i);
    expect(restMain).not.toMatch(/backstage|localhost:7007/i);
  });
});

