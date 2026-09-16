import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_DIR = path.join(ROOT, 'templates/mqtt-temperature-product');
const CONTENT_DIR = path.join(TEMPLATE_DIR, 'content');

const REQUIRED_FILES = [
  'app/main.py',
  'app/config.py',
  'app/models.py',
  'app/store.py',
  'app/mqtt_ingest.py',
  'app/contract.py',
  'app/quality.py',
  'app/compatibility.py',
  'dataprod/quality.py',
  'dataprod/compatibility.py',
  'dataprod/contracts.py',
  'dataprod/metadata.py',
  'contracts/temperature-event.schema.json',
  'compat/consumers.json',
  'compat/published.schema.json',
  'tests/test_health.py',
  'tests/test_model.py',
  'tests/test_temperatures.py',
  'tests/test_contract.py',
  'tests/test_quality.py',
  'tests/test_compatibility.py',
  'tests/test_platform_metadata.py',
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
  'docs/api.md',
  'docs/data-contract.md',
  'docs/quality-rules.md',
  'docs/configuration.md',
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
  name: 'mqtt-temperature-product',
  title: 'mqtt-temperature-product',
  description: 'MQTT temperature data product',
  owner: 'group:default/platform-team',
  mqttTopic: 'pharma/temperature/+',
  system: 'data-platform',
  domain: 'manufacturing',
  lifecycle: 'experimental',
  version: '1.0.0',
  templateName: 'mqtt-temperature-data-product',
  templateVersion: '1.0.0',
  destination: { owner: 'pharma-data-factory', repo: 'mqtt-temperature-product' },
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

describe('MQTT Temperature Data Product Golden Path', () => {
  it('is registered as a Create-page software template', () => {
    const entity = yaml.parse(
      fs.readFileSync(path.join(TEMPLATE_DIR, 'template.yaml'), 'utf8'),
    );
    expect(entity.kind).toBe('Template');
    expect(entity.metadata.name).toBe('mqtt-temperature-data-product');
    expect(entity.metadata.title).toBe('MQTT Temperature Data Product');
    expect(Object.keys(entity.spec.parameters[0].properties)).toEqual([
      'name',
      'description',
      'owner',
      'ursBaselineId',
      'mqttTopic',
      'repoUrl',
    ]);
    expect(entity.spec.parameters[0].properties.name.title).toBe(
      'Data Product Name',
    );
    expect(entity.spec.parameters[0].properties.owner.title).toBe('Owner');
    expect(entity.spec.parameters[0].properties.repoUrl.title).toBe(
      'GitHub Repository',
    );
    expect(entity.spec.parameters[0].description).toMatch(
      /Certified Golden Path/,
    );
    expect(entity.spec.parameters[0].description).toMatch(
      /MQTT/,
    );
    expect(entity.spec.parameters[0].description).toMatch(/Data Contract/);
    expect(entity.spec.parameters[0].description).toMatch(/Quality Gate/);
    expect(entity.spec.parameters[0].description).toMatch(/CI\/CD/);
    expect(entity.spec.parameters[0].description).toMatch(/TechDocs/);
    expect(entity.spec.output.links.map((link: { title: string }) => link.title)).toEqual(
      ['Repository', 'View Data Product'],
    );
    expect(JSON.stringify(entity.spec.parameters)).not.toMatch(/Scaffolder|Backstage catalog/i);
    expect(entity.spec.parameters[0].properties.mqttTopic.default).toBe(
      'pharma/temperature/+',
    );
    expect(entity.spec.parameters[0].properties.repoUrl['ui:options']).toEqual({
      allowedHosts: ['github.com'],
      allowedOwners: ['pharma-data-factory'],
    });
    expect(JSON.stringify(entity.spec.parameters)).not.toContain(
      'requestUserCredentials',
    );
    expect(entity.spec.steps.map((step: { action: string }) => step.action)).toEqual(
      [
        'fetch:template',
        'nexora:urs:verify-baseline',
        'publish:github',
        'catalog:register',
      ],
    );
    const stepById = (id: string) =>
      entity.spec.steps.find((step: { id: string }) => step.id === id);
    expect(stepById('verify-urs').input.ursBaselineId).toBe(
      "${{ parameters.ursBaselineId or 'unbound' }}",
    );
    expect(stepById('publish').input.repoUrl).toBe(
      'github.com?owner=pharma-data-factory&repo=${{ parameters.name }}',
    );
    expect(stepById('publish').input.token).toBeUndefined();
    expect(stepById('fetch-base').input.values.destination).toEqual({
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

  it('writes data product metadata into catalog-info.yaml', () => {
    const rendered = render(
      fs.readFileSync(path.join(CONTENT_DIR, 'catalog-info.yaml'), 'utf8'),
    );
    const docs = yaml.parseAllDocuments(rendered).map(doc => doc.toJSON());
    const component = docs.find(doc => doc.kind === 'Component');
    const api = docs.find(doc => doc.kind === 'API');
    expect(component.metadata.name).toBe('mqtt-temperature-product');
    expect(component.spec.type).toBe('data-product');
    expect(component.spec.owner).toBe('group:default/platform-team');
    expect(component.spec.lifecycle).toBe('experimental');
    expect(component.metadata.annotations['dataprod.platform/domain']).toBe(
      'manufacturing',
    );
    expect(component.metadata.annotations['dataprod.platform/version']).toBe(
      '1.0.0',
    );
    expect(component.metadata.annotations['dataprod.platform/source-systems']).toBe(
      'mqtt',
    );
    expect(component.metadata.annotations['dataprod.platform/interfaces']).toBe(
      'REST',
    );
    expect(component.metadata.annotations['dataprod.platform/protocol']).toBe(
      'MQTT',
    );
    expect(component.metadata.annotations['dataprod.platform/dataContract']).toBe(
      'contracts/temperature-event.schema.json',
    );
    expect(component.spec.providesApis).toEqual([
      'mqtt-temperature-product--temperature-event',
    ]);
    expect(
      component.metadata.annotations['dataprod.platform/providesContract'],
    ).toBeUndefined();
    expect(
      component.metadata.annotations['dataprod.platform/dataContractVersion'],
    ).toBeUndefined();
    expect(component.metadata.annotations['dataprod.platform/qualityStatus']).toBe(
      'TESTED',
    );
    expect(
      component.metadata.annotations['dataprod.platform/quality-endpoint'],
    ).toBe('/api/v1/quality');
    expect(
      component.metadata.annotations['dataprod.platform/dataProductStandardVersion'],
    ).toBe('1.0.0');
    expect(
      component.metadata.annotations['dataprod.platform/dataProductSdkVersion'],
    ).toBe('1.0.0');
    expect(component.metadata.annotations['dataprod.platform/template']).toBe(
      'mqtt-temperature-data-product',
    );
    expect(
      component.metadata.annotations['dataprod.platform/templateVersion'],
    ).toBe('1.0.0');
    expect(component.metadata.annotations['github.com/project-slug']).toBe(
      'pharma-data-factory/mqtt-temperature-product',
    );
    expect(api.metadata.name).toBe(
      'mqtt-temperature-product--temperature-event',
    );
    expect(api.spec.type).toBe('contract');
    expect(api.metadata.title).toBe('Temperature Event Contract');
    expect(api.metadata.annotations['dataprod.platform/contract']).toBe(
      'temperature-event',
    );
    expect(api.metadata.annotations['dataprod.platform/contract-version']).toBe(
      '1.1.0',
    );
  });

  it('generates the temperature API and MQTT configuration', () => {
    const main = render(
      fs.readFileSync(path.join(CONTENT_DIR, 'app/main.py'), 'utf8'),
    );
    const config = render(
      fs.readFileSync(path.join(CONTENT_DIR, 'app/config.py'), 'utf8'),
    );
    const model = fs.readFileSync(path.join(CONTENT_DIR, 'app/models.py'), 'utf8');
    const envExample = render(
      fs.readFileSync(path.join(CONTENT_DIR, '.env.example'), 'utf8'),
    );
    expect(main).toContain('"/health"');
    expect(main).toContain('"/api/v1/temperatures"');
    expect(main).toContain('"/api/v1/quality"');
    expect(main).toContain('"/api/v1/platform-metadata"');
    expect(main).toContain('settings.service_name');
    expect(model).toContain('eventId');
    expect(model).toContain('deviceId');
    expect(model).toContain('Literal["C", "F"]');
    expect(config).toContain('mqtt_host');
    expect(config).toContain('mqtt_topic');
    expect(config).toContain('temperature_min');
    expect(config).toContain('temperature_max');
    expect(config).toContain('data_contract_version');
    expect(envExample).toContain('MQTT_HOST=');
    expect(envExample).toContain('MQTT_TOPIC=pharma/temperature/+');
    expect(envExample).toContain('TEMPERATURE_MIN=-50');
    expect(envExample).toContain('TEMPERATURE_MAX=150');
  });

  it('generates structured TechDocs for the MQTT product', () => {
    const mkdocs = render(
      fs.readFileSync(path.join(CONTENT_DIR, 'mkdocs.yml'), 'utf8'),
    );
    expect(mkdocs).toContain('Overview: index.md');
    expect(mkdocs).toContain('Architecture: architecture.md');
    expect(mkdocs).toContain('Prerequisites: prerequisites.md');
    expect(mkdocs).toContain('Create: create.md');
    expect(mkdocs).toContain('API: api.md');
    expect(mkdocs).toContain('Data Contract: data-contract.md');
    expect(mkdocs).toContain('Quality Rules: quality-rules.md');
    expect(mkdocs).toContain('Configuration: configuration.md');
    expect(mkdocs).toContain('Local Development: local-development.md');
    expect(mkdocs).toContain('Compatibility: compatibility.md');
    expect(mkdocs).toContain('Testing: testing.md');
    expect(mkdocs).toContain('CI/CD: ci-cd.md');
    expect(mkdocs).toContain('Docker: docker.md');
    expect(mkdocs).toContain('Deployment: deployment.md');
    expect(mkdocs).toContain('Operations: operations.md');
    expect(mkdocs).toContain('Troubleshooting: troubleshooting.md');
    expect(mkdocs).toContain('Release Notes: release-notes.md');
    expect(
      fs.readFileSync(path.join(CONTENT_DIR, 'docs/data-contract.md'), 'utf8'),
    ).toContain('1.1.0');
    expect(
      fs.readFileSync(path.join(CONTENT_DIR, 'catalog-info.yaml'), 'utf8'),
    ).toContain('backstage.io/techdocs-ref: dir:.');
  });

  it('generates a versioned temperature data contract', () => {
    const schema = JSON.parse(
      fs.readFileSync(
        path.join(CONTENT_DIR, 'contracts/temperature-event.schema.json'),
        'utf8',
      ),
    );
    expect(schema.version).toBe('1.1.0');
    expect(schema.required).toEqual([
      'eventId',
      'deviceId',
      'timestamp',
      'temperature',
      'unit',
    ]);
    expect(schema.properties.eventId.minLength).toBe(1);
    expect(schema.properties.deviceId.minLength).toBe(1);
    expect(schema.properties.timestamp.format).toBe('date-time');
    expect(schema.properties.temperature.type).toBe('number');
    expect(schema.properties.unit.enum).toEqual(['C', 'F']);
    expect(schema.additionalProperties).toBe(false);
  });

  it('stores events idempotently by eventId', () => {
    const store = fs.readFileSync(path.join(CONTENT_DIR, 'app/store.py'), 'utf8');
    const tests = fs.readFileSync(
      path.join(CONTENT_DIR, 'tests/test_temperatures.py'),
      'utf8',
    );
    expect(store).toContain('event_id TEXT NOT NULL UNIQUE');
    expect(tests).toContain('duplicate_event_id');
  });

  it('runs a quality gate in CI', () => {
    const workflow = [
      fs.readFileSync(path.join(CONTENT_DIR, '.github/workflows/ci.yml'), 'utf8'),
      fs.readFileSync(
        path.join(CONTENT_DIR, '.github/workflows/data-product-quality.yml'),
        'utf8',
      ),
    ].join('\n');
    expect(workflow).toContain('uses: ./.github/workflows/data-product-quality.yml');
    expect(workflow).toMatch(/name:\s*Lint/);
    expect(workflow).toMatch(/name:\s*Unit tests/);
    expect(workflow).toMatch(/name:\s*Contract tests/);
    expect(workflow).toMatch(/name:\s*Data quality tests/);
    expect(workflow).toMatch(/name:\s*Compatibility tests/);
    expect(workflow).toMatch(/name:\s*Docker build/);
    expect(workflow).toContain('ruff check app tests dataprod');
    expect(workflow).toContain('pytest tests/test_health.py tests/test_model.py tests/test_temperatures.py tests/test_platform_metadata.py');
    expect(workflow).toContain('pytest tests/test_contract.py');
    expect(workflow).toContain('pytest tests/test_quality.py');
    expect(workflow).toContain('pytest tests/test_compatibility.py');
    expect(workflow).toContain('docker build');
  });
});
