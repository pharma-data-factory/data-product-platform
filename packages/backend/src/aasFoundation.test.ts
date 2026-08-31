import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

describe('AAS Foundation Platform Component', () => {
  it('is DEVELOPMENT and is not a Data Product', () => {
    const catalog = yaml.parse(
      read('platform-components/asset-semantic/aas-foundation/catalog-info.yaml'),
    );
    expect(catalog.kind).toBe('Component');
    expect(catalog.metadata.name).toBe('aas-foundation');
    expect(catalog.spec.type).toBe('platform-component');
    expect(catalog.spec.owner).toBe('group:default/platform-team');
    expect(catalog.metadata.annotations['dataprod.platform/category']).toBe(
      'asset-semantic',
    );
    expect(catalog.metadata.annotations['dataprod.platform/version']).toBe(
      '1.0.0',
    );
    expect(
      catalog.metadata.annotations['dataprod.platform/certification-status'],
    ).toBe('DEVELOPMENT');
    expect(catalog.spec.dependsOn).toEqual([
      'component:default/health',
      'component:default/observability',
      'component:default/rest-api',
    ]);
    expect(catalog.spec.type).not.toBe('data-product');
    expect(read('plugins/aas-backend/src/router.ts')).toContain("persistence: 'in-memory'");
    expect(read('platform-components/asset-semantic/aas-foundation/README.md')).toContain(
      'pdf-aas',
    );
    expect(
      fs.existsSync(
        path.join(
          ROOT,
          'platform-components/asset-semantic/aas-foundation/RELEASE_NOTES.md',
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(ROOT, 'platform-components/asset-semantic/aas-foundation/Dockerfile'),
      ),
    ).toBe(true);
    expect(read('platform-components/asset-semantic/aas-foundation/.env.example')).not.toMatch(
      /sk-|ghp_|BEGIN /,
    );
  });

  it('does not register Filler 01 as a Catalog Component', () => {
    const catalogYaml = read('platform-components/catalog.yaml');
    expect(catalogYaml).toContain('./asset-semantic/aas-foundation/catalog-info.yaml');
    expect(catalogYaml).not.toContain('filler-01');
    expect(read('catalog/entities.yaml')).not.toContain('name: filler-01');
  });
});
