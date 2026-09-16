import {
  isProductType,
  isProductVersionLabel,
  isProductVersionStatus,
  nextProductVersionLabel,
  parseProductVersionLabel,
  PRODUCT_VERSION_STATUSES,
  validateProduct,
  validateProductVersionLabel,
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
    // Named rather than counted: the count said 4 and went stale the moment
    // RELEASE_CANDIDATE was added, and a bare length says nothing about what
    // changed.
    expect(PRODUCT_VERSION_STATUSES).toEqual([
      'DRAFT',
      'APPROVED',
      'RELEASE_CANDIDATE',
      'RELEASED',
      'SUPERSEDED',
    ]);
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

  describe('version labels', () => {
    it.each(['0.1', '1.0', '2.11', '1.0.0', '10.20.30'])(
      'accepts %s',
      label => {
        expect(isProductVersionLabel(label)).toBe(true);
        expect(validateProductVersionLabel(label)).toEqual([]);
      },
    );

    it.each([
      '',
      '   ',
      'latest',
      'v1',
      '1',
      '1.',
      '1.0.0.0',
      '-1.0',
      '1.0-rc1',
      // Leading zeros would let "01.0" and "1.0" both exist as distinct
      // version identities meaning the same thing.
      '01.0',
      '1.00',
    ])('rejects %p', label => {
      expect(isProductVersionLabel(label)).toBe(false);
      expect(validateProductVersionLabel(label)).not.toEqual([]);
    });

    it('parses the parts, with patch only when present', () => {
      expect(parseProductVersionLabel('2.7')).toEqual({ major: 2, minor: 7 });
      expect(parseProductVersionLabel('2.7.3')).toEqual({
        major: 2,
        minor: 7,
        patch: 3,
      });
      expect(parseProductVersionLabel('nope')).toBeUndefined();
    });

    it('generates the next label above the highest existing major', () => {
      expect(nextProductVersionLabel([])).toBe('1.0');
      expect(nextProductVersionLabel(['1.0'])).toBe('2.0');
      // Not the count of versions: three rows whose highest major is 5.
      expect(nextProductVersionLabel(['1.0', '5.2', '3.0'])).toBe('6.0');
    });

    it('does not let an unparseable historical label block a new version', () => {
      // Rows created before the label rules existed must not wedge the
      // sequence. A leading number is still honoured; anything else is skipped.
      expect(nextProductVersionLabel(['1.0', 'draft', '2.x-legacy'])).toBe('3.0');
      expect(nextProductVersionLabel(['nonsense'])).toBe('1.0');
    });
  });
});
