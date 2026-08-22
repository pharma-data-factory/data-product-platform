import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

describe('hosted Create-authorization audit persistence (CC-001)', () => {
  it('mounts a named volume at the configured audit directory', () => {
    const localCompose = read('docker-compose.yml');
    const productionCompose = read('docker-compose.production.yml');
    const validationCompose = read('docker-compose.validation.yml');

    for (const compose of [localCompose, productionCompose, validationCompose]) {
      expect(compose).toContain(
        'create_authorization_audit:/app/.runtime',
      );
      expect(compose).toContain(
        'CREATE_AUTHORIZATION_AUDIT_PATH: ${CREATE_AUTHORIZATION_AUDIT_PATH:-/app/.runtime/create-authorization-audit.jsonl}',
      );
      expect(compose).toContain('create_authorization_audit:');
    }
  });

  it('prepares a writable /app/.runtime in both Control Plane images', () => {
    const productionImage = read('packages/backend/Dockerfile');
    const localImage = read('Dockerfile');

    expect(productionImage).toContain('mkdir -p /app/.runtime');
    expect(productionImage).toContain('chown node:node /app/.runtime');
    expect(productionImage).toContain('VOLUME ["/app/.runtime"]');
    expect(localImage).toContain('mkdir -p /app/.runtime');
    expect(localImage).toContain('VOLUME ["/app/.runtime"]');
  });

  it('keeps the configured default path aligned with the volume', () => {
    expect(read('app-config.yaml')).toContain(
      'createAuthorizationAuditPath: ${CREATE_AUTHORIZATION_AUDIT_PATH:-.runtime/create-authorization-audit.jsonl}',
    );
    expect(read('app-config.production.yaml')).toContain(
      'createAuthorizationAuditPath: ${CREATE_AUTHORIZATION_AUDIT_PATH:-.runtime/create-authorization-audit.jsonl}',
    );
  });
});
