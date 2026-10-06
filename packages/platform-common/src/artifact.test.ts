import {
  ARTIFACT_KINDS,
  ARTIFACT_LIFECYCLE_STATES,
  ARTIFACT_MANIFEST_API_VERSION,
  artifactCoordinateOf,
  formatArtifactRef,
  isArtifactKind,
  isArtifactLifecycle,
  isArtifactManifest,
  isArtifactSegment,
  parseArtifactRef,
  validateArtifactManifest,
  type ArtifactManifest,
  isRunnableArtifactVersion,
  validateArtifactReleaseBuild,
} from './artifact';
import {
  DISTRIBUTION_CHANNELS,
  GOLDEN_PATH_LIFECYCLE_STATES,
} from './releases';

function manifest(overrides: Record<string, unknown> = {}): unknown {
  return {
    apiVersion: ARTIFACT_MANIFEST_API_VERSION,
    kind: 'CONNECTOR',
    metadata: {
      namespace: 'acme',
      name: 'sap-odata',
      version: '1.2.0',
    },
    ...overrides,
  };
}

describe('artifact kinds', () => {
  it('covers the families the strategy names', () => {
    expect([...ARTIFACT_KINDS]).toEqual([
      'COMPONENT',
      'CONNECTOR',
      'TEMPLATE',
      'GOLDEN_PATH',
      'DATA_PRODUCT',
      'POLICY_PACK',
      'VALIDATION_PACK',
    ]);
    expect(isArtifactKind('GOLDEN_PATH')).toBe(true);
    expect(isArtifactKind('golden_path')).toBe(false);
    expect(isArtifactKind('SAP')).toBe(false);
  });
});

describe('artifact lifecycle', () => {
  it('reuses the Golden Path states rather than declaring a parallel set', () => {
    // If these ever diverge it should be a deliberate decision, not a drift.
    expect([...ARTIFACT_LIFECYCLE_STATES]).toEqual([
      ...GOLDEN_PATH_LIFECYCLE_STATES,
    ]);
    expect(isArtifactLifecycle('CERTIFIED')).toBe(true);
    expect(isArtifactLifecycle('PUBLISHED')).toBe(false);
  });
});

describe('artifact identity', () => {
  it.each(['acme', 'a', 'sap-odata', 'x1', 'a-b-c', '0'])(
    'accepts segment %s',
    segment => expect(isArtifactSegment(segment)).toBe(true),
  );

  it.each([
    '',
    'Acme',
    'acme ',
    ' acme',
    'sap_odata',
    '-acme',
    'acme-',
    'sap--odata',
    'acme/x',
    'acme@1',
  ])('rejects segment %p', segment =>
    expect(isArtifactSegment(segment)).toBe(false),
  );

  it('rejects a segment longer than the limit', () => {
    expect(isArtifactSegment('a'.repeat(64))).toBe(true);
    expect(isArtifactSegment('a'.repeat(65))).toBe(false);
  });

  it('round-trips a coordinate through its ref', () => {
    const coordinate = { namespace: 'acme', name: 'sap-odata', version: '1.2.0' };
    const ref = formatArtifactRef(coordinate);
    expect(ref).toBe('acme/sap-odata@1.2.0');
    expect(parseArtifactRef(ref)).toEqual(coordinate);
  });

  it.each([
    'acme/sap-odata',
    'acme@1.0',
    'sap-odata@1.0',
    'Acme/sap-odata@1.0',
    'acme/sap-odata@latest',
    'acme/sap-odata@01.0',
    'acme//sap@1.0',
    '',
  ])('returns nothing for the malformed ref %p', ref =>
    expect(parseArtifactRef(ref)).toBeUndefined(),
  );
});

