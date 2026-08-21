import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_DIR = path.join(ROOT, 'templates/machine-state-consumer');
const CONTENT_DIR = path.join(TEMPLATE_DIR, 'content');

const REQUIRED_FILES = [
  'app/main.py',
  'app/config.py',
  'app/models.py',
  'app/store.py',
  'app/mqtt_ingest.py',
  'app/ingest.py',
  'app/contract.py',
  'app/quality.py',
  'app/compatibility.py',
  'dataprod/quality.py',
  'dataprod/compatibility.py',
  'dataprod/contracts.py',
  'dataprod/metadata.py',
  'contracts/machine-state-event.schema.json',
  'compat/consumers.json',
  'compat/published.schema.json',
  'composition.yaml',
  'tests/__init__.py',
  'tests/test_health.py',
  'tests/test_model.py',
  'tests/test_machines.py',
  'tests/test_mqtt.py',
  'tests/test_contract.py',
  'tests/test_quality.py',
  'tests/test_compatibility.py',
  'tests/test_platform_metadata.py',
  'examples/publish_sample.py',
  'Dockerfile',
  'docker-compose.yml',
  '.dockerignore',
  '.gitignore',
  '.env.example',
  'pyproject.toml',
  'README.md',
  'catalog-info.yaml',
  'docs/index.md',
  'docs/architecture.md',
  'docs/uns-dependency.md',
  'docs/topic-contract.md',
  'docs/event-envelope.md',
  'docs/api.md',
  'docs/data-contract.md',
  'docs/quality-rules.md',
  'docs/configuration.md',
  'docs/local-mqtt.md',
  'docs/broker-free-testing.md',
  'docs/local-development.md',
  'docs/deployment.md',
  'docs/release-notes.md',
  'docs/prerequisites.md',
  'docs/create.md',
  'docs/compatibility.md',
  'docs/testing.md',
  'docs/ci-cd.md',
  'docs/docker.md',
  'docs/operations.md',
  'docs/troubleshooting.md',
  '.github/workflows/ci.yml',
  '.github/workflows/data-product-quality.yml',
];

