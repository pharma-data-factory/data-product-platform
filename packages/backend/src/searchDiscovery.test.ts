import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');
const backendIndex = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
const appPackage = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'packages/app/package.json'), 'utf8'),
);
const sidebar = fs.readFileSync(
  path.join(ROOT, 'packages/app/src/modules/nav/Sidebar.tsx'),
  'utf8',
);
const entities = [
  ...yaml
    .parseAllDocuments(
      fs.readFileSync(path.join(ROOT, 'catalog/entities.yaml'), 'utf8'),
    )
    .map(doc => doc.toJSON()),
  ...yaml
    .parseAllDocuments(
      fs.readFileSync(path.join(ROOT, 'catalog/samples/entities.yaml'), 'utf8'),
    )
    .map(doc => doc.toJSON()),
].filter(Boolean) as Array<{
  kind?: string;
  spec?: { type?: string };
  metadata?: { name?: string; description?: string; title?: string };
}>;

describe('native Search discovery', () => {
  it('registers Catalog and TechDocs search collators only', () => {
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-search-backend'))",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-search-backend-module-catalog'))",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-search-backend-module-techdocs'))",
    );
    expect(backendIndex).not.toContain('search-backend-module-data-products');
    expect(appPackage.dependencies['@backstage/plugin-search']).toBeDefined();
    expect(sidebar).toContain('SidebarSearchModal');
    expect(sidebar).toContain('to="/search"');
    expect(sidebar).toContain('to="/releases"');
    expect(sidebar).toContain('to="/platform-components"');
    expect(sidebar).toContain('hasApprovedPlatformAccess');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'packages/app/src/modules/developer-hub/index.tsx'),
        'utf8',
      ),
    ).toContain("path: '/developer'");
    expect(
      fs.readFileSync(
        path.join(
          ROOT,
          'plugins/marketplace/src/components/MarketplaceDetailPage.tsx',
        ),
        'utf8',
      ),
    ).toContain('goldenPathDocumentationHref');
    expect(
      fs.readFileSync(
        path.join(
          ROOT,
          'plugins/marketplace/src/components/MarketplaceDetailPage.tsx',
        ),
        'utf8',
      ),
    ).toContain('Golden Path documentation');
    expect(backendIndex).not.toContain('search-backend-module-explore');
    expect(backendIndex).not.toContain('search-backend-module-developer-hub');
    expect(
      fs.readFileSync(path.join(ROOT, 'app-config.yaml'), 'utf8'),
    ).toContain('search-result-list-item:techdocs: false');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'packages/app/src/modules/search/index.tsx'),
        'utf8',
      ),
    ).toContain('ClassifiedTechDocsSearchResultListItem');
  });

  it('indexes Data Product components and contract API entities in Catalog', () => {
    const dataProducts = entities.filter(
      entity =>
        entity.kind === 'Component' && entity.spec?.type === 'data-product',
    );
    const contract = entities.find(
      entity =>
        entity.kind === 'API' &&
        entity.metadata?.name ===
          'sample-mqtt-temperature-product--temperature-event',
    );
    const equipmentContract = entities.find(
      entity =>
        entity.kind === 'API' &&
        entity.metadata?.name ===
          'sample-rest-equipment-product--equipment-event',
    );
    expect(dataProducts.map(entity => entity.metadata?.name)).toEqual(
      expect.arrayContaining([
        'sample-mqtt-temperature-product',
        'temperature-dashboard-consumer',
        'sample-rest-equipment-product',
        'equipment-dashboard-consumer',
      ]),
    );
    expect(contract?.metadata?.title).toBe('Temperature Event Contract');
    expect(contract?.metadata?.description).toContain('1.1.0');
    expect(equipmentContract?.metadata?.title).toBe('Equipment Event Contract');
    expect(equipmentContract?.metadata?.description).toContain('1.0.0');
    for (const entity of [...dataProducts, contract, equipmentContract]) {
      expect(entity?.metadata?.name).toBeTruthy();
      expect(entity?.metadata?.description || entity?.metadata?.title).toBeTruthy();
    }
  });

  it('indexes Platform Component Catalog entities separately from Data Products', () => {
    const uns = entities.find(
      entity =>
        entity.kind === 'Component' &&
        entity.metadata?.name === 'unified-namespace',
    );
    expect(uns?.spec?.type).toBe('platform-component');
    expect(
      entities.some(
        entity =>
          entity.kind === 'Component' &&
          entity.spec?.type === 'data-product' &&
          entity.metadata?.name === 'unified-namespace',
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(ROOT, 'docs/platform-components/index.md'),
      ),
    ).toBe(true);
    expect(
      fs.readFileSync(path.join(ROOT, 'mkdocs.yml'), 'utf8'),
    ).toContain('platform-components/index.md');
    expect(
      fs.existsSync(path.join(ROOT, 'docs/platform-components/health.md')),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(ROOT, 'docs/platform-components/build-from-components.md'),
      ),
    ).toBe(true);
  });
});
