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

  // This page fetched every Component and API in the catalog and picked its
  // subject out with a client-side `.find`, so the payload grew with the
  // catalog to deliver one product. It resolves a bounded neighbourhood now
  // — see `catalogNeighbourhood.test.ts`, which measures that the result is
  // identical to the scan's rather than assuming it.
  //
  // A source assertion rather than a rendering one because that is what this
  // file is: it reads the component as text and never mounts it. The
  // regression it guards against is the scan coming back, which is visible
  // here and invisible in the rendered output. NXD-089.
  it('resolves a neighbourhood instead of scanning the catalog', () => {
    expect(source).toContain('fetchProductNeighbourhood');
    // Matches the call, not the comment above it that names what was
    // removed — an assertion that fires on its own explanation is a
    // nuisance, and deleting the explanation to satisfy it would be worse.
    expect(source).not.toMatch(/catalogApi\s*\.\s*getEntities\(/);
  });
});
