import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

describe('Guest development fallback', () => {
  it('keeps Guest only as a local development identity', () => {
    const appConfig = read('app-config.yaml');
    const production = read('app-config.production.yaml');
    const users = read('catalog/users.seed.yaml');

    expect(appConfig).toContain('environment: development');
    expect(appConfig).toContain('userEntityRef: user:default/guest');
    expect(appConfig).toContain('group:default/guests');
    expect(appConfig).toContain('group:default/data-product-developers');
    expect(appConfig).not.toContain('group:default/platform-admins');
    expect(appConfig).not.toContain('dangerouslyAllowOutsideDevelopment: true');

    expect(production).toContain('environment: production');
    expect(production).not.toMatch(/providers:\s*[\s\S]*guest:/);
    expect(production).not.toContain('user:default/guest');
    expect(production).toContain('clientId: ${AUTH_GITHUB_CLIENT_ID}');
    expect(production).toContain(
      'callbackUrl: ${AUTH_GITHUB_CALLBACK_URL}',
    );
    expect(production).toContain('baseUrl: ${APP_BASE_URL}');
    expect(production).toContain('secret: ${BACKEND_SECRET}');
    expect(production).not.toContain('dangerouslyAllowOutsideDevelopment');
    expect(production).not.toContain(
      'dangerouslyAllowSignInWithoutUserInCatalog',
    );

    expect(users).toContain('name: guest');
    expect(users).toContain('Local development fallback identity');
    expect(users).toContain('dataprod.platform/identity: development-fallback');
    const docker = read('app-config.docker.yaml');
    expect(docker).not.toMatch(/^\s+guest:/m);
    expect(docker).not.toContain('dangerouslyAllowSignInWithoutUserInCatalog');
    expect(docker).toContain('environment: production');
  });
});

describe('GitHub user sign-in configuration', () => {
  it('configures native GitHub user login separately from GitHub App publishing', () => {
    const appConfig = read('app-config.yaml');
    const githubApp = read('app-config.github.yaml');
    const envExample = read('.env.example');
    const backend = read('packages/backend/src/index.ts');

    expect(backend).toContain('githubAuthModule');
    expect(backend).toContain('./auth/githubModule');
    expect(backend).not.toContain(
      "backend.add(import('@backstage/plugin-auth-backend-module-github-provider'))",
    );
    const githubModule = read('packages/backend/src/auth/githubModule.ts');
    expect(githubModule).toContain('githubAuthenticator');
    expect(githubModule).toContain('usernameMatchingUserEntityName');
    const githubResolver = read(
      'packages/backend/src/auth/githubCatalogResolver.ts',
    );
    expect(githubResolver).toContain('normalizeGithubLogin');
    expect(githubResolver).toContain('ownershipRefsFromUserEntity');
    expect(appConfig).toContain('clientId: ${AUTH_GITHUB_CLIENT_ID}');
    expect(appConfig).toContain('clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}');
    expect(appConfig).toContain(
      'callbackUrl: ${AUTH_GITHUB_CALLBACK_URL:-http://localhost:7007/api/auth/github/handler/frame}',
    );
    expect(appConfig).toContain('resolver: usernameMatchingUserEntityName');
    expect(appConfig).toContain(
      'dangerouslyAllowSignInWithoutUserInCatalog: true',
    );
    const production = read('app-config.production.yaml');
    expect(production).toContain('resolver: usernameMatchingUserEntityName');
    expect(production).not.toContain(
      'dangerouslyAllowSignInWithoutUserInCatalog',
    );

    expect(githubApp).toContain('appId: ${GITHUB_APP_ID}');
    expect(githubApp).toContain('clientId: ${GITHUB_CLIENT_ID}');
    expect(githubApp).toContain('privateKey: ${GITHUB_PRIVATE_KEY}');
    expect(githubApp).not.toContain('clientId: ${AUTH_GITHUB_CLIENT_ID}');
    expect(githubApp).not.toContain('clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}');
    expect(githubApp).toContain('repository publishing');

    expect(envExample).toContain('AUTH_GITHUB_CLIENT_ID=');
    expect(envExample).toContain('AUTH_GITHUB_CLIENT_SECRET=');
    expect(envExample).toContain('AUTH_GITHUB_CALLBACK_URL=');
    expect(envExample).toContain('GITHUB_APP_ID=');
    expect(envExample).toContain('Do not reuse these values for AUTH_GITHUB_');
    expect(envExample).toContain('Nexora Login');

    expect(appConfig).not.toMatch(/personalAccessToken|PERSONAL_ACCESS_TOKEN/);
    expect(githubApp).not.toMatch(/personalAccessToken|GITHUB_TOKEN/);
    const landing = read('packages/app/src/modules/identity/LandingSignInPage.tsx');
    const login = read('packages/app/src/modules/identity/LoginPage.tsx');
    expect(landing).not.toContain('AUTH_GITHUB_CLIENT_SECRET');
    expect(landing).not.toContain('clientSecret');
    expect(login).not.toContain('AUTH_GITHUB_CLIENT_SECRET');
    expect(login).not.toContain('GITHUB_PRIVATE_KEY');

    const rootPkg = JSON.parse(read('package.json'));
    const backendPkg = JSON.parse(read('packages/backend/package.json'));
    const appPkg = JSON.parse(read('packages/app/package.json'));
    expect(rootPkg.scripts.start).toContain('--env-file=.env');
    expect(backendPkg.scripts.start).toContain('--env-file=../../.env');
    expect(appPkg.scripts.start).toContain('--env-file=../../.env');
  });
});