const VALUES = {
  name: 'machine-state-consumer',
  title: 'machine-state-consumer',
  description: 'Machine state consumer composition proof',
  owner: 'group:default/platform-team',
  unsComponent: 'component:default/unified-namespace',
  topicPattern: 'pharma/+/+/+/+/machine/state',
  system: 'data-platform',
  domain: 'manufacturing',
  lifecycle: 'experimental',
  version: '1.0.0',
  templateName: 'machine-state-consumer-data-product',
  templateVersion: '1.0.0',
  destination: { owner: 'pharma-data-factory', repo: 'machine-state-consumer' },
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

describe('Machine State Consumer Data Product', () => {
  it('is registered as a Create template with UNS composition fields', () => {
    const entity = yaml.parse(
      fs.readFileSync(path.join(TEMPLATE_DIR, 'template.yaml'), 'utf8'),
    );
    expect(entity.kind).toBe('Template');
    expect(entity.metadata.name).toBe('machine-state-consumer-data-product');
    expect(entity.metadata.title).toBe('Machine State Consumer Data Product');
    expect(Object.keys(entity.spec.parameters[0].properties)).toEqual([
      'name',
      'description',
      'owner',
      'domain',
      'unsComponent',
      'topicPattern',
      'repoUrl',
    ]);
    expect(entity.spec.parameters[0].properties.name.title).toBe(
      'Data Product Name',
    );
    expect(entity.spec.parameters[0].properties.unsComponent.default).toBe(
      'component:default/unified-namespace',
    );
    expect(entity.spec.parameters[0].properties.topicPattern.default).toBe(
      'pharma/+/+/+/+/machine/state',
    );
    expect(entity.spec.parameters[0].description).toMatch(/Unified Namespace/);
    expect(entity.spec.parameters[0].description).not.toMatch(/OEE calculation/i);
    expect(entity.spec.steps.map((step: { action: string }) => step.action)).toEqual(
      ['fetch:template', 'publish:github', 'catalog:register'],
    );
  });

  it('generates the required repository layout', () => {
    for (const relative of REQUIRED_FILES) {
      expect(fs.existsSync(path.join(CONTENT_DIR, relative))).toBe(true);
    }
  });

  it('declares native Catalog relations without custom topology annotations', () => {
    const rendered = render(
      fs.readFileSync(path.join(CONTENT_DIR, 'catalog-info.yaml'), 'utf8'),
    );
    const docs = yaml.parseAllDocuments(rendered).map(doc => doc.toJSON());
    const component = docs.find(doc => doc.kind === 'Component');
    const api = docs.find(doc => doc.kind === 'API');
    expect(component.spec.type).toBe('data-product');
    expect(component.spec.dependsOn).toEqual([
      'component:default/unified-namespace',
    ]);
    expect(component.spec.consumesApis).toEqual([
      'unified-namespace--machine-state-event',
    ]);
    expect(component.spec.providesApis).toEqual([
      'machine-state-consumer--machine-state-event',
    ]);
    expect(
      component.metadata.annotations['dataprod.platform/depends-on'],
    ).toBeUndefined();
    expect(component.metadata.links.map((link: { title: string }) => link.title)).toContain(
      'Catalog Graph',
    );
    expect(api.spec.type).toBe('contract');
    expect(api.metadata.annotations['dataprod.platform/contract']).toBe(
      'machine-state-event',
    );
    expect(api.metadata.annotations['dataprod.platform/contract-version']).toBe(
      '1.0.0',
    );
  });

  it('reuses the UNS envelope and machine-state-event contract without OEE logic', () => {
    const main = fs.readFileSync(path.join(CONTENT_DIR, 'app/main.py'), 'utf8');
    const models = fs.readFileSync(path.join(CONTENT_DIR, 'app/models.py'), 'utf8');
    const store = fs.readFileSync(path.join(CONTENT_DIR, 'app/store.py'), 'utf8');
    const schema = JSON.parse(
      fs.readFileSync(
        path.join(CONTENT_DIR, 'contracts/machine-state-event.schema.json'),
        'utf8',
      ),
    );
    expect(main).toContain('"/health"');
    expect(main).toContain('"/api/v1/events"');
    expect(main).toContain('"/api/v1/machines"');
    expect(main).toContain('"/api/v1/quality"');
    expect(models).toContain('eventId');
    expect(models).toContain('RUNNING');
    expect(models).toContain('STOPPED');
    expect(models).toContain('IDLE');
    expect(models).toContain('MAINTENANCE');
    expect(models).not.toMatch(/availability|performance|oee/i);
    expect(store).toContain('ignored_out_of_order');
    expect(store).toContain('duplicate');
    expect(schema.version).toBe('1.0.0');
    expect(schema.properties.state.enum).toEqual([
      'RUNNING',
      'STOPPED',
      'IDLE',
      'MAINTENANCE',
    ]);
    expect(
      fs.readFileSync(path.join(CONTENT_DIR, 'examples/publish_sample.py'), 'utf8'),
    ).toContain('11111111-1111-4111-8111-111111111111');
  });

  it('keeps the runtime independently deployable from Backstage', () => {
    const main = fs.readFileSync(path.join(CONTENT_DIR, 'app/main.py'), 'utf8');
    const readme = fs.readFileSync(path.join(CONTENT_DIR, 'README.md'), 'utf8');
    expect(main).not.toMatch(/backstage/i);
    expect(readme).toContain('does not require Backstage');
    expect(
      fs.readFileSync(path.join(CONTENT_DIR, 'composition.yaml'), 'utf8'),
    ).toContain('${{ values.unsComponent }}');
  });

  it('does not modify certified Golden Path templates', () => {
    const mqtt = fs.readFileSync(
      path.join(ROOT, 'templates/mqtt-temperature-product/template.yaml'),
      'utf8',
    );
    const rest = fs.readFileSync(
      path.join(ROOT, 'templates/rest-equipment-product/template.yaml'),
      'utf8',
    );
    const python = fs.readFileSync(
      path.join(ROOT, 'templates/python-service/template.yaml'),
      'utf8',
    );
    expect(mqtt).toContain('mqtt-temperature-data-product');
    expect(rest).toContain('rest-equipment-data-product');
    expect(python).toContain('python-microservice');
    expect(mqtt).not.toContain('machine-state-consumer');
    expect(rest).not.toContain('machine-state-consumer');
    expect(python).not.toContain('machine-state-consumer');
  });
});
