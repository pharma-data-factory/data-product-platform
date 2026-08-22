import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

describe('hosted Control Plane production package', () => {
  it('resolves public URLs and signing keys from the environment', () => {
    const production = read('app-config.production.yaml');
    expect(production).toContain('baseUrl: ${APP_BASE_URL}');
    expect(production).toContain('baseUrl: ${BACKEND_BASE_URL}');
    expect(production).toContain('origin: ${APP_BASE_URL}');
    expect(production).toContain('secret: ${BACKEND_SECRET}');
    expect(production).not.toMatch(/baseUrl:\s*http:\/\/localhost/);
    expect(production).not.toMatch(/origin:\s*http:\/\/localhost/);
    expect(read('app-config.yaml')).toContain('baseUrl: http://localhost:3000');
    expect(read('app-config.yaml')).toContain('baseUrl: http://localhost:7007');
  });

  it('denies Guest and unknown GitHub users in production', () => {
    const production = read('app-config.production.yaml');
    expect(production).toContain('environment: production');
    expect(production).not.toMatch(/^\s+guest:/m);
    expect(production).not.toContain('dangerouslyAllowSignInWithoutUserInCatalog');
    expect(production).toContain('resolver: usernameMatchingUserEntityName');
    expect(read('app-config.docker.yaml')).not.toMatch(/^\s+guest:/m);
    expect(read('packages/app/src/modules/identity/LandingSignInPage.tsx')).toContain(
      "environment !== 'production'",
    );
  });

  it('loads GitHub App publishing in the production image without yarn start:github', () => {
    const dockerfile = read('packages/backend/Dockerfile');
    const github = read('app-config.github.yaml');
    expect(dockerfile).toContain('ENV NODE_ENV=production');
    expect(dockerfile).toContain('app-config.github.yaml');
    expect(dockerfile).toContain(
      'CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml", "--config", "app-config.github.yaml"]',
    );
    expect(dockerfile).not.toMatch(/^CMD \[.*yarn start/m);
    expect(github).toContain('appId: ${GITHUB_APP_ID}');
    expect(github).toContain('privateKey: ${GITHUB_PRIVATE_KEY}');
    expect(github).toContain('webhookSecret: ${GITHUB_WEBHOOK_SECRET:-}');
    expect(github).not.toContain('clientId: ${AUTH_GITHUB_CLIENT_ID}');
    expect(github).not.toMatch(/-----BEGIN .*PRIVATE KEY-----/);
  });

  it('uses a GHCR production compose without local source mounts or default dpp', () => {
    const compose = read('docker-compose.production.yml');
    expect(compose).toContain('ghcr.io/pharma-data-factory/data-product-platform');
    expect(compose).toContain('restart: unless-stopped');
    expect(compose).toContain('/.backstage/health/v1/readiness');
    expect(compose).toContain('postgres_data');
    expect(compose).toContain('create_authorization_audit:/app/.runtime');
    expect(compose).toContain(
      'CREATE_AUTHORIZATION_AUDIT_PATH: ${CREATE_AUTHORIZATION_AUDIT_PATH:-/app/.runtime/create-authorization-audit.jsonl}',
    );
    expect(compose).toContain('POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required');
    expect(compose).not.toContain('POSTGRES_PASSWORD=dpp');
    expect(compose).not.toContain('build:');
    expect(compose).not.toMatch(/command:.*yarn start/);
    expect(compose).not.toContain('./node_modules');
    expect(compose).not.toMatch(/^\s+volumes:\s*$[\s\S]*\.:\/app/m);
    expect(compose).not.toContain('3000:3000');
    expect(read('docker-compose.yml')).toContain('This is NOT the production image');
  });

  it('keeps secrets out of CI YAML, images, and the env example catalog', () => {
    const workflow = read('.github/workflows/ci.yml');
    const dockerignore = read('.dockerignore');
    const envExample = read('.env.example');
    const portainerExample = read('deploy/portainer.env.example');

    expect(workflow).toContain('packages/backend/Dockerfile');
    expect(workflow).toContain('ghcr.io/${{ github.repository }}');
    expect(workflow).toContain('sha_tag=sha-');
    expect(workflow).toContain('mvp_tag=mvp-1.0');
    expect(workflow).toContain('secrets.GITHUB_TOKEN');
    expect(workflow).not.toMatch(/ghp_[A-Za-z0-9]+/);
    expect(workflow).not.toMatch(/ghcr_pat_|GITHUB_CLIENT_SECRET:\s*['\"]?[0-9a-f]{20}/);

    expect(dockerignore).toMatch(/^\.env$/m);
    expect(dockerignore).toContain('*.pem');
    expect(dockerignore).toContain('*.key');
    expect(dockerignore).toContain('.runtime');

    expect(envExample).toContain('APP_BASE_URL=');
    expect(envExample).toContain('BACKEND_SECRET=');
    expect(envExample).not.toMatch(/ghp_[A-Za-z0-9]+/);
    expect(envExample).not.toMatch(/-----BEGIN RSA PRIVATE KEY-----[\r\n][^-]/);
    expect(portainerExample).toContain('AUTH_GITHUB_CALLBACK_URL=https://data.example.com/api/auth/github/handler/frame');
    expect(portainerExample).toContain('LEGAL_DISTRIBUTION_STATUS=BLOCKED');
    expect(portainerExample).toMatch(/^POSTGRES_PASSWORD=\s*$/m);
    expect(portainerExample).not.toMatch(/^POSTGRES_PASSWORD=\S+/m);
    expect(portainerExample).not.toMatch(/ghp_[A-Za-z0-9]+/);
  });

  it('documents Portainer, hosted login, and GitHub App publishing', () => {
    expect(read('docs/deployment/portainer.md')).toContain('docker-compose.production.yml');
    expect(read('docs/developer/hosted-login.md')).toContain(
      'https://<domain>/api/auth/github/handler/frame',
    );
    expect(read('docs/developer/hosted-login.md')).toContain('data-product-developers');
    expect(read('docs/github/platform-repository.md')).toContain('pharma-data-factory');
    expect(read('docs/github/platform-repository.md')).toContain('PRIVATE');
    expect(read('docs/operations/control-plane-hosting.md')).toContain('GITHUB_PRIVATE_KEY');
    expect(read('docs/operations/control-plane-hosting.md')).toContain('Actions');
  });
});
