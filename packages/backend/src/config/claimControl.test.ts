import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');

const CORE_SURFACES = [
  'packages/app/src/modules/composer/ComposePage.tsx',
  'packages/app/src/modules/releases/ReleaseCatalogPage.tsx',
  'packages/app/src/modules/legal/LegalPage.tsx',
  'plugins/data-products/src/components/CiQualityGateCard.tsx',
  'plugins/data-products/src/components/DataProductDetailPage.tsx',
  'plugins/marketplace/src/components/MarketplaceDetailPage.tsx',
] as const;

const FORBIDDEN_CLAIMS = [
  /GMP VALIDATED(?![\s\S]{0,40}out of scope)/i,
  /GxP COMPLIANT/i,
  /PART 11 COMPLIANT/i,
];

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

describe('Platform Core claim control', () => {
  it('does not claim GMP validation, GxP compliance, or Part 11 on Core surfaces', () => {
    for (const relative of CORE_SURFACES) {
      const text = read(relative);
      for (const claim of FORBIDDEN_CLAIMS) {
        expect(`${relative}: ${text}`).not.toMatch(claim);
      }
    }
  });

  it('qualifies technical CERTIFIED / RELEASED / VALIDATED composition language', () => {
    expect(read('packages/app/src/modules/composer/ComposePage.tsx')).toMatch(
      /technical certification — not GMP validation/i,
    );
    expect(read('packages/app/src/modules/composer/ComposePage.tsx')).toContain(
      'NOT_VALIDATED',
    );
    expect(read('packages/app/src/modules/releases/ReleaseCatalogPage.tsx')).toMatch(
      /Technical certification — not GMP/i,
    );
    expect(read('plugins/data-products/src/components/CiQualityGateCard.tsx')).toMatch(
      /not GxP or\s+regulatory validation/i,
    );
    expect(
      read('plugins/data-products/src/components/DataProductDetailPage.tsx'),
    ).toMatch(/not GxP or regulatory/i);
    expect(
      read('plugins/marketplace/src/components/MarketplaceDetailPage.tsx'),
    ).toMatch(/not GxP/i);
  });
});
