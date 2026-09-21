import {
  DATA_CONTRACT_SCHEMA_TYPES,
  findVersionLabelClash,
  isDataContractSchemaType,
  isProductType,
  isVersionLabel,
  isProductVersionStatus,
  nextMajorVersionLabel,
  parseVersionLabel,
  PRODUCT_VERSION_STATUSES,
  validateBaselineLabel,
  validateDataContractSchemaType,
  validateProduct,
  validateVersionLabel,
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
        expect(isVersionLabel(label)).toBe(true);
        expect(validateVersionLabel(label)).toEqual([]);
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
      expect(isVersionLabel(label)).toBe(false);
      expect(validateVersionLabel(label)).not.toEqual([]);
    });

    it('parses the parts, with patch only when present', () => {
      expect(parseVersionLabel('2.7')).toEqual({ major: 2, minor: 7 });
      expect(parseVersionLabel('2.7.3')).toEqual({
        major: 2,
        minor: 7,
        patch: 3,
      });
      expect(parseVersionLabel('nope')).toBeUndefined();
    });

    it('generates the next label above the highest existing major', () => {
      expect(nextMajorVersionLabel([])).toBe('1.0');
      expect(nextMajorVersionLabel(['1.0'])).toBe('2.0');
      // Not the count of versions: three rows whose highest major is 5.
      expect(nextMajorVersionLabel(['1.0', '5.2', '3.0'])).toBe('6.0');
    });

    it('does not let an unparseable historical label block a new version', () => {
      // Rows created before the label rules existed must not wedge the
      // sequence. A leading number is still honoured; anything else is skipped.
      expect(nextMajorVersionLabel(['1.0', 'draft', '2.x-legacy'])).toBe('3.0');
      expect(nextMajorVersionLabel(['nonsense'])).toBe('1.0');
    });
  });

  describe('baseline labels', () => {
    it('requires presence but not a version grammar', () => {
      // A baseline identifier often has to match an external QMS document
      // number, so imposing MAJOR.MINOR here would reject valid identifiers.
      expect(validateBaselineLabel('SOP-1234 Rev B')).toEqual([]);
      expect(validateBaselineLabel('1.0')).toEqual([]);
      expect(validateBaselineLabel('')).not.toEqual([]);
      expect(validateBaselineLabel('   ')).not.toEqual([]);
    });

    it('finds a clash ignoring case and surrounding space', () => {
      const existing = ['Rev-A', '1.0'];
      expect(findVersionLabelClash(existing, 'rev-a')).toBe('Rev-A');
      expect(findVersionLabelClash(existing, '  REV-A  ')).toBe('Rev-A');
      expect(findVersionLabelClash(existing, '1.0')).toBe('1.0');
      expect(findVersionLabelClash(existing, '2.0')).toBeUndefined();
      expect(findVersionLabelClash([], 'anything')).toBeUndefined();
    });
  });

  describe('data contract schema types', () => {
    it.each(DATA_CONTRACT_SCHEMA_TYPES)('accepts %s', value => {
      expect(isDataContractSchemaType(value)).toBe(true);
      expect(validateDataContractSchemaType(value)).toEqual([]);
    });

    it('rejects anything outside the set, including case variants', () => {
      // The stored value is the discriminant consumers switch on, so a
      // case-insensitive match that stored the input verbatim would produce a
      // value the type says cannot exist.
      for (const value of ['XSD', 'json_schema', 'JSON-SCHEMA', 'GraphQL']) {
        expect(isDataContractSchemaType(value)).toBe(false);
        expect(validateDataContractSchemaType(value)).not.toEqual([]);
      }
    });

    it('reports a missing schema type as missing, not unsupported', () => {
      expect(validateDataContractSchemaType('')).toEqual([
        'Data contract schemaType is required',
      ]);
      expect(validateDataContractSchemaType('   ')).toEqual([
        'Data contract schemaType is required',
      ]);
    });
  });
});
