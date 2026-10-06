/**
 * Importing a version's release provenance from its GitHub Release (NXD-133).
 *
 * The release workflow publishes nexora-release.json (NXD-132); data-products
 * reads it with the commit the tag points at; Composer writes commit and
 * digest to the version's approved baseline. Pinned: the values come from the
 * release and the release is named as their recorder, the person is the
 * audit actor; NXD-052's write-once holds; a record that does not describe
 * this version — another version, another tag, a commit the tag does not
 * point at — is refused; and every "nothing to import" says why.
 */

import express from 'express';
import knex, { Knex } from 'knex';
import { AuthenticationError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort } from '@internal/backend-test-utils';
import { ComposerRepository } from './repository';
import { createRouter } from './router';
import { ComposerService } from './service';
import type {
  ReleaseRecordClient,
  ReleaseRecordLookup,
} from './release-record-client';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const author = 'user:default/demo-author';
const reviewer = 'user:default/demo-reviewer';
const importer = 'user:default/demo-pm';
const REPO = 'https://github.com/pharma-data-factory/oee.git';
const RELEASE_URL =
  'https://github.com/pharma-data-factory/oee/releases/tag/v1.0.0';
const SHA = 'a'.repeat(40);
const DIGEST = `sha256:${'b'.repeat(64)}`;

function lookup(
  overrides: Record<string, unknown> = {},
  commit = SHA,
): ReleaseRecordLookup {
  return {
    available: true,
    release: { tag: 'v1.0.0', url: RELEASE_URL, commit },
    record: {
      apiVersion: 'nexora.dev/v1alpha1',
      kind: 'ReleaseRecord',
      version: '1.0.0',
      tag: 'v1.0.0',
      commitSha: SHA,
      image: {
        repository: 'ghcr.io/pharma-data-factory/oee',
        digest: DIGEST,
        reference: `ghcr.io/pharma-data-factory/oee@${DIGEST}`,
      },
      ...overrides,
    },
  };
}

