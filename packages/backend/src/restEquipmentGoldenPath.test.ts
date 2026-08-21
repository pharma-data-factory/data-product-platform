import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_DIR = path.join(ROOT, 'templates/rest-equipment-product');
const CONTENT_DIR = path.join(TEMPLATE_DIR, 'content');

const REQUIRED_FILES = [
  'app/main.py',
  'app/config.py',
  'app/models.py',
  'app/store.py',
  'app/source.py',
  'app/contract.py',
  'app/quality.py',
  'app/compatibility.py',
  'dataprod/quality.py',
  'dataprod/compatibility.py',
  'dataprod/contracts.py',
  'dataprod/metadata.py',
  'contracts/equipment-event.schema.json',
  'compat/consumers.json',
  'compat/published.schema.json',
  'tests/test_health.py',
  'tests/test_model.py',
  'tests/test_equipment.py',
  'tests/test_source.py',
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
  'docs/rest-source.md',
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
  name: 'rest-equipment-product',
  title: 'rest-equipment-product',
  description: 'REST equipment data product',
  owner: 'group:default/platform-team',
  system: 'data-platform',
  domain: 'manufacturing',
  lifecycle: 'experimental',
  version: '1.0.0',
  templateName: 'rest-equipment-data-product',
  templateVersion: '1.0.0',
  destination: { owner: 'pharma-data-factory', repo: 'rest-equipment-product' },
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

describe('REST Equipment Data Product Golden Path', () => {
  it('is registered as a Create-page software template', () => {
    const entity = yaml.parse(
      fs.readFileSync(path.join(TEMPLATE_DIR, 'template.yaml'), 'utf8'),
    );
    expect(entity.kind).toBe('Template');
    expect(entity.metadata.name).toBe('rest-equipment-data-product');
    expect(entity.metadata.title).toBe('REST Equipment Data Product');
    expect(Object.keys(entity.spec.parameters[0].properties)).toEqual([
      'name',
      'description',
      'owner',
      'domain',
      'repoUrl',
    ]);
    expect(entity.spec.parameters[0].properties.name.title).toBe(
      'Data Product Name',
    );
    expect(entity.spec.parameters[0].properties.owner.title).toBe(
      'Catalog Owner',
    );
    expect(entity.spec.parameters[0].properties.domain.title).toBe('Domain');
    expect(entity.spec.parameters[0].properties.domain.default).toBe(
      'manufacturing',
    );
    expect(entity.spec.parameters[0].properties.repoUrl['ui:options']).toEqual({
      allowedHosts: ['github.com'],
      allowedOwners: ['pharma-data-factory'],
    });
    expect(JSON.stringify(entity.spec.parameters)).not.toContain(
      'requestUserCredentials',
    );
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

  it('writes native Catalog entities without custom topology annotations', () => {
    const rendered = render(
      fs.readFileSync(path.join(CONTENT_DIR, 'catalog-info.yaml'), 'utf8'),
    );
    const docs = yaml.parseAllDocuments(rendered).map(doc => doc.toJSON());
    const component = docs.find(doc => doc.kind === 'Component');
    const api = docs.find(doc => doc.kind === 'API');

    expect(component.metadata.name).toBe('rest-equipment-product');
    expect(component.spec.type).toBe('data-product');
    expect(component.spec.owner).toBe('group:default/platform-team');
    expect(component.spec.lifecycle).toBe('experimental');
    expect(component.spec.providesApis).toEqual([
      'rest-equipment-product--equipment-event',
    ]);
    expect(component.metadata.annotations['dataprod.platform/domain']).toBe(
      'manufacturing',
    );
    expect(component.metadata.annotations['dataprod.platform/version']).toBe(
      '1.0.0',
    );
    expect(component.metadata.annotations['dataprod.platform/source-systems']).toBe(
      'rest',
    );
    expect(component.metadata.annotations['dataprod.platform/interfaces']).toBe(
      'REST',
    );
    expect(component.metadata.annotations['dataprod.platform/dataContract']).toBe(
      'contracts/equipment-event.schema.json',
    );
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
      'rest-equipment-data-product',
    );
    expect(
      component.metadata.annotations['dataprod.platform/templateVersion'],
    ).toBe('1.0.0');
    expect(component.metadata.annotations['github.com/project-slug']).toBe(
      'pharma-data-factory/rest-equipment-product',
    );
    expect(
      component.metadata.annotations['dataprod.platform/providesContract'],
    ).toBeUndefined();
    expect(
      component.metadata.annotations['dataprod.platform/dataContractVersion'],
    ).toBeUndefined();
    expect(
      component.metadata.annotations['dataprod.platform/depends-on'],
    ).toBeUndefined();

    expect(api.metadata.name).toBe('rest-equipment-product--equipment-event');
    expect(api.spec.type).toBe('contract');
    expect(api.metadata.title).toBe('Equipment Event Contract');
    expect(api.metadata.annotations['dataprod.platform/contract']).toBe(
      'equipment-event',
    );
    expect(api.metadata.annotations['dataprod.platform/contract-version']).toBe(
      '1.0.0',
    );
  });

  it('generates the equipment API and REST source configuration', () => {
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
    expect(main).toContain('"/api/v1/equipment"');
    expect(main).toContain('"/api/v1/quality"');
    expect(main).toContain('"/api/v1/platform-metadata"');
    expect(main).toContain('"/api/v1/source/sync"');
    expect(main).toContain('settings.service_name');
    expect(model).toContain('equipmentId');
    expect(model).toContain('Literal["ACTIVE", "INACTIVE", "MAINTENANCE"]');
    expect(config).toContain('source_api_url');
    expect(config).toContain('source_api_token');
    expect(config).toContain('source_api_timeout');
    expect(config).toContain('data_contract_version');
    expect(envExample).toContain('SOURCE_API_URL=');
    expect(envExample).toContain('SOURCE_API_TOKEN=');
    expect(envExample).toContain('SOURCE_API_TIMEOUT=10');
  });

  it('generates structured TechDocs for the REST equipment product', () => {
    const mkdocs = render(
      fs.readFileSync(path.join(CONTENT_DIR, 'mkdocs.yml'), 'utf8'),
    );
    expect(mkdocs).toContain('Overview: index.md');
    expect(mkdocs).toContain('Architecture: architecture.md');
    expect(mkdocs).toContain('Prerequisites: prerequisites.md');
    expect(mkdocs).toContain('Create: create.md');
    expect(mkdocs).toContain('REST Source Integration: rest-source.md');
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
    ).toContain('1.0.0');
    expect(
      fs.readFileSync(path.join(CONTENT_DIR, 'catalog-info.yaml'), 'utf8'),
    ).toContain('backstage.io/techdocs-ref: dir:.');
  });

  it('generates a versioned equipment data contract', () => {
    const schema = JSON.parse(
      fs.readFileSync(
        path.join(CONTENT_DIR, 'contracts/equipment-event.schema.json'),
        'utf8',
      ),
    );
    expect(schema.version).toBe('1.0.0');
    expect(schema.required).toEqual([
      'equipmentId',
      'name',
      'site',
      'status',
      'updatedAt',
    ]);
    expect(schema.properties.equipmentId.minLength).toBe(1);
    expect(schema.properties.name.minLength).toBe(1);
    expect(schema.properties.site.minLength).toBe(1);
    expect(schema.properties.status.enum).toEqual([
      'ACTIVE',
      'INACTIVE',
      'MAINTENANCE',
    ]);
    expect(schema.properties.updatedAt.format).toBe('date-time');
    expect(schema.additionalProperties).toBe(false);
  });

  it('upserts equipment records by equipmentId', () => {
    const store = fs.readFileSync(path.join(CONTENT_DIR, 'app/store.py'), 'utf8');
    const tests = fs.readFileSync(
      path.join(CONTENT_DIR, 'tests/test_equipment.py'),
      'utf8',
    );
    expect(store).toContain('equipment_id TEXT PRIMARY KEY');
    expect(store).toContain('ON CONFLICT(equipment_id) DO UPDATE SET');
    expect(tests).toContain('same_equipment_id_updates_the_record');
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
    expect(workflow).toContain(
      'pytest tests/test_health.py tests/test_model.py tests/test_equipment.py tests/test_source.py tests/test_platform_metadata.py',
    );
    expect(workflow).toContain('pytest tests/test_contract.py');
    expect(workflow).toContain('pytest tests/test_quality.py');
    expect(workflow).toContain('pytest tests/test_compatibility.py');
    expect(workflow).toContain('docker build');
  });

  it('does not ship invented LICENSE or NOTICE files before counsel approval', () => {
    for (const file of ['LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'dataprod/LICENSE']) {
      expect(fs.existsSync(path.join(CONTENT_DIR, file))).toBe(false);
    }
    expect(
      fs.existsSync(
        path.join(ROOT, 'docs/golden-paths/rest-equipment-packaging.md'),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(TEMPLATE_DIR, 'legal-placeholders/README.md'),
      ),
    ).toBe(true);
  });
});
