import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_DIR = path.join(ROOT, 'templates/python-service');
const CONTENT_DIR = path.join(TEMPLATE_DIR, 'content');

const REQUIRED_FILES = [
  'app/main.py',
  'app/config.py',
  'tests/test_health.py',
  'Dockerfile',
  '.dockerignore',
  '.gitignore',
  'pyproject.toml',
  'README.md',
  'catalog-info.yaml',
  '.github/workflows/ci.yml',
];

const VALUES = {
  name: 'orders-api',
  title: 'orders-api',
  description: 'Orders data product',
  owner: 'group:default/platform-team',
  system: 'data-platform',
  domain: 'platform',
  lifecycle: 'experimental',
  version: '1.0.0',
  templateName: 'python-microservice',
  destination: { owner: 'acme', repo: 'orders-api' },
};

function render(source: string): string {
  return source.replace(/\$\{\{\s*([^}]+)\s*\}\}/g, (_match, expression) => {
    const trimmed = String(expression).trim();
    if (!trimmed.startsWith('values.')) {
      return '';
    }
    const value = trimmed
      .replace(/^values\./, '')
      .split('.')
      .reduce<unknown>((current, key) => {
        if (current && typeof current === 'object') {
          return (current as Record<string, unknown>)[key];
        }
        return undefined;
      }, VALUES);
    return value === undefined || value === null ? '' : String(value);
  });
}

describe('Python Microservice general service template', () => {
  it('is registered as a Create-page software template', () => {
    const entity = yaml.parse(
      fs.readFileSync(path.join(TEMPLATE_DIR, 'template.yaml'), 'utf8'),
    );
    expect(entity.kind).toBe('Template');
    expect(entity.metadata.name).toBe('python-microservice');
    expect(entity.metadata.title).toBe('Python Microservice');
    expect(Object.keys(entity.spec.parameters[0].properties)).toEqual([
      'name',
      'description',
      'owner',
      'repoUrl',
    ]);
    expect(entity.spec.parameters[0].properties.name.title).toBe('Service Name');
    expect(entity.spec.parameters[0].properties.owner.title).toBe(
      'Catalog Owner',
    );
    expect(entity.spec.parameters[0].properties.repoUrl.title).toBe(
      'GitHub Organization and Repository',
    );
    expect(entity.spec.parameters[0].properties.repoUrl['ui:options']).toEqual({
      allowedHosts: ['github.com'],
      allowedOwners: ['pharma-data-factory'],
    });
    expect(JSON.stringify(entity.spec.parameters)).not.toContain(
      'requestUserCredentials',
    );
    expect(JSON.stringify(entity.spec.parameters)).not.toContain('secrets');
    expect(entity.spec.steps.map((step: { action: string }) => step.action)).toEqual(
      ['fetch:template', 'publish:github', 'catalog:register'],
    );
    expect(entity.spec.steps[1].input.repoUrl).toBe(
      'github.com?owner=pharma-data-factory&repo=${{ parameters.name }}',
    );
    expect(entity.spec.steps[1].input.token).toBeUndefined();
    expect(entity.spec.steps[0].input.values.destination).toEqual({
      host: 'github.com',
      owner: 'pharma-data-factory',
      repo: '${{ parameters.name }}',
    });
  });

  it('generates the required repository layout', () => {
    for (const relative of REQUIRED_FILES) {
      expect(fs.existsSync(path.join(CONTENT_DIR, relative))).toBe(true);
    }
  });

  it('writes catalog-info.yaml from template values', () => {
    const rendered = render(
      fs.readFileSync(path.join(CONTENT_DIR, 'catalog-info.yaml'), 'utf8'),
    );
    const component = yaml.parseAllDocuments(rendered)[0].toJSON();
    expect(component.metadata.name).toBe('orders-api');
    expect(component.metadata.description).toBe('Orders data product');
    expect(component.spec.owner).toBe('group:default/platform-team');
    expect(component.metadata.annotations['github.com/project-slug']).toBe(
      'acme/orders-api',
    );
    expect(component.spec.type).toBe('service');
  });

  it('generates the required health payload', () => {
    const rendered = render(
      fs.readFileSync(path.join(CONTENT_DIR, 'app/main.py'), 'utf8'),
    );
    expect(rendered).toContain('"/health"');
    expect(rendered).toContain('"UP"');
    expect(rendered).toContain('settings.service_name');
    expect(rendered).toContain('settings.service_version');
  });

  it('dry-runs publish:github repoUrl for a guest-created service', () => {
    const entity = yaml.parse(
      fs.readFileSync(path.join(TEMPLATE_DIR, 'template.yaml'), 'utf8'),
    );
    const repoUrl = String(entity.spec.steps[1].input.repoUrl).replace(
      '${{ parameters.name }}',
      'temperature-service-test',
    );
    const parsed = new URL(`https://${repoUrl}`);
    expect(parsed.hostname).toBe('github.com');
    expect(parsed.searchParams.get('owner')).toBe('pharma-data-factory');
    expect(parsed.searchParams.get('repo')).toBe('temperature-service-test');
    expect(parsed.searchParams.get('owner')).not.toBe('user:default/guest');
  });

  it('runs lint, tests, and Docker build in CI', () => {
    const workflow = fs.readFileSync(
      path.join(CONTENT_DIR, '.github/workflows/ci.yml'),
      'utf8',
    );
    expect(workflow).toContain('ruff check app tests');
    expect(workflow).toContain('pytest');
    expect(workflow).toContain('docker build');
  });
});
