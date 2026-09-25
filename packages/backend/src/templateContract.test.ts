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
  machineStateTopic: 'pharma/oee/+/state',
  counterTopic: 'pharma/oee/+/count',
  mqttTopic: 'pharma/temperature/+',
  site: 'basel',
  area: 'packaging',
  line: 'line-04',
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

function expectedComponentType(templateId: string): string {
  if (templateId === 'unified-namespace') {
    return 'platform-component';
  }
  if (
    templateId === 'python-microservice' ||
    templateId === 'nodejs-microservice'
  ) {
    return 'service';
  }
  return 'data-product';
}

function expectedCiPatterns(templateId: string): RegExp[] {
  if (
    templateId === 'mqtt-temperature-data-product' ||
    templateId === 'rest-equipment-data-product' ||
    templateId === 'machine-state-consumer-data-product' ||
    templateId === 'oee-data-product'
  ) {
    return [
      /Unit tests/i,
      /Contract tests/i,
      /Data quality tests/i,
      /Compatibility tests/i,
      /Security scan/i,
    ];
  }
  if (templateId === 'python-microservice') {
    return [/Security scan/i];
  }
  return [/Unit tests/i, /Build/i, /Security scan/i];
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

      const stepIds = entity.spec.steps.map((step: { id: string }) => step.id);
      const actionById = new Map<string, string>(
        entity.spec.steps.map((step: { id: string; action: string }) => [
          step.id,
          step.action,
        ]),
      );

      // Every template fetches its base content first, then publishes the
      // repository and registers the result in the Catalog, in that order.
      //
      // No longer asserted as "the last two steps": Step 2 adds
      // `nexora:product:create` after them on the templates that carry it, and
      // deliberately last — the repository and the entity are the expensive
      // artifacts, so they are proven before the governed record is written.
      // What has to hold is the relative order, which is what the offsets
      // check.
      expect(stepIds[0]).toBe('fetch-base');
      expect(actionById.get('fetch-base')).toBe('fetch:template');
      expect(stepIds).toContain('publish');
      expect(stepIds).toContain('register');
      expect(stepIds.indexOf('register')).toBe(stepIds.indexOf('publish') + 1);
      expect(actionById.get('publish')).toBe('publish:github');
      expect(actionById.get('register')).toBe('catalog:register');

      // A template that creates the product record must do it after the
      // Catalog entity exists, because the entity ref is what joins the two.
      // Collapsed into one unconditional assertion: a template without the
      // step reports the passing shape, so the rule reads the same whether or
      // not this template carries it.
      const productIndex = stepIds.indexOf('product');
      expect(
        productIndex === -1
          ? { action: 'nexora:product:create', afterRegister: true }
          : {
              action: actionById.get('product'),
              afterRegister: productIndex > stepIds.indexOf('register'),
            },
      ).toEqual({ action: 'nexora:product:create', afterRegister: true });

      // A template that asks the author for an approved URS baseline must also
      // verify that baseline before it publishes anything. The two always ship
      // together; a parameter without the gate would let an unapproved
      // baseline reach a generated Product repository.
      const asksForUrsBaseline = entity.spec.parameters.some(
        (group: { properties?: Record<string, unknown> }) =>
          Boolean(group.properties?.ursBaselineId),
      );
      expect({
        asksForUrsBaseline,
        verifyAction: actionById.get('verify-urs'),
        verifiesBeforePublish:
          stepIds.includes('verify-urs') &&
          stepIds.indexOf('verify-urs') < stepIds.indexOf('publish'),
      }).toEqual({
        asksForUrsBaseline,
        verifyAction: asksForUrsBaseline
          ? 'nexora:urs:verify-baseline'
          : undefined,
        verifiesBeforePublish: asksForUrsBaseline,
      });
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
      expect(component.spec.type).toBe(expectedComponentType(template.id));
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
    for (const pattern of expectedCiPatterns(template.id)) {
      expect(workflow).toMatch(pattern);
    }
  });
});