describe('importReleaseProvenance (NXD-133)', () => {
  let db: Knex;
  let service: ComposerService;
  let versionId: string;
  const client: ReleaseRecordClient & { getReleaseRecord: jest.Mock } = {
    getReleaseRecord: jest.fn(),
  };

  async function approvedBaseline() {
    const baseline = await service.createProductBaseline(versionId, {}, author);
    return service.approveProductBaseline(baseline.id, reviewer);
  }

  beforeEach(async () => {
    client.getReleaseRecord.mockReset();
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({
      logger: mockLogger,
      repository,
      releaseRecordClient: client,
    });
    const product = await service.createProduct(
      {
        name: 'oee-line-3',
        productType: 'DATA_PRODUCT',
        repositoryUrl: REPO,
      } as any,
      author,
    );
    // Composer names it 1.0; the workflow tags v1.0.0. Equivalent (R3).
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      author,
    );
    versionId = version.id;
  });

  afterEach(async () => {
    await db?.destroy();
  });

  it('writes commit and digest to the approved baseline, the release as recorder', async () => {
    const baseline = await approvedBaseline();
    client.getReleaseRecord.mockResolvedValue(lookup());

    const result = await service.importReleaseProvenance(versionId, importer);

    expect(client.getReleaseRecord).toHaveBeenCalledWith(REPO, '1.0');
    expect(result).toMatchObject({
      release: { tag: 'v1.0.0', url: RELEASE_URL, commit: SHA },
      image: { digest: DIGEST, repository: 'ghcr.io/pharma-data-factory/oee' },
      alreadyRecorded: false,
    });
    expect(result.baseline.id).toBe(baseline.id);
    expect(result.baseline.provenance).toMatchObject({
      releaseCommitSha: SHA,
      artifactDigest: DIGEST,
      provenanceRecordedBy: `github-release:${RELEASE_URL}`,
    });

    const events = await service.getEntityAuditTrail(
      'PRODUCT_BASELINE',
      baseline.id,
    );
    const recorded = events.find(e => e.eventType === 'PROVENANCE_RECORDED');
    expect(recorded?.actor).toBe(importer);
    expect(recorded?.reason).toBe(`Imported from ${RELEASE_URL}`);
  });

  it('records the same build once, and says so the second time', async () => {
    const baseline = await approvedBaseline();
    client.getReleaseRecord.mockResolvedValue(lookup());
    const first = await service.importReleaseProvenance(versionId, importer);
    const second = await service.importReleaseProvenance(versionId, importer);
    expect(second.alreadyRecorded).toBe(true);
    expect(second.baseline.provenance?.provenanceTimestamp).toBe(
      first.baseline.provenance?.provenanceTimestamp,
    );
    const events = await service.getEntityAuditTrail(
      'PRODUCT_BASELINE',
      baseline.id,
    );
    expect(
      events.filter(e => e.eventType === 'PROVENANCE_RECORDED'),
    ).toHaveLength(1);
  });

  it('refuses a different build on a baseline that already has one (NXD-052)', async () => {
    const baseline = await approvedBaseline();
    await service.recordBaselineProvenance(
      baseline.id,
      { releaseCommitSha: 'c'.repeat(40), artifactDigest: DIGEST },
      'release-pipeline',
    );
    client.getReleaseRecord.mockResolvedValue(lookup());
    await expect(
      service.importReleaseProvenance(versionId, importer),
    ).rejects.toThrow(/write-once/);
  });

  it('needs an approved baseline to record against', async () => {
    await service.createProductBaseline(versionId, {}, author);
    await expect(
      service.importReleaseProvenance(versionId, importer),
    ).rejects.toThrow(/has no approved baseline/);
    expect(client.getReleaseRecord).not.toHaveBeenCalled();
  });

  it.each([
    [{ available: false, reason: 'no-release' }, /no published release v1\.0/],
    [
      {
        available: false,
        reason: 'ambiguous-release',
        tags: ['v1.0', 'v1.0.0'],
      },
      /v1\.0, v1\.0\.0/,
    ],
    [
      {
        available: false,
        reason: 'no-release-record',
        release: { tag: 'v1.0.0', url: RELEASE_URL },
      },
      /v1\.0\.0 carries no nexora-release\.json/,
    ],
    [
      { available: false, reason: 'inaccessible' },
      /cannot read the repository/,
    ],
  ])('says why there is nothing to import: %j', async (answer, message) => {
    await approvedBaseline();
    client.getReleaseRecord.mockResolvedValue(answer);
    await expect(
      service.importReleaseProvenance(versionId, importer),
    ).rejects.toThrow(message);
  });

  it.each([
    [
      'another version',
      lookup({ version: '2.0.0' }),
      /for version 2\.0\.0, not 1\.0/,
    ],
    ['another tag', lookup({ tag: 'v9.9.9' }), /names tag v9\.9\.9/],
    [
      'a commit the tag does not point at',
      lookup({}, 'd'.repeat(40)),
      /points at d{40}/,
    ],
  ])(
    'refuses a record for %s, and writes nothing',
    async (_label, answer, message) => {
      const baseline = await approvedBaseline();
      client.getReleaseRecord.mockResolvedValue(answer);
      await expect(
        service.importReleaseProvenance(versionId, importer),
      ).rejects.toThrow(message);
      const events = await service.getEntityAuditTrail(
        'PRODUCT_BASELINE',
        baseline.id,
      );
      expect(events.some(e => e.eventType === 'PROVENANCE_RECORDED')).toBe(
        false,
      );
    },
  );

  it('refuses a digest NXD-052 would refuse', async () => {
    await approvedBaseline();
    client.getReleaseRecord.mockResolvedValue(
      lookup({ image: { digest: 'sha256:short' } }),
    );
    await expect(
      service.importReleaseProvenance(versionId, importer),
    ).rejects.toThrow(/artifactDigest/);
  });

  it('says so when the instance has no release reader', async () => {
    const repository = await ComposerRepository.create({ getClient: () => db });
    const bare = new ComposerService({ logger: mockLogger, repository });
    await expect(
      bare.importReleaseProvenance(versionId, importer),
    ).rejects.toThrow(/not configured/);
  });
});

