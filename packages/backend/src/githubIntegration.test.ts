import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');

describe('GitHub Golden Path integration', () => {
  it('keeps GitHub App credentials in environment substitution', () => {
    const githubConfig = fs.readFileSync(
      path.join(ROOT, 'app-config.github.yaml'),
      'utf8',
    );
    const envExample = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');

    expect(githubConfig).not.toContain('clientId: ${AUTH_GITHUB_CLIENT_ID}');
    expect(githubConfig).not.toContain('clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}');
    expect(githubConfig).toContain('appId: ${GITHUB_APP_ID}');
    expect(githubConfig).toContain('clientId: ${GITHUB_CLIENT_ID}');
    expect(githubConfig).toContain('clientSecret: ${GITHUB_CLIENT_SECRET}');
    expect(githubConfig).toContain('privateKey: ${GITHUB_PRIVATE_KEY}');
    expect(githubConfig).toContain('webhookSecret: ${GITHUB_WEBHOOK_SECRET:-}');
    expect(githubConfig).not.toMatch(/ghp_[A-Za-z0-9]+/);
    expect(githubConfig).not.toMatch(/-----BEGIN .*PRIVATE KEY-----/);

    for (const key of [
      'GITHUB_APP_ID',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'GITHUB_PRIVATE_KEY',
      'GITHUB_WEBHOOK_SECRET',
    ]) {
      expect(envExample).toContain(`${key}=`);
    }
    expect(envExample).not.toMatch(/ghp_[A-Za-z0-9]+/);
    expect(envExample).not.toMatch(/-----BEGIN RSA PRIVATE KEY-----[\r\n][^-]/);
    expect(envExample).toContain('pharma-data-factory');

    const githubSetup = fs.readFileSync(
      path.join(ROOT, 'docs/github-setup.md'),
      'utf8',
    );
    expect(githubSetup).toContain('Install App');
    expect(githubSetup).toContain('Actions');
    expect(githubSetup).toContain('Read-only');
    expect(githubSetup).toContain('pharma-data-factory');
    expect(githubSetup).toContain('No token available for host: github.com');
  });

  it('wires publish:github and catalog:register on the Python template', () => {
    const template = yaml.parse(
      fs.readFileSync(
        path.join(ROOT, 'templates/python-service/template.yaml'),
        'utf8',
      ),
    );
    expect(template.spec.steps.map((step: { action: string }) => step.action)).toEqual(
      ['fetch:template', 'publish:github', 'catalog:register'],
    );
    expect(template.spec.steps[1].input.repoUrl).toBe(
      'github.com?owner=pharma-data-factory&repo=${{ parameters.name }}',
    );
    expect(template.spec.steps[1].input.token).toBeUndefined();
    expect(JSON.stringify(template.spec.parameters)).not.toContain(
      'requestUserCredentials',
    );
    expect(template.spec.steps[2].input.catalogInfoPath).toBe(
      '/catalog-info.yaml',
    );
  });

  it('generates the files required after a GitHub publish', () => {
    const contentDir = path.join(ROOT, 'templates/python-service/content');
    for (const relative of [
      'app/main.py',
      'tests/test_health.py',
      'Dockerfile',
      '.dockerignore',
      '.gitignore',
      'pyproject.toml',
      'README.md',
      'catalog-info.yaml',
      '.github/workflows/ci.yml',
    ]) {
      expect(fs.existsSync(path.join(contentDir, relative))).toBe(true);
    }
  });
});
