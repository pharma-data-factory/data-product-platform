import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { contractApiEntityName } from './apiIdentity';
import { OFFICIAL_DATA_PRODUCT_TEMPLATES } from './dataProductCompatibilityMatrix';

const ROOT = path.resolve(__dirname, '../../..');

function render(source: string, values: Record<string, unknown>): string {
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
      }, values);
    return value === undefined || value === null ? '' : String(value);
  });
}

function renderCatalog(
  templateDir: string,
  productName: string,
  extra: Record<string, unknown> = {},
) {
  const rendered = render(
    fs.readFileSync(
      path.join(ROOT, templateDir, 'content/catalog-info.yaml'),
      'utf8',
    ),
    {
      name: productName,
      title: productName,
      description: 'Collision test',
      owner: 'group:default/platform-team',
      system: 'data-platform',
      domain: 'manufacturing',
      lifecycle: 'experimental',
      version: '1.0.0',
      templateName: 'collision-test',
      templateVersion: '1.0.0',
      destination: { owner: 'pharma-data-factory', repo: productName },
      ...extra,
    },
  );
  const docs = yaml.parseAllDocuments(rendered).map(doc => doc.toJSON());
  return {
    component: docs.find(doc => doc.kind === 'Component'),
    api: docs.find(doc => doc.kind === 'API'),
  };
}

describe('API identity collision avoidance', () => {
  it.each(OFFICIAL_DATA_PRODUCT_TEMPLATES)(
    'gives $id products unique API entities for the same logical contract',
    template => {
      const first = renderCatalog(template.dir, 'cold-room-product');
      const second = renderCatalog(template.dir, 'warehouse-product');
      const expectedFirst = contractApiEntityName(
        'cold-room-product',
        template.contractLogicalName,
      );
      const expectedSecond = contractApiEntityName(
        'warehouse-product',
        template.contractLogicalName,
      );

      expect(first.api.metadata.title).toBe(template.contractTitle);
      expect(second.api.metadata.title).toBe(template.contractTitle);
      expect(first.api.metadata.annotations['dataprod.platform/contract']).toBe(
        template.contractLogicalName,
      );
      expect(second.api.metadata.annotations['dataprod.platform/contract']).toBe(
        template.contractLogicalName,
      );
      expect(first.api.metadata.name).toBe(expectedFirst);
      expect(second.api.metadata.name).toBe(expectedSecond);
      expect(first.api.metadata.name).not.toBe(second.api.metadata.name);
      expect(first.component.spec.providesApis).toEqual([expectedFirst]);
      expect(second.component.spec.providesApis).toEqual([expectedSecond]);
      expect(
        first.component.metadata.annotations['dataprod.platform/providesContract'],
      ).toBeUndefined();
      expect(
        first.component.metadata.annotations[
          'dataprod.platform/dataContractVersion'
        ],
      ).toBeUndefined();
    },
  );
});
