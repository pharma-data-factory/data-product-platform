import { DATA_PRODUCT_COMPATIBILITY_MATRIX } from './dataProductCompatibilityMatrix';

describe('Data Product compatibility matrix', () => {
  it('keeps Standard 1.0.x aligned with SDK 1.x and official 1.x templates', () => {
    expect(DATA_PRODUCT_COMPATIBILITY_MATRIX).toEqual({
      standard: '1.0.x',
      compatible: {
        sdk: '1.x',
        templates: {
          'mqtt-temperature-data-product': '1.x',
          'rest-equipment-data-product': '1.x',
          'machine-state-consumer-data-product': '1.x',
          'oee-data-product': '1.x',
        },
      },
    });
  });
});
