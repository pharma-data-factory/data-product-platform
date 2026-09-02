import {
  isProductType,
  isProductVersionStatus,
  PRODUCT_VERSION_STATUSES,
  validateProduct,
  validateTraceabilityLink,
} from './product';

describe('product model', () => {
  it('guards product type', () => {
    expect(isProductType('DATA_PRODUCT')).toBe(true);
    expect(isProductType('SERVICE')).toBe(true);
    expect(isProductType('DASHBOARD')).toBe(false);
  });

  it('guards product version status', () => {
    expect(isProductVersionStatus('DRAFT')).toBe(true);
    expect(isProductVersionStatus('SHIPPED')).toBe(false);
    expect(PRODUCT_VERSION_STATUSES).toHaveLength(4);
  });

  it('validates required product fields', () => {
    expect(
      validateProduct({
        name: 'Production Order Status',
        productType: 'DATA_PRODUCT',
      }),
    ).toEqual([]);
    expect(
      validateProduct({ name: '', productType: 'DATA_PRODUCT' }),
    ).toEqual(['Product name is required']);
    expect(validateProduct({ name: 'X', productType: 'BOGUS' })).toEqual([
      'Unsupported productType: BOGUS',
    ]);
  });

  it('validates traceability links', () => {
    expect(
      validateTraceabilityLink({
        sourceId: 'URS-OUT-001',
        targetId: 'comp-1',
        relationshipType: 'IMPLEMENTS',
      }),
    ).toEqual([]);
    expect(
      validateTraceabilityLink({
        sourceId: '',
        targetId: 'comp-1',
        relationshipType: 'IMPLEMENTS',
      }),
    ).toEqual(['Traceability link sourceId is required']);
  });
});
