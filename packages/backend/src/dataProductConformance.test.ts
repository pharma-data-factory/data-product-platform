import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { OFFICIAL_DATA_PRODUCT_TEMPLATES } from './dataProductCompatibilityMatrix';

const ROOT = path.resolve(__dirname, '../../..');

const REQUIRED_GENERATED_FILES = [
  'catalog-info.yaml',
  'Dockerfile',
  'README.md',
  '.env.example',
  'mkdocs.yml',
  'docs/index.md',
  'tests/test_quality.py',
  'tests/test_contract.py',
  'tests/test_compatibility.py',
  'tests/test_platform_metadata.py',
  '.github/workflows/ci.yml',
  '.github/workflows/data-product-quality.yml',
];

const REQUIRED_CI_STAGES = [
  /name:\s*Lint/,
  /name:\s*Unit tests/,
  /name:\s*Contract tests/,
  /name:\s*Data quality tests/,
  /name:\s*Compatibility tests/,
  /name:\s*Docker build/,
  /name:\s*Security scan/,
];

function read(dir: string, relative: string): string {
  return fs.readFileSync(path.join(dir, relative), 'utf8');
}

describe('Data Product conformance', () => {
  it.each(OFFICIAL_DATA_PRODUCT_TEMPLATES)(
    'generates the Nexora standard for $id',
    template => {
      const contentDir = path.join(ROOT, template.dir, 'content');
      const templateEntity = yaml.parse(
        fs.readFileSync(path.join(ROOT, template.dir, 'template.yaml'), 'utf8'),
      );

      for (const relative of REQUIRED_GENERATED_FILES) {
        expect(fs.existsSync(path.join(contentDir, relative))).toBe(true);
      }

      expect(fs.existsSync(path.join(contentDir, template.contractFile))).toBe(
        true,
      );
      const schema = JSON.parse(read(contentDir, template.contractFile));
      expect(schema.version).toMatch(/^\d+\.\d+\.\d+$/);

      const catalogDocs = yaml
        .parseAllDocuments(read(contentDir, 'catalog-info.yaml'))
        .map(doc => doc.toJSON());
      const component = catalogDocs.find(doc => doc.kind === 'Component');
      const api = catalogDocs.find(doc => doc.kind === 'API');

      expect(component.spec.type).toBe('data-product');
      expect(component.spec.providesApis[0]).toBe(
        `\${{ values.name }}--${template.contractLogicalName}`,
      );
      expect(component.spec.providesApis).toContain(
        `\${{ values.name }}--${template.contractLogicalName}`,
      );
      expect(
        component.metadata.annotations['dataprod.platform/providesContract'],
      ).toBeUndefined();
      expect(
        component.metadata.annotations['dataprod.platform/dataContractVersion'],
      ).toBeUndefined();
      expect(
        component.metadata.annotations['dataprod.platform/dataProductStandardVersion'],
      ).toBe('1.0.0');
      expect(
        component.metadata.annotations['dataprod.platform/dataProductSdkVersion'],
      ).toBe('1.0.0');
      expect(component.metadata.annotations['dataprod.platform/template']).toBe(
        '${{ values.templateName }}',
      );
      expect(
        component.metadata.annotations['dataprod.platform/templateVersion'],
      ).toBe('${{ values.templateVersion }}');
      expect(
        component.metadata.annotations['dataprod.platform/depends-on'],
      ).toBeUndefined();

      expect(api.kind).toBe('API');
      expect(api.spec.type).toBe('contract');
      expect(api.metadata.name).toBe(
        `\${{ values.name }}--${template.contractLogicalName}`,
      );
      expect(api.metadata.title).toBe(template.contractTitle);
      expect(api.metadata.annotations['dataprod.platform/contract']).toBe(
        template.contractLogicalName,
      );
      expect(api.metadata.annotations['dataprod.platform/contract-version']).toMatch(
        /^\d+\.\d+\.\d+$/,
      );

      const main = read(contentDir, 'app/main.py');
      const healthSnippets =
        template.id === 'oee-data-product'
          ? [
              'create_rest_app',
              '/health',
              '@router.get("/quality")',
              '@router.get("/platform-metadata")',
            ]
          : [
              '"/health"',
              '"/api/v1/quality"',
              '"/api/v1/platform-metadata"',
            ];
      for (const snippet of healthSnippets) {
        expect(main).toContain(snippet);
      }
      expect(main).toContain('platform_metadata');

      const workflow = [
        read(contentDir, '.github/workflows/ci.yml'),
        read(contentDir, '.github/workflows/data-product-quality.yml'),
      ].join('\n');
      for (const stage of REQUIRED_CI_STAGES) {
        expect(workflow).toMatch(stage);
      }
      expect(workflow).toContain('uses: ./.github/workflows/data-product-quality.yml');

      expect(read(contentDir, 'mkdocs.yml')).toContain('Overview: index.md');
      expect(read(contentDir, 'README.md')).toContain('/api/v1/platform-metadata');
      expect(read(contentDir, '.env.example')).toBeTruthy();

      expect(
        templateEntity.metadata.annotations['dataprod.platform/certification-status'],
      ).toBe(
        template.id === 'machine-state-consumer-data-product'
          ? 'TESTED'
          : 'CERTIFIED',
      );
      expect(
        templateEntity.metadata.annotations['dataprod.platform/templateVersion'],
      ).toBe('1.0.0');
      expect(templateEntity.spec.steps[0].input.values.templateVersion).toBe(
        '1.0.0',
      );
    },
  );
});