describe('user and group mapping', () => {
  it('maps GitHub users onto catalog User entities and platform groups', () => {
    const org = yaml.parseAllDocuments(read('catalog/org.yaml')).map(doc =>
      doc.toJSON(),
    );
    const seed = yaml.parseAllDocuments(read('catalog/users.seed.yaml')).map(doc =>
      doc.toJSON(),
    );

    const groups = org
      .filter(entity => entity.kind === 'Group')
      .map(entity => entity.metadata.name);
    expect(groups).toEqual(
      expect.arrayContaining([
        'platform-viewers',
        'data-product-developers',
        'data-product-owners',
        'platform-admins',
      ]),
    );

    const users = seed.filter(entity => entity.kind === 'User');
    const byName = Object.fromEntries(
      users.map(user => [user.metadata.name, user]),
    );

    expect(byName.viewer.spec.memberOf).toContain('platform-viewers');
    expect(byName.developer.spec.memberOf).toContain('data-product-developers');
    expect(byName.owner.spec.memberOf).toContain('data-product-owners');
    expect(byName.admin.spec.memberOf).toContain('platform-admins');
    expect(byName.schmeckm.spec.memberOf).toContain('platform-admins');
    expect(byName.guest.spec.memberOf).toEqual(
      expect.arrayContaining(['guests', 'data-product-developers']),
    );
    expect(byName.guest.spec.memberOf).not.toContain('platform-admins');

    expect(githubUserEntityName(byName.admin)).toBe('admin');
    for (const name of ['viewer', 'developer', 'owner', 'admin']) {
      expect(byName[name].metadata.annotations['github.com/user-login']).toBe(
        name,
      );
      expect(byName[name].metadata.name).toBe(name);
    }
  });
});

describe('GitHub login flow', () => {
  it('documents the verified production login path and keeps publishing separate', () => {
    const landing = read('packages/app/src/modules/identity/LandingSignInPage.tsx');
    const production = read('app-config.production.yaml');
    const githubApp = read('app-config.github.yaml');

    expect(landing).toContain('PublicLanding');
    expect(landing).toContain('LoginPage');
    expect(landing).toContain('githubAuth.getBackstageIdentity');
    expect(landing).toContain('hasApprovedPlatformAccess');
    expect(landing).toContain('AccessDeniedPage');
    expect(landing).toContain('onSignInSuccess');
    expect(landing).toContain('signOut');

    expect(production).toContain('resolver: usernameMatchingUserEntityName');
    expect(production).not.toContain(
      'dangerouslyAllowSignInWithoutUserInCatalog',
    );
    expect(production).not.toContain('GITHUB_APP_ID');
    expect(githubApp).not.toContain('clientId: ${AUTH_GITHUB_CLIENT_ID}');
    expect(githubApp).not.toContain('clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}');
    expect(githubApp).toContain('Do not put AUTH_GITHUB_* values here');
  });
});

function githubUserEntityName(user: { metadata: { name: string } }): string {
  return user.metadata.name;
}
