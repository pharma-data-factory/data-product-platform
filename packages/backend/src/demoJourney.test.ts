import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

describe('MVP developer journey', () => {
  it('documents the MQTT Temperature reference demo', () => {
    const guide = fs.readFileSync(path.join(ROOT, 'docs/demo-guide.md'), 'utf8');
    const index = fs.readFileSync(path.join(ROOT, 'docs/index.md'), 'utf8');

    expect(index).toContain('demo-guide.md');
    for (const step of [
      'Architecture principle',
      'Sign in',
      'Role-aware Home',
      'Marketplace',
      'MQTT Temperature',
      'Create a Data Product',
      'Generated GitHub repository',
      'CI quality gate',
      'Data Contract',
      'Quality',
      'Dependencies',
      'Documentation',
      'Platform Compliance',
      'PASSED',
      'FAILED',
      'RUNNING',
      'CANCELLED',
      'UNKNOWN',
      'Actions: Read-only',
    ]) {
      expect(guide).toContain(step);
    }
    expect(guide).not.toMatch(/Scaffolder|Catalog Processor/i);
  });

  it('keeps product terminology on the MQTT create form', () => {
    const template = fs.readFileSync(
      path.join(ROOT, 'templates/mqtt-temperature-product/template.yaml'),
      'utf8',
    );
    expect(template).toContain('title: Data Product Name');
    expect(template).toContain('title: Owner');
    expect(template).toContain('title: GitHub Repository');
    expect(template).toContain('Certified Golden Path');
    expect(template).toContain('title: View Data Product');
    expect(template).not.toMatch(/Open in catalog|Catalog Owner/);
  });

  it('renders journey states on Home, Marketplace, and Data Products', () => {
    const home = fs.readFileSync(
      path.join(ROOT, 'packages/app/src/modules/home/HomePage.tsx'),
      'utf8',
    );
    const dashboard = fs.readFileSync(
      path.join(ROOT, 'packages/app/src/modules/home/HomeDashboard.tsx'),
      'utf8',
    );
    const marketplace = fs.readFileSync(
      path.join(ROOT, 'plugins/marketplace/src/components/MarketplacePage.tsx'),
      'utf8',
    );
    const products = fs.readFileSync(
      path.join(
        ROOT,
        'plugins/data-products/src/components/DataProductsPage.tsx',
      ),
      'utf8',
    );
    const detail = fs.readFileSync(
      path.join(
        ROOT,
        'plugins/data-products/src/components/DataProductDetailPage.tsx',
      ),
      'utf8',
    );
    const success = fs.readFileSync(
      path.join(
        ROOT,
        'packages/app/src/modules/create/CreationSuccessPage.tsx',
      ),
      'utf8',
    );

    expect(dashboard).toContain('My Data Products');
    expect(dashboard).toContain('What can I do?');
    expect(success).toContain('Data Product created');
    expect(detail).toContain('title="Overview"');
    expect(detail).toContain('Health');
    expect(detail).toContain('id="contract"');
    expect(detail).toContain('id="dependencies"');
    expect(detail).toContain('id="discover"');
    for (const source of [home, marketplace, products, detail]) {
      expect(source).toContain('JourneyState');
      expect(source).toContain('Unauthorized');
      expect(source).not.toContain('ResponseErrorPanel');
    }
  });
});