describe('artifact manifest', () => {
  it('accepts a minimal valid manifest', () => {
    expect(validateArtifactManifest(manifest())).toEqual([]);
    expect(isArtifactManifest(manifest())).toBe(true);
  });

  it('reports the declared coordinate', () => {
    expect(artifactCoordinateOf(manifest() as ArtifactManifest)).toEqual({
      namespace: 'acme',
      name: 'sap-odata',
      version: '1.2.0',
    });
  });

  it('rejects a non-mapping outright', () => {
    for (const input of [null, undefined, 'a string', 42, ['a', 'list']]) {
      expect(validateArtifactManifest(input)).toEqual([
        'Manifest must be a YAML mapping',
      ]);
    }
  });

  it('requires the supported apiVersion', () => {
    expect(
      validateArtifactManifest(manifest({ apiVersion: 'nexora.dev/v1' })),
    ).toContainEqual(expect.stringContaining('Unsupported apiVersion'));
  });

  it('requires a supported kind', () => {
    // A domain capability is an Artifact, never a new kind in Core.
    expect(
      validateArtifactManifest(manifest({ kind: 'SAP_CONNECTOR' })),
    ).toContainEqual(expect.stringContaining('Unsupported kind'));
  });

  it('reports every problem at once rather than the first', () => {
    const issues = validateArtifactManifest({
      apiVersion: 'wrong',
      kind: 'NOPE',
      metadata: { namespace: 'Acme', name: '', version: 'latest' },
    });
    // A publisher fixing a manifest should see the whole list in one pass.
    expect(issues.length).toBeGreaterThanOrEqual(4);
    expect(issues.some(i => i.includes('apiVersion'))).toBe(true);
    expect(issues.some(i => i.includes('kind'))).toBe(true);
    expect(issues.some(i => i.includes('metadata.namespace'))).toBe(true);
    expect(issues.some(i => i.includes('metadata.name'))).toBe(true);
    expect(issues.some(i => i.includes('metadata.version'))).toBe(true);
  });

  it('requires metadata', () => {
    expect(validateArtifactManifest({
      apiVersion: ARTIFACT_MANIFEST_API_VERSION,
      kind: 'COMPONENT',
    })).toEqual(['metadata is required']);
  });

  it('validates the version with the shared grammar', () => {
    for (const version of ['latest', '1', '01.0', '1.0-rc1', '']) {
      expect(
        validateArtifactManifest(
          manifest({ metadata: { namespace: 'a', name: 'b', version } }),
        ),
      ).toContainEqual(expect.stringContaining('metadata.version'));
    }
  });

  it('requires dependencies to pin an exact version', () => {
    // A range would make the set of Artifacts a Product was built from depend
    // on when it was resolved, which a validated Product cannot rest on.
    const issues = validateArtifactManifest(
      manifest({
        spec: { dependencies: ['acme/base@^1.0', 'acme/other@1.0'] },
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('acme/base@^1.0');
  });

  it('accepts exact dependencies', () => {
    expect(
      validateArtifactManifest(
        manifest({ spec: { dependencies: ['acme/base@1.0', 'acme/x@2.1.3'] } }),
      ),
    ).toEqual([]);
  });

  it('rejects malformed list fields', () => {
    expect(
      validateArtifactManifest(
        manifest({ metadata: { namespace: 'a', name: 'b', version: '1.0', tags: 'one' } }),
      ),
    ).toContainEqual('metadata.tags must be a list of strings');
    expect(
      validateArtifactManifest(manifest({ spec: { dependencies: 'acme/x@1.0' } })),
    ).toContainEqual('spec.dependencies must be a list of strings');
    expect(validateArtifactManifest(manifest({ spec: 'nope' }))).toContainEqual(
      'spec must be a mapping',
    );
  });

  it('allows spec fields it does not know about', () => {
    // Kind-specific configuration lives in the manifest, not in Core. Core
    // must not need a change for a connector to declare something new.
    expect(
      validateArtifactManifest(
        manifest({ spec: { brokerUrl: 'tcp://x', qos: 2, nested: { a: 1 } } }),
      ),
    ).toEqual([]);
  });

  // NXD-075. `spec.distribution` feeds `ArtifactVersion.distribution`, which is
  // typed to the closed DistributionChannel vocabulary. Checking only the shape
  // let `distribution: [life-sciences]` — a value from the *edition* axis — be
  // cast through and stored. Nobody noticed because nothing reads the persisted
  // field: every consumer of `.distribution` reads it off `GoldenPathRelease`,
  // a different object.
  describe('spec.distribution is a closed vocabulary', () => {
    it('accepts every declared channel', () => {
      expect(
        validateArtifactManifest(
          manifest({ spec: { distribution: [...DISTRIBUTION_CHANNELS] } }),
        ),
      ).toEqual([]);
    });

    it('refuses a value from the edition axis, and says where it belongs', () => {
      const issues = validateArtifactManifest(
        manifest({ spec: { distribution: ['life-sciences'] } }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatch(/"life-sciences" is not a distribution channel/);
      expect(issues[0]).toMatch(/catalog\/editions\.yaml/);
    });

    it('still refuses a non-list', () => {
      expect(
        validateArtifactManifest(manifest({ spec: { distribution: 'INTERNAL' } })),
      ).toEqual(['spec.distribution must be a list of strings']);
    });

    it('names every offending entry, not just the first', () => {
      const issues = validateArtifactManifest(
        manifest({ spec: { distribution: ['INTERNAL', 'nope', 'also-nope'] } }),
      );
      expect(issues).toHaveLength(2);
    });
  });
});

describe('release builds (NXD-137)', () => {
  const runnable = {
    apiVersion: 'nexora.dev/v1alpha1',
    kind: 'DATA_PRODUCT',
    metadata: { namespace: 'acme', name: 'oee', version: '1.0.0' },
    spec: {
      runtime: { kind: 'container', image: { repository: 'ghcr.io/acme/oee' } },
    },
  } as any;
  const build = {
    imageRepository: 'ghcr.io/acme/oee',
    imageDigest: `sha256:${'a'.repeat(64)}`,
    commitSha: 'b'.repeat(40),
    releaseUrl: 'https://github.com/acme/oee/releases/tag/v1.0.0',
  };

  it('accepts the build of the image the manifest runs', () => {
    expect(validateArtifactReleaseBuild(build, runnable)).toEqual([]);
  });

  it('refuses another image, a malformed digest or commit, and a non-https release', () => {
    const issues = validateArtifactReleaseBuild(
      {
        imageRepository: 'ghcr.io/acme/other',
        imageDigest: 'sha256:short',
        commitSha: 'abc123',
        releaseUrl: 'http://x',
      },
      runnable,
    );
    expect(issues.join('\n')).toMatch(/is not the manifest's spec\.runtime\.image\.repository/);
    expect(issues.join('\n')).toMatch(/release build imageDigest/);
    expect(issues.join('\n')).toMatch(/release build commitSha/);
    expect(issues.join('\n')).toMatch(/not an https URL/);
  });

  it('refuses a build for something that does not run', () => {
    const template = { ...runnable, kind: 'TEMPLATE', spec: {} };
    expect(validateArtifactReleaseBuild(build, template).join('\n')).toMatch(
      /a TEMPLATE has no release build/,
    );
  });

  it('calls a version runnable by its manifest, not its kind', () => {
    expect(isRunnableArtifactVersion({ manifest: runnable })).toBe(true);
    expect(
      isRunnableArtifactVersion({ manifest: { ...runnable, spec: { sourceRef: 'x' } } }),
    ).toBe(false);
    expect(isRunnableArtifactVersion({})).toBe(false);
  });
});
