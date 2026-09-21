import {
  NEXORA_ANNOTATIONS,
  HEALTH_STATES,
  CONNECTIVITY_STATUSES,
  EQUIPMENT_STATES,
  CONTRACT_COMPATIBILITY,
  parseHealthState,
  parseConnectivityStatus,
  parseEquipmentState,
  parseCompatibility,
  entityRefOf,
  entityNameFromRef,
  isEquipmentEntity,
  isIndustrialDataProduct,
  toNexoraAsset,
  toIndustrialDataProduct,
  filterAssets,
  filterIndustrialProducts,
  groupAssetsByHierarchy,
  uniqueValues,
  relatedDataProducts,
} from './index';

const makeEntity = (overrides: Record<string, unknown> = {}) => ({
  kind: 'Component',
  metadata: {
    name: 'test-entity',
    namespace: 'default',
    annotations: {},
    tags: [],
    ...((overrides.metadata as object) ?? {}),
  },
  spec: {
    type: 'equipment',
    owner: 'team-a',
    lifecycle: 'production',
    ...((overrides.spec as object) ?? {}),
  },
  relations: [],
  ...overrides,
});

describe('NEXORA_ANNOTATIONS', () => {
  it('all annotation keys start with nexora.io prefix', () => {
    for (const value of Object.values(NEXORA_ANNOTATIONS)) {
      expect(value.startsWith('nexora.io/')).toBe(true);
    }
  });

  it('equipmentId key is stable', () => {
    expect(NEXORA_ANNOTATIONS.equipmentId).toBe('nexora.io/equipment-id');
  });
});

describe('parse helpers', () => {
  it('parseHealthState returns valid state from list', () => {
    for (const state of HEALTH_STATES) {
      expect(parseHealthState(state)).toBe(state);
    }
  });

  it('parseHealthState returns UNKNOWN for invalid input', () => {
    expect(parseHealthState('invalid')).toBe('UNKNOWN');
    expect(parseHealthState(undefined)).toBe('UNKNOWN');
  });

  it('parseConnectivityStatus returns valid status from list', () => {
    for (const status of CONNECTIVITY_STATUSES) {
      expect(parseConnectivityStatus(status)).toBe(status);
    }
  });

  it('parseConnectivityStatus returns UNKNOWN for invalid input', () => {
    expect(parseConnectivityStatus('nope')).toBe('UNKNOWN');
  });

  it('parseEquipmentState returns valid state from list', () => {
    for (const state of EQUIPMENT_STATES) {
      expect(parseEquipmentState(state)).toBe(state);
    }
  });

  it('parseEquipmentState returns UNKNOWN for invalid input', () => {
    expect(parseEquipmentState('broken')).toBe('UNKNOWN');
  });

  it('parseCompatibility returns valid value from list', () => {
    for (const compat of CONTRACT_COMPATIBILITY) {
      expect(parseCompatibility(compat)).toBe(compat);
    }
  });

  it('parseCompatibility returns UNKNOWN for unknown input', () => {
    expect(parseCompatibility('??')).toBe('UNKNOWN');
  });
});

describe('entityRefOf', () => {
  it('produces kind:namespace/name format', () => {
    const entity = makeEntity();
    expect(entityRefOf(entity)).toBe('component:default/test-entity');
  });

  it('falls back to default namespace when missing', () => {
    const entity = makeEntity({ metadata: { name: 'foo', annotations: {}, tags: [] } });
    expect(entityRefOf(entity)).toBe('component:default/foo');
  });
});

describe('entityNameFromRef', () => {
  it('extracts name after last slash', () => {
    expect(entityNameFromRef('component:default/my-entity')).toBe('my-entity');
  });

  it('returns the string itself when no slash', () => {
    expect(entityNameFromRef('my-entity')).toBe('my-entity');
  });

  it('returns undefined for falsy input', () => {
    expect(entityNameFromRef(undefined)).toBeUndefined();
    expect(entityNameFromRef('')).toBeUndefined();
  });
});

describe('isEquipmentEntity', () => {
  it('returns true for equipment Component', () => {
    expect(isEquipmentEntity(makeEntity())).toBe(true);
  });

  it('returns true when entity has equipment-id annotation', () => {
    const entity = makeEntity({
      metadata: {
        name: 'e1',
        namespace: 'default',
        annotations: { 'nexora.io/equipment-id': 'EQ-001' },
        tags: [],
      },
      spec: { type: 'service', owner: 'team' },
    });
    expect(isEquipmentEntity(entity)).toBe(true);
  });

  it('returns false for non-Component kinds', () => {
    const entity = makeEntity({ kind: 'API' });
    expect(isEquipmentEntity(entity)).toBe(false);
  });

  it('returns false for Component with non-equipment type and no annotation', () => {
    const entity = makeEntity({ spec: { type: 'library', owner: 'team' } });
    expect(isEquipmentEntity(entity)).toBe(false);
  });
});

