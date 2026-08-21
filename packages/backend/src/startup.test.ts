import fs from 'fs';
import path from 'path';

const backendIndex = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
const appConfig = fs.readFileSync(
  path.resolve(__dirname, '../../../app-config.yaml'),
  'utf8',
);

describe('Backstage foundation', () => {
  it('starts the current backend architecture with required plugins', () => {
    expect(backendIndex).toContain("import { createBackend } from '@backstage/backend-defaults'");
    expect(backendIndex).toContain("backend.add(import('@backstage/plugin-catalog-backend'))");
    expect(backendIndex).toContain("backend.add(import('@backstage/plugin-scaffolder-backend'))");
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-scaffolder-backend-module-github'))",
    );
    expect(backendIndex).toContain("backend.add(import('@backstage/plugin-techdocs-backend'))");
    expect(backendIndex).toContain("backend.add(import('@backstage/plugin-search-backend'))");
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
    expect(appConfig).toContain('../../templates/python-service/template.yaml');
    expect(appConfig).toContain('../../templates/node-service/template.yaml');
    expect(appConfig).toContain('../../templates/mqtt-connector/template.yaml');
    expect(appConfig).toContain('../../templates/mqtt-temperature-product/template.yaml');
    expect(appConfig).toContain('../../templates/rest-equipment-product/template.yaml');
    expect(appConfig).toContain('../../templates/unified-namespace/template.yaml');
    expect(appConfig).toContain('../../templates/machine-state-consumer/template.yaml');
    expect(appConfig).toContain('../../templates/oee-data-product/template.yaml');
    expect(appConfig).toContain('../../templates/aas-asset/template.yaml');
    expect(appConfig).toContain('allow: [Component, System, API, Resource, Location, Template]');
  });

  it('maps guest auth to the catalog guest user', () => {
    expect(appConfig).toContain('userEntityRef: user:default/guest');
  });

  it('allows local frontend origins for Guest sign-in CORS', () => {
    expect(appConfig).toContain('http://localhost:3000');
    expect(appConfig).toContain('http://127.0.0.1:3000');
    expect(appConfig).toContain("'http://*:3000'");
  });

  it('uses file-backed SQLite so DevDataStore IPC is not required', () => {
    expect(appConfig).toContain('client: better-sqlite3');
    expect(appConfig).toContain('directory: .sqlite');
    expect(appConfig).not.toContain("connection: ':memory:'");
  });

  it('keeps GitHub credentials in environment substitution', () => {
    expect(appConfig).toContain('token: ${GITHUB_TOKEN}');
    expect(appConfig).not.toMatch(/ghp_[A-Za-z0-9]+/);
    expect(appConfig).not.toMatch(/-----BEGIN .*PRIVATE KEY-----/);
  });
});
