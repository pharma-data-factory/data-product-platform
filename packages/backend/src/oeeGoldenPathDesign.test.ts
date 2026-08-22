import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import {
  parseCompositionManifest,
  toRelatedPlatformComponents,
  validateComposition,
} from '@internal/platform-common';

const ROOT = path.resolve(__dirname, '../../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function loadYamlDocs(relative: string): Array<Record<string, any>> {
  return yaml
    .parseAllDocuments(read(relative))
    .map(doc => doc.toJSON())
    .filter(Boolean);
}

function loadPlatformComponentCatalog() {
  const fromEntities = loadYamlDocs('catalog/entities.yaml');
  const location = loadYamlDocs('platform-components/catalog.yaml');
  const fromLibrary = location.flatMap(entity => {
    if (entity.kind !== 'Location') {
      return entity.kind ? [entity] : [];
    }
    return (entity.spec?.targets ?? []).flatMap((target: string) =>
      loadYamlDocs(
        path.join('platform-components', target.replace(/^\.\//, '')),
      ),
    );
  });
  return [...fromEntities, ...fromLibrary];
}

describe('OEE Golden Path Design 1.0', () => {
  it('keeps the design pack and records the implemented Golden Path separately', () => {
    expect(fs.existsSync(path.join(ROOT, 'templates/oee-data-product/template.yaml'))).toBe(
      true,
    );
    expect(read('app-config.yaml')).toContain(
      'templates/oee-data-product/template.yaml',
    );
    expect(read('docs/oee/golden-path-design.md')).not.toContain(
      'Status: **AVAILABLE**',
    );
  });

  it('validates Mode A composition with 1.x ranges and no UNS or AAS', () => {
    const catalog = toRelatedPlatformComponents(loadPlatformComponentCatalog());
    const composition = parseCompositionManifest(
      read('catalog/compositions/oee-data-product-direct.yaml'),
    );
    const refs = composition.spec.components.map(item => item.ref);
    expect(refs).toEqual(
      expect.arrayContaining([
        'component:default/health',
        'component:default/observability',
        'component:default/mqtt-consumer',
        'component:default/rest-source',
        'component:default/timeseries',
        'component:default/rest-api',
      ]),
    );
    expect(refs).not.toContain('component:default/unified-namespace');
    expect(refs).not.toContain('component:default/aas-foundation');
    expect(
      composition.spec.components.every(item => item.version === '1.x'),
    ).toBe(true);
    expect(validateComposition(composition, catalog).compatible).toBe(true);
  });

  it('freezes OEE 1.0.0 contract required fields', () => {
    const context = JSON.parse(
      read('docs/oee/schemas/production-context.schema.json'),
    );
    const result = JSON.parse(read('docs/oee/schemas/oee-result.schema.json'));
    const quality = JSON.parse(
      read('docs/oee/schemas/quality-count-event.schema.json'),
    );
    expect(context.required).toEqual(expect.arrayContaining(['equipmentId']));
    expect(result.required).toEqual(
      expect.arrayContaining([
        'equipmentId',
        'window',
        'availability',
        'performance',
        'quality',
        'oee',
        'calculationStatus',
      ]),
    );
    expect(result.properties.window.required).toEqual(['type', 'start', 'end']);
    expect(result.properties.calculationStatus.enum).toEqual(
      expect.arrayContaining([
        'COMPLETE',
        'MISSING_PRODUCTION_CONTEXT',
        'MISSING_MACHINE_STATE',
        'MISSING_IDEAL_CYCLE',
        'MISSING_COUNTER_DATA',
        'MISSING_QUALITY_DATA',
        'INSUFFICIENT_OBSERVATION',
      ]),
    );
    expect(quality.required).toEqual(
      expect.arrayContaining(['goodCount', 'rejectCount']),
    );
    expect(quality.properties.totalCount).toBeDefined();
  });
});
