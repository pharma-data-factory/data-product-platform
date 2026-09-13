import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_DIR = path.join(ROOT, 'templates/oee-data-product');
const CONTENT_DIR = path.join(TEMPLATE_DIR, 'content');

const REQUIRED_FILES = [
  'app/main.py',
  'app/config.py',
  'app/store.py',
  'app/ingest.py',
  'app/quality.py',
  'app/compatibility.py',
  'app/contract.py',
  'app/query.py',
  'app/domain/calculator.py',
  'app/domain/calculation/availability.py',
  'app/domain/calculation/performance.py',
  'app/domain/calculation/quality.py',
  'app/domain/calculation/oee.py',
  'app/domain/calculation/calculation_status.py',
  'app/capabilities.py',
  'app/domain/timeline.py',
  'app/domain/counters.py',
  'app/domain/windows.py',
  'app/domain/losses.py',
  'app/domain/reason_codes.py',
  'app/loss_service.py',
  'app/loss_routes.py',
  'app/ingestion/mappings.py',
  'dataprod/quality.py',
  'dataprod/compatibility.py',
  'dataprod/contracts.py',
  'dataprod/metadata.py',
  'contracts/oee-result.schema.json',
  'contracts/production-context.schema.json',
  'contracts/production-count-event.schema.json',
  'contracts/quality-count-event.schema.json',
  'contracts/machine-state-event.schema.json',
  'contracts/counter-event.schema.json',
  'contracts/openapi.yaml',
  'contracts/asyncapi.yaml',
  'contracts/loss-event.schema.json',
  'contracts/reason-code.schema.json',
  'compat/consumers.json',
  'compat/published.schema.json',
  'composition.yaml',
  'examples/simulate.py',
  'tests/test_independence.py',
  'tests/test_health.py',
  'tests/test_model.py',
  'tests/test_scenarios.py',
  'tests/test_edges.py',
  'tests/test_calculation.py',
  'tests/test_oee_1_0.py',
  'tests/test_api.py',
  'tests/test_losses.py',
  'tests/test_loss_api.py',
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
  'PRODUCT.md',
  'capabilities.yaml',
  'catalog-info.yaml',
  'docs/index.md',
  'docs/product.md',
  'docs/architecture.md',
  'docs/oee-model.md',
  'docs/api.md',
  'docs/losses.md',
  'docs/input-contracts.md',
  'docs/result-contract.md',
  'docs/data-contract.md',
  'docs/quality-rules.md',
  'docs/configuration.md',
  'docs/local-development.md',
  'docs/event-simulator.md',
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
  'AGENTS.md',
  'product-manifest.yaml',
  'docs/urs/URS-baseline.json',
  'docs/urs/URS-baseline.md',
  'docs/urs/traceability-matrix.yaml',
  'scripts/check_digital_thread.py',
  'vendor/health/src/pdf_health/__init__.py',
  'vendor/observability/src/pdf_observability/__init__.py',
  'vendor/mqtt-consumer/src/pdf_mqtt_consumer/__init__.py',
  'vendor/rest-source/src/pdf_rest_source/__init__.py',
  'vendor/timeseries/src/pdf_timeseries/__init__.py',
  'vendor/rest-api/src/pdf_rest_api/__init__.py',
];