describe('POST /versions/:id/release-provenance/import (NXD-133)', () => {
  let db: Knex;
  let versionId: string;
  let principal: 'user' | 'service';
  let decision: AuthorizeResult;
  let app: express.Express;
  const client = { getReleaseRecord: jest.fn(async () => lookup()) };

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    const repository = await ComposerRepository.create({ getClient: () => db });
    const service = new ComposerService({
      logger: mockLogger,
      repository,
      releaseRecordClient: client,
    });
    const product = await service.createProduct(
      {
        name: 'oee-line-4',
        productType: 'DATA_PRODUCT',
        repositoryUrl: REPO,
      } as any,
      author,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      author,
    );
    versionId = version.id;
    const baseline = await service.createProductBaseline(versionId, {}, author);
    await service.approveProductBaseline(baseline.id, reviewer);

    principal = 'user';
    decision = AuthorizeResult.ALLOW;
    const httpAuth = {
      credentials: jest.fn(
        async (_req: unknown, opts?: { allow?: string[] }) => {
          if (!(opts?.allow ?? []).includes(principal)) {
            throw new AuthenticationError(
              `No ${(opts?.allow ?? []).join(' or ')} credentials presented`,
            );
          }
          return principal === 'service'
            ? { principal: { subject: 'release-pipeline' } }
            : { principal: { userEntityRef: importer } };
        },
      ),
    };
    const router = await createRouter({
      logger: mockLogger,
      httpAuth: httpAuth as never,
      permissions: { authorize: async () => [{ result: decision }] } as never,
      service,
      llmEnabled: false,
    } as never);
    app = express();
    app.use(router);
  });

  afterEach(async () => {
    await db?.destroy();
  });

  async function post() {
    const server = await listenOnFetchablePort(app);
    try {
      const response = await fetch(
        `${server.url}/versions/${versionId}/release-provenance/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        },
      );
      return { status: response.status, body: await response.json() };
    } finally {
      await server.close();
    }
  }

  it('lets a person with product.manage import, and answers what was recorded', async () => {
    const response = await post();
    expect(response.status).toBe(200);
    expect(response.body.baseline.provenance).toMatchObject({
      releaseCommitSha: SHA,
      artifactDigest: DIGEST,
      provenanceRecordedBy: `github-release:${RELEASE_URL}`,
    });
  });

  it('refuses a person without product.manage', async () => {
    decision = AuthorizeResult.DENY;
    expect((await post()).status).toBe(403);
  });

  it('is not a door for services, which have /baselines/:id/provenance', async () => {
    principal = 'service';
    expect((await post()).status).toBe(401);
  });
});

describe('importReleaseProvenance registers the build (NXD-137)', () => {
  let db: Knex;
  let service: ComposerService;
  let repository: ComposerRepository;
  let versionId: string;
  const MANIFEST = 'apiVersion: nexora.dev/v1alpha1\nkind: DATA_PRODUCT\n';
  const REF = 'pharma-data-factory/oee-e2e-test-20261005-d@1.0.0';
  const client = {
    getReleaseRecord: jest.fn(async () => ({
      ...lookup(),
      manifest: MANIFEST,
    })),
  };

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({
      logger: mockLogger,
      repository,
      releaseRecordClient: client,
    });
    const product = await service.createProduct(
      {
        name: 'oee-line-5',
        productType: 'DATA_PRODUCT',
        repositoryUrl: REPO,
      } as any,
      author,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      author,
    );
    versionId = version.id;
    const baseline = await service.createProductBaseline(versionId, {}, author);
    await service.approveProductBaseline(baseline.id, reviewer);
  });

  afterEach(async () => {
    await db?.destroy();
  });

  const registered = (alreadyRegistered = false) =>
    jest.fn(async () => ({
      artifactRef: REF,
      artifactVersionId: 'av-1',
      lifecycle: 'DRAFT',
      alreadyRegistered,
    }));

  it('hands the manifest and the build to the registry, and remembers the version', async () => {
    const register = registered();
    const result = await service.importReleaseProvenance(
      versionId,
      importer,
      register,
    );

    expect(register).toHaveBeenCalledWith({
      manifest: MANIFEST,
      release: {
        imageRepository: 'ghcr.io/pharma-data-factory/oee',
        imageDigest: DIGEST,
        commitSha: SHA,
        releaseUrl: RELEASE_URL,
      },
    });
    expect(result.registration).toEqual({
      status: 'registered',
      artifactRef: REF,
      artifactVersionId: 'av-1',
      lifecycle: 'DRAFT',
    });
    expect((await repository.getProductVersion(versionId))?.artifactRef).toBe(
      REF,
    );
    const events = await service.getEntityAuditTrail(
      'PRODUCT_VERSION',
      versionId,
    );
    const event = events.find(
      e => e.eventType === 'ARTIFACT_VERSION_REGISTERED',
    );
    expect(event).toMatchObject({ actor: importer, newValue: REF });
  });

  it('says already registered on a re-import, and audits the link once', async () => {
    await service.importReleaseProvenance(versionId, importer, registered());
    const again = await service.importReleaseProvenance(
      versionId,
      importer,
      registered(true),
    );
    expect(again.registration.status).toBe('already-registered');
    const events = await service.getEntityAuditTrail(
      'PRODUCT_VERSION',
      versionId,
    );
    expect(
      events.filter(e => e.eventType === 'ARTIFACT_VERSION_REGISTERED'),
    ).toHaveLength(1);
  });

  it('keeps the provenance when the registry refuses, and says why', async () => {
    const register = jest.fn(async () => {
      throw new Error(
        'No publisher owns namespace "pharma-data-factory". Register the publisher first.',
      );
    });
    const result = await service.importReleaseProvenance(
      versionId,
      importer,
      register,
    );
    expect(result.baseline.provenance?.artifactDigest).toBe(DIGEST);
    expect(result.registration).toEqual({
      status: 'failed',
      reason:
        'The Artifact Registry refused the build: No publisher owns namespace "pharma-data-factory". Register the publisher first.',
    });
    expect(
      (await repository.getProductVersion(versionId))?.artifactRef,
    ).toBeUndefined();
  });

  it('does not register without the manifest of the tagged commit', async () => {
    client.getReleaseRecord.mockResolvedValueOnce({
      ...lookup(),
      manifestReason: 'no-manifest',
    } as any);
    const register = registered();
    const result = await service.importReleaseProvenance(
      versionId,
      importer,
      register,
    );
    expect(register).not.toHaveBeenCalled();
    expect(result.registration).toEqual({
      status: 'skipped',
      reason: 'Not registered: the tagged commit has no nexora.yaml.',
    });
  });

  it('records provenance only when no registrar is configured', async () => {
    const result = await service.importReleaseProvenance(versionId, importer);
    expect(result.registration.status).toBe('skipped');
    expect(result.baseline.provenance?.artifactDigest).toBe(DIGEST);
  });
});
