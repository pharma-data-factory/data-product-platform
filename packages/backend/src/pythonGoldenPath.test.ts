import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_DIR = path.join(ROOT, 'templates/python-service');
const CONTENT_DIR = path.join(TEMPLATE_DIR, 'content');

/**
 * Steps are addressed by id, never by position. Inserting `verify-urs` ahead of
 * `publish` moved every index by one, and the resulting failures read as if
 * publish had lost its repoUrl rather than as if the test had counted wrong.
 */
const stepById = (
  entity: { spec: { steps: { id: string; input: Record<string, unknown> }[] } },
  id: string,
) => entity.spec.steps.find(step => step.id === id)!;

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
    // Order matters as well as membership: ursBaselineId sits with the other
    // identity fields, above the repository, because a binding the author has
    // to scroll past is a binding that does not get set.
    expect(Object.keys(entity.spec.parameters[0].properties)).toEqual([
      'name',
      'description',
      'owner',
      'ursBaselineId',
    ]);
    expect(entity.spec.parameters[0].properties.name.title).toBe('Service Name');
    expect(entity.spec.parameters[0].properties.owner.title).toBe(
      'Catalog Owner',
    );
    expect(JSON.stringify(entity.spec.parameters)).not.toContain(
      'requestUserCredentials',
    );
    expect(JSON.stringify(entity.spec.parameters)).not.toContain('secrets');
    expect(entity.spec.steps.map((step: { action: string }) => step.action)).toEqual(
      [
        'nexora:scm:resolve-repo',
        'fetch:template',
        'nexora:urs:verify-baseline',
        'publish:github',
        'catalog:register',
        'nexora:product:create',
      ],
    );
    expect(stepById(entity, 'publish').input.repoUrl).toBe(
      "${{ steps['resolve-repo'].output.repoUrl }}",
    );
    expect(stepById(entity, 'publish').input.token).toBeUndefined();
    // By action, not by index: `resolve-repo` is step 0 now, and a test that
    // depends on step order breaks every time a step is inserted.
    expect(
      (stepById(entity, 'fetch-base').input.values as Record<string, unknown>)
        .destination,
    ).toEqual({
      host: "${{ steps['resolve-repo'].output.host }}",
      owner: "${{ steps['resolve-repo'].output.owner }}",
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

  it('takes its publish coordinate from the platform, not from the template', () => {
    // This used to substitute a name into a hard-coded literal and parse the
    // result, asserting the organisation was `pharma-data-factory` and not the
    // guest's own login. There is no literal to parse now: the coordinate is
    // resolved server-side from `nexora.scm.*` by `nexora:scm:resolve-repo`,
    // so what the template can promise is that it asks for it and hard-codes
    // nothing. Where the value comes from is the action's business. NXD-079.
    const raw = fs.readFileSync(
      path.join(TEMPLATE_DIR, 'template.yaml'),
      'utf8',
    );
    const entity = yaml.parse(raw);

    expect(
      entity.spec.steps.find((s: { id: string }) => s.id === 'resolve-repo')
        ?.action,
    ).toBe('nexora:scm:resolve-repo');
    expect(stepById(entity, 'publish').input.repoUrl).toBe(
      "${{ steps['resolve-repo'].output.repoUrl }}",
    );
    // No organisation, and no host, anywhere in the file.
    expect(raw).not.toMatch(/owner=\w/);
    expect(raw).not.toContain('github.com');
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
