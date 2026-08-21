import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

describe('GitHub CI status integration wiring', () => {
  it('keeps CI status on Data Product detail only', () => {
    const listPage = fs.readFileSync(
      path.join(
        ROOT,
        'plugins/data-products/src/components/DataProductsPage.tsx',
      ),
      'utf8',
    );
    const marketplacePage = fs.readFileSync(
      path.join(
        ROOT,
        'plugins/marketplace/src/components/MarketplaceDetailPage.tsx',
      ),
      'utf8',
    );
    const marketplaceList = fs.readFileSync(
      path.join(ROOT, 'plugins/marketplace/src/components/MarketplacePage.tsx'),
      'utf8',
    );

    expect(listPage).not.toContain('CI Quality Gate');
    expect(listPage).not.toContain('Last CI Result');
    expect(marketplacePage).not.toContain('CI Quality Gate');
    expect(marketplaceList).not.toContain('CI Quality Gate');
  });

  it('uses the GitHub App credential provider on the server', () => {
    const githubActions = fs.readFileSync(
      path.join(
        ROOT,
        'plugins/data-products-backend/src/githubActions.ts',
      ),
      'utf8',
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, 'plugins/data-products-backend/src/plugin.ts'),
      'utf8',
    );

    expect(githubActions).toContain('DefaultGithubCredentialsProvider');
    expect(githubActions).not.toContain('GITHUB_TOKEN');
    expect(plugin).not.toContain('GITHUB_PRIVATE_KEY');
    expect(plugin).not.toContain('clientSecret');
  });
});
