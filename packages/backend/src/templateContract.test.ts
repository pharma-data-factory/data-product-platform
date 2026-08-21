import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');

const TEMPLATES = [
  {
    id: 'python-microservice',
    dir: 'templates/python-service',
    title: 'Python Microservice',
  },
  {
    id: 'nodejs-microservice',
    dir: 'templates/node-service',
    title: 'Node.js Microservice',
  },
  {
    id: 'mqtt-data-connector',
    dir: 'templates/mqtt-connector',
    title: 'MQTT Data Connector',
  },
  {
    id: 'mqtt-temperature-data-product',
    dir: 'templates/mqtt-temperature-product',
    title: 'MQTT Temperature Data Product',
  },
  {
    id: 'rest-equipment-data-product',
    dir: 'templates/rest-equipment-product',
    title: 'REST Equipment Data Product',
  },
  {
    id: 'unified-namespace',
    dir: 'templates/unified-namespace',
    title: 'Unified Namespace',
  },
  {
    id: 'machine-state-consumer-data-product',
    dir: 'templates/machine-state-consumer',
    title: 'Machine State Consumer Data Product',
  },
  {
    id: 'oee-data-product',
    dir: 'templates/oee-data-product',
    title: 'OEE Data Product',
  },
];

const REQUIRED_CONTENT_FILES = [
  'catalog-info.yaml',
  'README.md',
  'Dockerfile',
  'docker-compose.yml',
  'docs/index.md',
  'mkdocs.yml',
  '.github/workflows/ci.yml',
];

const SAMPLE_VALUES: Record<string, unknown> = {
  name: 'demo-service',
  title: 'Demo Service',
  description: 'Generated for contract tests',
  owner: 'group:default/platform-team',
  system: 'data-platform',
  domain: 'platform',
  lifecycle: 'experimental',
  version: '1.0.0',
  sourceSystems: 'none',
  interfaces: 'REST',
  dataContracts: 'health-v1',
  dependsOn: '',
  defaultTopic: 'dataprod/events',
  mqttTopic: 'pharma/temperature/+',
  equipmentId: 'filler-01',
  defaultWindow: 'hour',
  contextUrlRef: 'SOURCE_API_URL',
  rootNamespace: 'pharma',
  environment: 'development',
  unsComponent: 'component:default/unified-namespace',
  topicPattern: 'pharma/+/+/+/+/machine/state',
  templateName: 'contract-test',
  templateVersion: '1.0.0',
  destination: { owner: 'acme', repo: 'demo-service' },
};

function render(source: string, values: Record<string, unknown>): string {
  return source.replace(/\$\{\{\s*([^}]+)\s*\}\}/g, (_match, expression) => {
    const trimmed = String(expression).trim();
    if (trimmed.startsWith('values.')) {
      const pathExpr = trimmed.replace(/^values\./, '');
      const value = pathExpr
        .split('.')
        .reduce<unknown>((current, key) => {
          if (current && typeof current === 'object') {
            return (current as Record<string, unknown>)[key];
          }
          return undefined;
        }, values);
      return value === undefined || value === null ? '' : String(value);
    }
    return '';
  });
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

