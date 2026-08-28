/* eslint-disable no-restricted-imports */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, 'DataProductDetailPage.tsx'),
  'utf8',
);

describe('Data Product detail control center', () => {
  it('has overview, health, contract, dependencies, and discover', () => {
    expect(source).toContain('title="Overview"');
    expect(source).toContain('Health');
    expect(source).toContain('id="contract"');
    expect(source).toContain('title="Contract"');
    expect(source).toContain('id="dependencies"');
    expect(source).toContain('id="discover"');
    expect(source).toContain('catalogClassLabel');
    expect(source).not.toContain('View in Software Catalog');
    expect(source).not.toMatch(/Scaffolder|Entity Ref|Catalog Processor/);
    expect(source).toContain('documentationHref');
    expect(source).toContain('Upgrade Guide');
    expect(source).toContain('/releases/');
    expect(source).toContain('Contract documentation');
  });

  it('exposes Consumption Framework tabs and capabilities', () => {
    expect(source).toContain('label="Data"');
    expect(source).toContain('label="Validation"');
    expect(source).toContain('label="Realtime"');
    expect(source).toContain('useDataProduct');
    expect(source).toContain('DataProductTable');
    expect(source).toContain('NOT_VALIDATED');
    expect(source).toContain('NOT_AVAILABLE');
  });

  it('uses professional loading, empty, and unauthorized states', () => {
    expect(source).toContain('JourneyState');
    expect(source).toContain('Unauthorized');
    expect(source).toContain('Empty');
    expect(source).toContain('formatJourneyError');
    expect(source).not.toContain('ResponseErrorPanel');
  });
});