describe('isIndustrialDataProduct', () => {
  const dpEntity = (annotations: Record<string, string> = {}) =>
    makeEntity({
      metadata: { name: 'dp', namespace: 'default', annotations, tags: [] },
      spec: { type: 'data-product', owner: 'team' },
    });

  it('returns true for data-product with equipment-id annotation', () => {
    expect(
      isIndustrialDataProduct(dpEntity({ 'nexora.io/equipment-id': 'EQ-1' })),
    ).toBe(true);
  });

  it('returns false for non-Component kind', () => {
    expect(isIndustrialDataProduct(makeEntity({ kind: 'API' }))).toBe(false);
  });

  it('returns false for equipment type (not data-product)', () => {
    expect(isIndustrialDataProduct(makeEntity())).toBe(false);
  });

  it('returns false for data-product with no industrial annotations', () => {
    expect(isIndustrialDataProduct(dpEntity())).toBe(false);
  });
});

describe('toNexoraAsset', () => {
  it('converts equipment entity to NexoraAsset', () => {
    const entity = makeEntity({
      metadata: {
        name: 'pump-01',
        namespace: 'default',
        title: 'Pump 01',
        annotations: {
          'nexora.io/equipment-id': 'EQ-PUMP-01',
          'nexora.io/site': 'plant-a',
          'nexora.io/area': 'zone-1',
          'nexora.io/line': 'line-3',
          'nexora.io/equipment-type': 'pump',
          'nexora.io/manufacturer': 'Grundfos',
        },
        tags: ['critical'],
      },
      spec: { type: 'equipment', owner: 'team-ops', lifecycle: 'production', system: 'water-system' },
    });

    const asset = toNexoraAsset(entity);
    expect(asset).not.toBeUndefined();
    expect(asset!.equipmentId).toBe('EQ-PUMP-01');
    expect(asset!.site).toBe('plant-a');
    expect(asset!.area).toBe('zone-1');
    expect(asset!.line).toBe('line-3');
    expect(asset!.equipmentType).toBe('pump');
    expect(asset!.manufacturer).toBe('Grundfos');
    expect(asset!.owner).toBe('team-ops');
    expect(asset!.lifecycle).toBe('production');
    expect(asset!.system).toBe('water-system');
    expect(asset!.tags).toEqual(['critical']);
  });

  it('returns undefined for non-equipment entity', () => {
    const entity = makeEntity({ spec: { type: 'library', owner: 'team' } });
    expect(toNexoraAsset(entity)).toBeUndefined();
  });

  it('falls back to metadata.name when no equipment-id annotation', () => {
    const entity = makeEntity();
    const asset = toNexoraAsset(entity);
    expect(asset!.equipmentId).toBe('test-entity');
  });
});

describe('toIndustrialDataProduct', () => {
  it('converts data-product entity with industrial annotation', () => {
    const entity = makeEntity({
      metadata: {
        name: 'dp-oee',
        namespace: 'default',
        title: 'OEE Data Product',
        annotations: {
          'nexora.io/equipment-id': 'EQ-001',
          'dataprod.platform/domain': 'manufacturing',
          'dataprod.platform/version': '1.2.0',
        },
        tags: [],
      },
      spec: { type: 'data-product', owner: 'team-data', lifecycle: 'production', providesApis: ['api:default/oee-api'] },
      relations: [],
    });

    const product = toIndustrialDataProduct(entity);
    expect(product).not.toBeUndefined();
    expect(product!.name).toBe('dp-oee');
    expect(product!.domain).toBe('manufacturing');
    expect(product!.version).toBe('1.2.0');
    expect(product!.equipmentId).toBe('EQ-001');
  });

  it('returns undefined for non-data-product type', () => {
    expect(toIndustrialDataProduct(makeEntity())).toBeUndefined();
  });
});