describe('template registration and generation contract', () => {
  it('registers the official templates', () => {
    for (const template of TEMPLATES) {
      const raw = fs.readFileSync(
        path.join(ROOT, template.dir, 'template.yaml'),
        'utf8',
      );
      const entity = yaml.parse(raw);
      expect(entity.kind).toBe('Template');
      expect(entity.metadata.name).toBe(template.id);
      expect(entity.metadata.title).toBe(template.title);
      expect(entity.spec.steps.map((step: { id: string }) => step.id)).toEqual([
        'fetch-base',
        'publish',
        'register',
      ]);
      expect(entity.spec.steps[1].action).toBe('publish:github');
      expect(entity.spec.steps[2].action).toBe('catalog:register');
    }
  });

  it.each(TEMPLATES)(
    'generates the standard contract for $id',
    template => {
      const contentDir = path.join(ROOT, template.dir, 'content');
      for (const relative of REQUIRED_CONTENT_FILES) {
        expect(fs.existsSync(path.join(contentDir, relative))).toBe(true);
      }

      const values = {
        ...SAMPLE_VALUES,
        templateName: template.id,
      };
      const catalogRaw = fs.readFileSync(
        path.join(contentDir, 'catalog-info.yaml'),
        'utf8',
      );
      const rendered = render(catalogRaw, values);
      const docs = yaml.parseAllDocuments(rendered).map(doc => doc.toJSON());
      const component = docs.find(doc => doc.kind === 'Component');

      expect(component.metadata.name).toBe('demo-service');
      expect(component.metadata.title).toBe('Demo Service');
      expect(component.metadata.description).toBe('Generated for contract tests');
      expect(component.spec.owner).toBe('group:default/platform-team');
      expect(component.spec.type).toBe(
        template.id === 'unified-namespace'
          ? 'platform-component'
          : template.id === 'python-microservice' ||
              template.id === 'nodejs-microservice'
            ? 'service'
            : 'data-product',
      );
      expect(component.spec.lifecycle).toBe('experimental');
      expect(component.metadata.annotations['dataprod.platform/version']).toBe(
        '1.0.0',
      );
      expect(
        component.metadata.annotations['dataprod.platform/certification-status'],
      ).toBe('DEVELOPMENT');
      expect(component.metadata.annotations['github.com/project-slug']).toBe(
        'acme/demo-service',
      );
      expect(
        component.metadata.annotations['backstage.io/techdocs-ref'],
      ).toBe('dir:.');
    },
  );

  it.each(TEMPLATES)('generates a health endpoint for $id', template => {
    const contentDir = path.join(ROOT, template.dir, 'content');
    const sourceDir =
      template.id === 'nodejs-microservice' || template.id === 'mqtt-data-connector'
        ? 'src'
        : 'app';
    const rendered = walk(path.join(contentDir, sourceDir))
      .map(file => render(fs.readFileSync(file, 'utf8'), SAMPLE_VALUES))
      .join('\n');
    expect(rendered).toContain('/health');
    expect(rendered).toContain('UP');
    expect(rendered).toContain('demo-service');
    expect(rendered).toContain('1.0.0');
  });

  it.each(TEMPLATES)('generates CI with the required stages for $id', template => {
    const ciPath = path.join(ROOT, template.dir, 'content/.github/workflows/ci.yml');
    const reusablePath = path.join(
      ROOT,
      template.dir,
      'content/.github/workflows/data-product-quality.yml',
    );
    const workflow = fs.existsSync(reusablePath)
      ? `${fs.readFileSync(ciPath, 'utf8')}\n${fs.readFileSync(reusablePath, 'utf8')}`
      : fs.readFileSync(ciPath, 'utf8');
    expect(workflow).toMatch(/Lint/i);
    expect(workflow).toMatch(/Tests/i);
    expect(workflow).toMatch(/Docker build/i);
    if (
      template.id === 'mqtt-temperature-data-product' ||
      template.id === 'rest-equipment-data-product' ||
      template.id === 'machine-state-consumer-data-product' ||
      template.id === 'oee-data-product'
    ) {
      expect(workflow).toMatch(/Unit tests/i);
      expect(workflow).toMatch(/Contract tests/i);
      expect(workflow).toMatch(/Data quality tests/i);
      expect(workflow).toMatch(/Compatibility tests/i);
      expect(workflow).toMatch(/Security scan/i);
    } else if (template.id === 'python-microservice') {
      expect(workflow).toMatch(/Security scan/i);
    } else {
      expect(workflow).toMatch(/Unit tests/i);
      expect(workflow).toMatch(/Build/i);
      expect(workflow).toMatch(/Security scan/i);
    }
  });
});