const VALUES = {
  name: 'oee-data-product',
  title: 'oee-data-product',
  description: 'OEE data product',
  owner: 'group:default/platform-team',
  domain: 'manufacturing',
  equipmentId: 'filler-01',
  defaultWindow: 'HOUR',
  machineStateTopic: 'pharma/oee/+/state',
  counterTopic: 'pharma/oee/+/count',
  mqttTopic: 'pharma/oee/+/+',
  contextUrlRef: 'SOURCE_API_URL',
  site: 'basel',
  area: 'packaging',
  line: 'line-04',
  system: 'data-platform',
  lifecycle: 'experimental',
  version: '1.0.0',
  templateName: 'oee-data-product',
  templateVersion: '1.0.0',
  destination: { owner: 'pharma-data-factory', repo: 'oee-data-product' },
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

describe('OEE Data Product Golden Path', () => {
  it('is registered as a Create-page software template', () => {
    const entity = yaml.parse(
      fs.readFileSync(path.join(TEMPLATE_DIR, 'template.yaml'), 'utf8'),
    );
    expect(entity.kind).toBe('Template');
    expect(entity.metadata.name).toBe('oee-data-product');
    expect(entity.metadata.title).toBe('OEE Data Product');
    expect(Object.keys(entity.spec.parameters[0].properties)).toEqual([
      'name',
      'description',
      'owner',
      'system',
      'domain',
      'site',
      'area',
      'line',
      'equipmentId',
      'defaultWindow',
      'machineStateTopic',
      'counterTopic',
      'mqttTopic',
      'contextUrlRef',
      'repoUrl',
      'productManifestContentHash',
      'ursBaselineId',
      'productBaselineId',
      'productVersionId',
      'productId',
      'requirementSetId',
      'ursVersion',
      'ursContentHash',
      'productManifestYaml',
      'ursBaselineJson',
      'ursBaselineMd',
      'traceabilityMatrixYaml',
      'agentsMd',
    ]);
    expect(entity.spec.parameters[0].properties.defaultWindow.enum).toEqual([
      'HOUR',
      'SHIFT',
      'ORDER',
      'CUSTOM',
    ]);
    expect(JSON.stringify(entity.spec.parameters[0].properties)).not.toContain('microstop');
    expect(JSON.stringify(entity.spec.parameters[0].properties)).not.toContain('Pareto');
    expect(JSON.stringify(entity.spec.parameters[0].properties)).not.toContain('MTBF');
    expect(entity.spec.parameters[0].description).toMatch(/Certified Golden Path/);
    expect(entity.spec.parameters[0].description).toMatch(/CUMULATIVE/);
    expect(entity.spec.parameters[0].description).toMatch(/MQTT Consumer/);
    expect(entity.spec.parameters[0].description).toMatch(/REST Source/);
    expect(entity.spec.parameters[0].description).toMatch(/1\.0\.0/);
    expect(entity.spec.parameters[0].description).not.toMatch(/GxP validated/);
    expect(JSON.stringify(entity.spec.parameters)).not.toContain('password');
    expect(JSON.stringify(entity.spec.parameters)).not.toContain('token');
    expect(JSON.stringify(entity.spec.parameters)).not.toContain('requestUserCredentials');
    expect(entity.spec.steps.map((step: { action: string }) => step.action)).toEqual(
      ['fetch:template', 'publish:github', 'catalog:register'],
    );
    expect(entity.metadata.annotations['dataprod.platform/certification-status']).toBe(
      'CERTIFIED',
    );
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
    const provided = docs.find(
      doc => doc.kind === 'API' && doc.metadata.name === 'oee-data-product--oee-result',
    );
    expect(component.spec.type).toBe('data-product');
    expect(component.spec.dependsOn).toEqual([
      'component:default/health',
      'component:default/observability',
      'component:default/mqtt-consumer',
      'component:default/rest-source',
      'component:default/timeseries',
      'component:default/rest-api',
    ]);
    expect(component.spec.consumesApis).toEqual([
      'oee-data-product--production-context',
      'oee-data-product--machine-state-event',
      'oee-data-product--production-count-event',
      'oee-data-product--quality-count-event',
      'oee-data-product--counter-event',
    ]);
    expect(component.spec.providesApis).toEqual([
      'oee-data-product--oee-result',
      'oee-data-product--loss-event',
      'oee-data-product--reason-code',
    ]);
    expect(provided.metadata.annotations['dataprod.platform/contract']).toBe(
      'oee-result',
    );
    expect(provided.metadata.annotations['dataprod.platform/contract-version']).toBe(
      '1.0.0',
    );
  });

  it('reuses Wave 1 packages instead of copying MQTT/REST/SQLite clients', () => {
    const main = fs.readFileSync(path.join(CONTENT_DIR, 'app/main.py'), 'utf8');
    expect(main).toContain('from pdf_mqtt_consumer import');
    expect(main).toContain('from pdf_rest_source import');
    expect(main).toContain('from pdf_timeseries import');
    expect(main).toContain('from pdf_rest_api import');
    expect(main).toContain('from pdf_health import');
    expect(main).toContain('from pdf_observability import');
    expect(main).not.toContain('paho.mqtt');
    expect(main).not.toContain('sqlite3');
    expect(main).toContain('"/oee"');
    expect(main).toContain('"/quality"');
    expect(main).toContain('"/platform-metadata"');
    expect(main).not.toContain('backstage');
  });

  it('vendors Wave 1 CERTIFIED 1.0.0 packages without forking their public APIs', () => {
    const pairs = [
      ['platform-components/operations/health/src/pdf_health', 'vendor/health/src/pdf_health'],
      [
        'platform-components/operations/observability/src/pdf_observability',
        'vendor/observability/src/pdf_observability',
      ],
      [
        'platform-components/integration/mqtt-consumer/src/pdf_mqtt_consumer',
        'vendor/mqtt-consumer/src/pdf_mqtt_consumer',
      ],
      [
        'platform-components/integration/rest-source/src/pdf_rest_source',
        'vendor/rest-source/src/pdf_rest_source',
      ],
      [
        'platform-components/data/timeseries/src/pdf_timeseries',
        'vendor/timeseries/src/pdf_timeseries',
      ],
      [
        'platform-components/integration/rest-api/src/pdf_rest_api',
        'vendor/rest-api/src/pdf_rest_api',
      ],
    ] as const;
    for (const [canonicalRel, vendorRel] of pairs) {
      const canonicalDir = path.join(ROOT, canonicalRel);
      const vendorDir = path.join(CONTENT_DIR, vendorRel);
      const files = fs
        .readdirSync(canonicalDir)
        .filter(name => name.endsWith('.py'))
        .sort();
      expect(
        fs.readdirSync(vendorDir).filter(name => name.endsWith('.py')).sort(),
      ).toEqual(files);
      for (const file of files) {
        expect(fs.readFileSync(path.join(vendorDir, file), 'utf8')).toBe(
          fs.readFileSync(path.join(canonicalDir, file), 'utf8'),
        );
      }
    }
    const domain = fs.readFileSync(
      path.join(CONTENT_DIR, 'app/domain/calculator.py'),
      'utf8',
    );
    expect(domain).not.toContain('pdf_');
    expect(domain).not.toContain('sqlite3');
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
    expect(workflow).toContain('docker build');
  });

  it('does not commit secrets in the generated skeleton', () => {
    const envExample = fs.readFileSync(
      path.join(CONTENT_DIR, '.env.example'),
      'utf8',
    );
    expect(envExample).toContain('MQTT_HOST=');
    expect(envExample).toContain('SOURCE_API_TOKEN=');
    expect(envExample).not.toMatch(/ghp_|sk-|AKIA/);
    expect(envExample).not.toMatch(/-----BEGIN .*PRIVATE KEY-----/);
  });
});