describe('filterAssets', () => {
  const assets = [
    { name: 'pump', equipmentId: 'EQ-1', title: 'Pump', site: 'plant-a', area: 'zone-1', line: 'L1', equipmentType: 'pump', owner: 'ops', lifecycle: 'production', entityRef: 'component:default/pump', tags: [] },
    { name: 'sensor', equipmentId: 'EQ-2', title: 'Sensor', site: 'plant-b', area: 'zone-2', line: 'L2', equipmentType: 'sensor', owner: 'eng', lifecycle: 'experimental', entityRef: 'component:default/sensor', tags: [] },
  ];

  it('filters by site', () => {
    const result = filterAssets(assets, { site: 'plant-a' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('pump');
  });

  it('filters by query', () => {
    const result = filterAssets(assets, { query: 'sensor' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('sensor');
  });

  it('returns all when no filters', () => {
    expect(filterAssets(assets, {})).toHaveLength(2);
  });
});

describe('filterIndustrialProducts', () => {
  const products = [
    { name: 'p1', title: 'Prod1', domain: 'mfg', owner: 'ops', lifecycle: 'production', productType: 'TIMESERIES', version: '1.0', entityRef: 'c:d/p1', equipmentId: 'EQ-1', providesApis: [], dependsOn: [] },
    { name: 'p2', title: 'Prod2', domain: 'lab', owner: 'eng', lifecycle: 'experimental', productType: 'OEE', version: '2.0', entityRef: 'c:d/p2', equipmentId: undefined, providesApis: [], dependsOn: [] },
  ];

  it('filters by domain', () => {
    const result = filterIndustrialProducts(products, { domain: 'mfg' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('p1');
  });

  it('filters by productType', () => {
    const result = filterIndustrialProducts(products, { productType: 'OEE' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('p2');
  });

  it('returns all when no filters', () => {
    expect(filterIndustrialProducts(products, {})).toHaveLength(2);
  });
});

describe('groupAssetsByHierarchy', () => {
  const assets = [
    { name: 'a', equipmentId: 'EQ-1', title: 'A', site: 'site1', area: 'area1', line: 'line1', tags: [], entityRef: 'c:d/a' } as any,
    { name: 'b', equipmentId: 'EQ-2', title: 'B', site: 'site1', area: 'area1', line: 'line2', tags: [], entityRef: 'c:d/b' } as any,
    { name: 'c', equipmentId: 'EQ-3', title: 'C', site: 'site2', area: 'area2', line: 'line1', tags: [], entityRef: 'c:d/c' } as any,
  ];

  it('groups by site > area > line', () => {
    const result = groupAssetsByHierarchy(assets);
    expect(result).toHaveLength(2);
    const site1 = result.find(s => s.site === 'site1')!;
    expect(site1.areas).toHaveLength(1);
    expect(site1.areas[0].lines).toHaveLength(2);
    const site2 = result.find(s => s.site === 'site2')!;
    expect(site2.areas[0].lines[0].equipment).toHaveLength(1);
  });

  it('uses fallback labels for missing hierarchy fields', () => {
    const noSite = [{ name: 'x', equipmentId: 'EQ-X', title: 'X', tags: [], entityRef: 'c:d/x' } as any];
    const result = groupAssetsByHierarchy(noSite);
    expect(result[0].site).toBe('Unassigned site');
    expect(result[0].areas[0].area).toBe('Unassigned area');
  });
});

describe('uniqueValues', () => {
  it('returns sorted unique string values for a given key', () => {
    const items = [{ site: 'b' }, { site: 'a' }, { site: 'b' }, { site: 'c' }];
    expect(uniqueValues(items, 'site')).toEqual(['a', 'b', 'c']);
  });

  it('ignores non-string and empty values', () => {
    const items = [{ site: 'a' }, { site: '' }, { site: undefined as any }];
    expect(uniqueValues(items, 'site')).toEqual(['a']);
  });
});

describe('relatedDataProducts', () => {
  const equipment = {
    name: 'pump-01',
    equipmentId: 'EQ-PUMP-01',
    entityRef: 'component:default/pump-01',
    title: 'Pump 01',
    tags: [],
  } as any;

  const entities = [
    makeEntity({
      metadata: {
        name: 'oee-dp',
        namespace: 'default',
        title: 'OEE Data Product',
        annotations: {
          'nexora.io/equipment-id': 'EQ-PUMP-01',
          'nexora.io/oee-api': '/api/oee',
        },
        tags: [],
      },
      spec: { type: 'data-product', owner: 'team', providesApis: ['api:default/oee-api'] },
      relations: [],
    }),
    makeEntity({
      metadata: { name: 'unrelated', namespace: 'default', annotations: {}, tags: [] },
      spec: { type: 'data-product', owner: 'team', providesApis: [] },
      relations: [],
    }),
  ];

  it('returns products related to the equipment by equipmentId', () => {
    const result = relatedDataProducts(equipment, entities);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('oee-dp');
  });
});
