import {
  DATA_CONTRACT_SCHEMA_TYPES,
  findVersionLabelClash,
  isDataContractSchemaType,
  isProductType,
  isVersionLabel,
  isProductVersionStatus,
  nextMajorVersionLabel,
  parseVersionLabel,
  versionLabelsEquivalent,
  PRODUCT_VERSION_STATUSES,
  validateBaselineLabel,
  validateDataContractSchemaType,
  validateProduct,
  validateVersionLabel,
  validateTraceabilityLink,
  isRequirementOrigin,
  validateProductRequirement,
  REQUIREMENT_ORIGINS,
  validateTestExecution,
  latestExecutionPerCase,
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
        sourceType: 'URS_REQUIREMENT',
        sourceId: 'URS-OUT-001',
        targetType: 'PRODUCT_COMPONENT',
        targetId: 'comp-1',
        relationshipType: 'IMPLEMENTS',
      }),
    ).toEqual([]);
    expect(
      validateTraceabilityLink({
        sourceType: 'URS_REQUIREMENT',
        sourceId: '',
        targetType: 'PRODUCT_COMPONENT',
        targetId: 'comp-1',
        relationshipType: 'IMPLEMENTS',
      }),
    ).toEqual(['Traceability link sourceId is required']);
  });

  // The two type fields were free strings until MVP1-B and drifted into
  // three spellings of "a requirement" and two of "a component". They are a
  // closed vocabulary now, and so is relationshipType, which had a constant
  // since Phase 1 that the validator never consulted.
  it('rejects a traceability link whose types are outside the vocabulary', () => {
    expect(
      validateTraceabilityLink({
        sourceType: 'URS',
        sourceId: 'URS-OUT-001',
        targetType: 'COMPONENT',
        targetId: 'comp-1',
        relationshipType: 'IMPLEMENTS',
      }),
    ).toEqual([
      expect.stringContaining('Unsupported sourceType: URS'),
      expect.stringContaining('Unsupported targetType: COMPONENT'),
    ]);

    expect(
      validateTraceabilityLink({
        sourceType: 'URS_REQUIREMENT',
        sourceId: 'URS-OUT-001',
        targetType: 'PRODUCT_COMPONENT',
        targetId: 'comp-1',
        relationshipType: 'SUPERSEDES',
      }),
    ).toEqual([
      expect.stringContaining('Unsupported relationshipType: SUPERSEDES'),
    ]);

    expect(
      validateTraceabilityLink({
        sourceId: 'URS-OUT-001',
        targetId: 'comp-1',
        relationshipType: 'IMPLEMENTS',
      }),
    ).toEqual([
      'Traceability link sourceType is required',
      'Traceability link targetType is required',
    ]);
  });

  it('accepts a test execution as a link target', () => {
    expect(
      validateTraceabilityLink({
        sourceType: 'URS_REQUIREMENT_VERSION',
        sourceId: 'urs-version-1',
        targetType: 'TEST_EXECUTION',
        targetId: 'exec-1',
        relationshipType: 'VERIFIED_BY',
      }),
    ).toEqual([]);
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

  describe('product requirements (Slice 1a)', () => {
    const valid = {
      ursBaselineId: 'baseline-1',
      ursRequirementVersionId: 'rv-014',
      requirementRef: 'URS-OEE-014',
      title: 'System shall calculate OEE Availability',
      origin: 'PRODUCT',
    };

    it('accepts a requirement carrying a stable id and an origin', () => {
      expect(validateProductRequirement(valid)).toEqual([]);
    });

    it('keeps room for the other two origins without a later migration', () => {
      // PRODUCT is all that is populated today. ORGANIZATION and ARTIFACT
      // exist so the Effective Requirement Set has somewhere to grow.
      expect([...REQUIREMENT_ORIGINS]).toEqual([
        'PRODUCT',
        'ORGANIZATION',
        'ARTIFACT',
      ]);
      for (const origin of REQUIREMENT_ORIGINS) {
        expect(isRequirementOrigin(origin)).toBe(true);
        expect(validateProductRequirement({ ...valid, origin })).toEqual([]);
      }
    });

    it('rejects an origin outside the set, including case variants', () => {
      for (const origin of ['product', 'URS', 'Organization', '']) {
        expect(isRequirementOrigin(origin)).toBe(false);
        expect(validateProductRequirement({ ...valid, origin })).not.toEqual(
          [],
        );
      }
    });

    it('refuses a requirement with no stable reference, and says why', () => {
      // A requirement with no stable id cannot be mapped to a component or a
      // test, so storing it would create coverage nothing can ever satisfy.
      const issues = validateProductRequirement({
        ...valid,
        requirementRef: '   ',
      });
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatch(/cannot be mapped to a component or a test/);
    });

    it('requires the baseline, the version id and a title', () => {
      expect(
        validateProductRequirement({
          ursBaselineId: '',
          ursRequirementVersionId: '',
          requirementRef: '',
          title: '',
          origin: 'PRODUCT',
        }),
      ).toHaveLength(4);
    });

    it('does not re-judge the requirement text the URS already approved', () => {
      // Statement, category, priority and hash are absent here. They are
      // optional by design: this text was written, reviewed and signed in the
      // URS Composer, and a second opinion in front of an approved record is
      // not this function's job.
      expect(validateProductRequirement(valid)).toEqual([]);
    });
  });

  // MVP1-B (B-4a/B-4c). The verification rule lives here as a pure function
  // precisely so it can be read and checked without a database — it decides
  // whether the release gate blocks, which is too important to be reachable
  // only through four layers of setup.
  describe('test execution evidence', () => {
    const at = (iso: string) => new Date(iso);

    it('validates an ingested result', () => {
      expect(
        validateTestExecution({
          requirementVersionId: 'urs-version-1',
          testSuite: 'integration',
          testCase: 'ingests a weighing event',
          status: 'PASSED',
        }),
      ).toEqual([]);
    });

    it('refuses a status that is neither PASSED nor FAILED', () => {
      expect(
        validateTestExecution({
          requirementVersionId: 'urs-version-1',
          testSuite: 'integration',
          testCase: 'x',
          status: 'SKIPPED',
        }),
      ).toEqual([expect.stringContaining('Unsupported status: SKIPPED')]);
    });

    it('names every missing field at once rather than the first', () => {
      expect(validateTestExecution({})).toEqual([
        expect.stringContaining('requirementVersionId is required'),
        expect.stringContaining('testSuite is required'),
        expect.stringContaining('testCase is required'),
        expect.stringContaining('status is required'),
      ]);
    });

    // An artifact URL nobody else can open is not evidence. Absent is fine;
    // present and unreachable is a promise the record cannot keep.
    it.each(['artifacts/report.xml', 'file:///tmp/report.xml', 'not a url'])(
      'refuses executionArtifactUrl %s',
      url => {
        expect(
          validateTestExecution({
            requirementVersionId: 'urs-version-1',
            testSuite: 'integration',
            testCase: 'x',
            status: 'PASSED',
            executionArtifactUrl: url,
          }),
        ).toEqual([
          expect.stringContaining('absolute http(s) URL'),
        ]);
      },
    );

    it('accepts an absolute https artifact url', () => {
      expect(
        validateTestExecution({
          requirementVersionId: 'urs-version-1',
          testSuite: 'integration',
          testCase: 'x',
          status: 'PASSED',
          executionArtifactUrl: 'https://ci.example.com/runs/1/report.xml',
        }),
      ).toEqual([]);
    });

    // Optional, but an empty string is a caller that meant to supply one and
    // computed nothing. Accepting it would correlate a whole CI run on ''.
    it('refuses an empty correlationId while allowing an absent one', () => {
      const base = {
        requirementVersionId: 'urs-version-1',
        testSuite: 'integration',
        testCase: 'x',
        status: 'PASSED',
      };
      expect(validateTestExecution(base)).toEqual([]);
      expect(
        validateTestExecution({ ...base, correlationId: '   ' }),
      ).toEqual([expect.stringContaining('correlationId, when present')]);
    });

    describe('latestExecutionPerCase', () => {
      it('keeps the newest run of each case', () => {
        const rows = [
          { testSuite: 'a', testCase: '1', executedAt: at('2026-01-01T00:00:00Z'), status: 'PASSED' },
          { testSuite: 'a', testCase: '1', executedAt: at('2026-01-02T00:00:00Z'), status: 'FAILED' },
          { testSuite: 'a', testCase: '2', executedAt: at('2026-01-01T00:00:00Z'), status: 'PASSED' },
        ];
        const latest = latestExecutionPerCase(rows);
        expect(latest).toHaveLength(2);
        expect(latest.find(r => r.testCase === '1')?.status).toBe('FAILED');
        expect(latest.find(r => r.testCase === '2')?.status).toBe('PASSED');
      });

      it('does not let an older re-run resurrect a pass', () => {
        const rows = [
          { testSuite: 'a', testCase: '1', executedAt: at('2026-01-02T00:00:00Z'), status: 'FAILED' },
          { testSuite: 'a', testCase: '1', executedAt: at('2026-01-01T00:00:00Z'), status: 'PASSED' },
        ];
        expect(latestExecutionPerCase(rows)[0].status).toBe('FAILED');
      });

      // Two runs of one case at the same instant is a CI quirk. Taking the
      // one that arrived second is the closest thing to "latest" the data
      // supports, and it has to be decided rather than left to Map order.
      it('breaks a timestamp tie towards the later element', () => {
        const rows = [
          { testSuite: 'a', testCase: '1', executedAt: at('2026-01-01T00:00:00Z'), status: 'PASSED' },
          { testSuite: 'a', testCase: '1', executedAt: at('2026-01-01T00:00:00Z'), status: 'FAILED' },
        ];
        expect(latestExecutionPerCase(rows)[0].status).toBe('FAILED');
      });

      it('separates cases with the same name in different suites', () => {
        const rows = [
          { testSuite: 'unit', testCase: 'x', executedAt: at('2026-01-01T00:00:00Z'), status: 'PASSED' },
          { testSuite: 'e2e', testCase: 'x', executedAt: at('2026-01-01T00:00:00Z'), status: 'FAILED' },
        ];
        expect(latestExecutionPerCase(rows)).toHaveLength(2);
      });

      it('answers empty for no evidence', () => {
        expect(latestExecutionPerCase([])).toEqual([]);
      });
    });
  });
});

describe('versionLabelsEquivalent (NXD-133)', () => {
  it.each([
    ['1.0', '1.0.0', true],
    ['1.0.0', '1.0', true],
    ['1.2', '1.2.0', true],
    ['1.2.3', '1.2.3', true],
    ['1.0', '1.0.1', false],
    ['1.0', '1.1', false],
    ['2.0', '1.0.0', false],
    ['v1.0.0', '1.0.0', false],
    ['01.0', '1.0', false],
    ['x', 'x', false],
  ])('%p ≡ %p → %p', (a, b, expected) => {
    expect(versionLabelsEquivalent(a, b)).toBe(expected);
  });
});
