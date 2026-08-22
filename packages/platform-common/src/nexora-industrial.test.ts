import {
  filterAssets,
  groupAssetsByHierarchy,
  isEquipmentEntity,
  relatedDataProducts,
  toIndustrialDataProduct,
  toNexoraAsset,
} from './nexora-industrial';

const filler = {
  kind: 'Component',
  metadata: {
    name: 'filler-01',
    title: 'FILLER-01',
    annotations: {
      'nexora.io/equipment-id': 'filler-01',
      'nexora.io/site': 'basel',
      'nexora.io/area': 'packaging',
      'nexora.io/line': 'line-04',
      'nexora.io/equipment-type': 'filler',
    },
  },
  spec: {
    type: 'equipment',
    owner: 'group:default/platform-team',
    lifecycle: 'production',
    system: 'packaging-line-04',
  },
};

const oee = {
  kind: 'Component',
  metadata: {
    name: 'filler-01-oee',
    title: 'OEE Data Product',
    annotations: {
      'nexora.io/equipment-id': 'filler-01',
      'nexora.io/product-type': 'oee',
      'dataprod.platform/version': '1.0',
    },
  },
  spec: {
    type: 'data-product',
    dependsOn: ['component:default/filler-01'],
    providesApis: ['filler-01-oee-api'],
  },
};

describe('nexora industrial model', () => {
  it('maps equipment annotations without hardcoding machine types', () => {
    const asset = toNexoraAsset(filler);
    expect(isEquipmentEntity(filler)).toBe(true);
    expect(asset).toMatchObject({
      equipmentId: 'filler-01',
      site: 'basel',
      area: 'packaging',
      line: 'line-04',
      equipmentType: 'filler',
    });
  });

  it('derives related Data Products from catalog relations', () => {
    const asset = toNexoraAsset(filler)!;
    expect(relatedDataProducts(asset, [filler, oee])).toEqual([
      expect.objectContaining({
        name: 'filler-01-oee',
        productType: 'oee',
        apiRef: 'filler-01-oee-api',
      }),
    ]);
  });

  it('groups Site → Area → Line → Equipment', () => {
    const dispenser = {
      ...filler,
      metadata: {
        ...filler.metadata,
        name: 'dispenser-01',
        title: 'DISPENSER-01',
        annotations: {
          ...filler.metadata.annotations,
          'nexora.io/equipment-id': 'dispenser-01',
          'nexora.io/equipment-type': 'dispenser',
        },
      },
    };
    const tree = groupAssetsByHierarchy(
      [toNexoraAsset(filler)!, toNexoraAsset(dispenser)!],
    );
    expect(tree[0].site).toBe('basel');
    expect(tree[0].areas[0].area).toBe('packaging');
    expect(tree[0].areas[0].lines[0].line).toBe('line-04');
    expect(tree[0].areas[0].lines[0].equipment.map(item => item.name)).toEqual([
      'filler-01',
      'dispenser-01',
    ]);
  });

  it('filters equipment and keeps generic product metadata', () => {
    const asset = toNexoraAsset(filler)!;
    expect(filterAssets([asset], { site: 'basel', equipmentType: 'filler' })).toHaveLength(1);
    expect(filterAssets([asset], { site: 'singapore' })).toHaveLength(0);
    expect(toIndustrialDataProduct(oee)?.productType).toBe('oee');
  });
});
