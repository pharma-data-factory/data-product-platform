/**
 * Database-level GxP invariants, verified against real PostgreSQL.
 *
 * The application layer refuses these operations too, but that is not what is
 * under test here. Every write below goes straight to the table, bypassing the
 * repository, to show that the guarantee survives a caller that does not ask
 * nicely.
 *
 * Requires the test database; see p1a-verification.test.ts for the connection
 * defaults.
 */

import { Knex } from 'knex';
import { PostgresURSRepository } from './postgres-repository';
import { IURSRepository } from './repository-interface';
import {
  AuditEvent,
  ChangeRequestStatus,
  ReviewScope,
  RequirementPriority,
  RequirementVersion,
  SignatureMeaning,
  SignatureTargetType,
  URSStatus,
} from './types';

let testDb: Knex | null = null;

function getTestDatabase(): Knex {
  if (!testDb) {
    const knex = require('knex');
    testDb = knex({
      client: 'pg',
      connection: {
        host: process.env.TEST_DB_HOST || '127.0.0.1',
        port: parseInt(process.env.TEST_DB_PORT || '5435', 10),
        user: process.env.TEST_DB_USER || 'urs_test',
        password: process.env.TEST_DB_PASSWORD || 'test_pass123',
        database: process.env.TEST_DB_NAME || 'urs_composer_test',
      },
    });
  }
  return testDb!;
}

/** Each test uses its own requirement id so the single-open-version index does not couple them. */
let counter = 0;
function nextRequirementId(): string {
  counter += 1;
  return `INV-REQ-${counter}`;
}

function aVersion(
  requirementId: string,
  overrides: Partial<RequirementVersion> = {},
): RequirementVersion {
  return {
    id: `${requirementId}-${overrides.version ?? '0.1'}`,
    requirementId,
    version: '0.1',
    versionLabel: '0.1',
    major: 0,
    minor: 1,
    versionNumber: 1,
    title: 'Original title',
    statement: 'The system shall do the thing.',
    priority: RequirementPriority.MUST,
    status: URSStatus.DRAFT,
    createdBy: 'author',
    createdAt: new Date(),
    revision: 1,
    ...overrides,
  };
}

describe('GxP invariants enforced by the database', () => {
  let db: Knex;
  let repo: IURSRepository;

  beforeAll(async () => {
    db = getTestDatabase();
    await require('./db/migrations').up(db);
  });

  afterAll(async () => {
    try {
      await require('./db/migrations').down(db);
    } catch {
      // Tables may already be gone.
    }
    if (testDb) {
      await testDb.destroy();
      testDb = null;
    }
  });

  beforeEach(() => {
    repo = new PostgresURSRepository(db);
  });

  describe('Invariant 15: one open version per requirement', () => {
    test('a second open version is rejected', async () => {
      const requirementId = nextRequirementId();
      await repo.createRequirementVersion(aVersion(requirementId));

      await expect(
        repo.createRequirementVersion(
          aVersion(requirementId, {
            id: `${requirementId}-second`,
            version: '0.2',
            status: URSStatus.IN_REVIEW,
          }),
        ),
      ).rejects.toThrow();
    });

    test('a new version is allowed once the previous one is closed', async () => {
      const requirementId = nextRequirementId();
      await repo.createRequirementVersion(
        aVersion(requirementId, { status: URSStatus.REJECTED }),
      );

      await expect(
        repo.createRequirementVersion(
          aVersion(requirementId, {
            id: `${requirementId}-next`,
            version: '0.2',
          }),
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('Invariant 1: content freeze', () => {
    test('a draft may still be edited', async () => {
      const requirementId = nextRequirementId();
      const version = aVersion(requirementId);
      await repo.createRequirementVersion(version);

      await expect(
        db('requirement_versions')
          .where({ id: version.id })
          .update({ title: 'Edited while still a draft' }),
      ).resolves.toBe(1);
    });

    test('content cannot be changed once the version is in review', async () => {
      const requirementId = nextRequirementId();
      const version = aVersion(requirementId, { status: URSStatus.IN_REVIEW });
      await repo.createRequirementVersion(version);

      await expect(
        db('requirement_versions')
          .where({ id: version.id })
          .update({ statement: 'Silently rewritten' }),
      ).rejects.toThrow(/URS_IMMUTABLE/);
    });

    test('a released version may only change its status', async () => {
      const requirementId = nextRequirementId();
      const version = aVersion(requirementId, {
        status: URSStatus.APPROVED,
        approvedBy: 'qa',
        approvedAt: new Date(),
      });
      await repo.createRequirementVersion(version);

      await expect(
        db('requirement_versions')
          .where({ id: version.id })
          .update({ approved_by: 'someone-else' }),
      ).rejects.toThrow(/URS_IMMUTABLE/);

      await expect(
        db('requirement_versions')
          .where({ id: version.id })
          .update({ status: URSStatus.SUPERSEDED }),
      ).resolves.toBe(1);
    });

    test('a reviewed version cannot be deleted, an abandoned draft can', async () => {
      const reviewed = aVersion(nextRequirementId(), {
        status: URSStatus.IN_REVIEW,
      });
      await repo.createRequirementVersion(reviewed);
      await expect(
        db('requirement_versions').where({ id: reviewed.id }).del(),
      ).rejects.toThrow(/URS_IMMUTABLE/);

      const draft = aVersion(nextRequirementId());
      await repo.createRequirementVersion(draft);
      await expect(
        db('requirement_versions').where({ id: draft.id }).del(),
      ).resolves.toBe(1);
    });
  });

  describe('Invariant 2: the audit trail is append-only', () => {
    const event: AuditEvent = {
      id: 'audit-append-only',
      entityType: 'REQUIREMENT_VERSION',
      entityId: 'whatever',
      eventType: 'CREATED',
      actor: 'author',
      timestamp: new Date(),
    };

    test('an event cannot be rewritten', async () => {
      await repo.createAuditEvent(event);

      await expect(
        db('audit_events').where({ id: event.id }).update({ actor: 'nobody' }),
      ).rejects.toThrow(/URS_APPEND_ONLY/);
    });

    test('an event cannot be deleted', async () => {
      await expect(
        db('audit_events').where({ id: event.id }).del(),
      ).rejects.toThrow(/URS_APPEND_ONLY/);
    });
  });

  describe('Signatures are a permanent record', () => {
    const signature = {
      id: 'sig-append-only',
      targetType: SignatureTargetType.REQUIREMENT_VERSION,
      targetId: 'some-version',
      meaning: SignatureMeaning.REVIEWED,
      signedBy: 'user:default/reviewer',
      signedAt: new Date(),
      contentHashAtSigning: 'b'.repeat(64),
    };

    test('a signature cannot be rewritten or withdrawn', async () => {
      await repo.createSignature(signature);

      await expect(
        db('signatures')
          .where({ id: signature.id })
          .update({ signed_by: 'user:default/someone-else' }),
      ).rejects.toThrow(/URS_APPEND_ONLY/);

      await expect(
        db('signatures').where({ id: signature.id }).del(),
      ).rejects.toThrow(/URS_APPEND_ONLY/);
    });

    test('the same user cannot sign the same record twice with one meaning', async () => {
      await expect(
        repo.createSignature({ ...signature, id: 'sig-duplicate' }),
      ).rejects.toThrow();
    });

    test('a different meaning by the same user is allowed', async () => {
      await expect(
        repo.createSignature({
          ...signature,
          id: 'sig-other-meaning',
          meaning: SignatureMeaning.AUTHORED,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('Baseline contents are a snapshot', () => {
    async function aBaseline(id: string, status: URSStatus) {
      await db('requirement_sets')
        .insert({
          id: `set-${id}`,
          requirement_set_id: `URS-${id}`.slice(0, 20),
          version_number: 1,
          business_capability_refs: '[]',
          business_need: 'Baseline snapshot',
          solution_type: 'PROJECT',
          solution_name: 'Snapshot',
          gxp_relevance: 'NONE',
          status: 'DRAFT',
          created_by: 'user:default/author',
          created_at: new Date(),
        })
        .onConflict('id')
        .ignore();

      await repo.createBaseline({
        id,
        requirementSetId: `set-${id}`,
        baselineVersion: '1.0',
        status,
        requirementVersionIds: [],
        items: [
          {
            requirementVersionId: 'ver-pinned',
            reviewScope: ReviewScope.ADDED,
            position: 0,
          },
        ],
        createdBy: 'user:default/author',
        createdAt: new Date(),
        revision: 1,
      });
    }

    test('a draft baseline may still be assembled', async () => {
      await aBaseline('bl-draft', URSStatus.DRAFT);

      await expect(
        db('baseline_items').insert({
          baseline_id: 'bl-draft',
          requirement_version_id: 'ver-second',
          review_scope: 'ADDED',
          position: 1,
        }),
      ).resolves.toBeDefined();
    });

    test('a released baseline cannot gain, lose or change items', async () => {
      await aBaseline('bl-released', URSStatus.DRAFT);
      await db('baselines')
        .where({ id: 'bl-released' })
        .update({ status: URSStatus.APPROVED });

      await expect(
        db('baseline_items').insert({
          baseline_id: 'bl-released',
          requirement_version_id: 'ver-extra',
          review_scope: 'ADDED',
          position: 1,
        }),
      ).rejects.toThrow(/URS_IMMUTABLE/);

      await expect(
        db('baseline_items')
          .where({ baseline_id: 'bl-released' })
          .update({ review_scope: 'UNCHANGED' }),
      ).rejects.toThrow(/URS_IMMUTABLE/);

      await expect(
        db('baseline_items').where({ baseline_id: 'bl-released' }).del(),
      ).rejects.toThrow(/URS_IMMUTABLE/);
    });

    test('items round-trip through the repository, not the legacy column', async () => {
      await aBaseline('bl-roundtrip', URSStatus.DRAFT);

      const loaded = await repo.getBaseline('bl-roundtrip');
      expect(loaded!.items).toEqual([
        {
          requirementVersionId: 'ver-pinned',
          reviewScope: ReviewScope.ADDED,
          position: 0,
        },
      ]);
      expect(loaded!.requirementVersionIds).toEqual(['ver-pinned']);
    });

    test('the deprecated JSON column is kept in step for older readers', async () => {
      await aBaseline('bl-legacy', URSStatus.DRAFT);

      const row = await db('baselines').where({ id: 'bl-legacy' }).first();
      expect(JSON.parse(row.requirement_version_ids)).toEqual(['ver-pinned']);
    });
  });

  describe('Change control is a permanent record', () => {
    async function aRequest(id: string, status = ChangeRequestStatus.DRAFT) {
      const request = {
        id,
        title: 'Raise sampling rate',
        description: 'Record every 30 seconds.',
        reason: 'Regulator asked for finer granularity.',
        affectedRequirementIds: ['URS-X-001'],
        status,
        requestedBy: 'user:default/requester',
        requestedAt: new Date(),
        revision: 1,
      };
      await repo.createChangeRequest(request);
      return request;
    }

    test('a decided request cannot be changed', async () => {
      const request = await aRequest('CR-9999-0001', ChangeRequestStatus.APPROVED);

      await expect(
        db('change_requests').where({ id: request.id }).update({ reason: 'Rewritten' }),
      ).rejects.toThrow(/URS_IMMUTABLE/);
    });

    test('the origin of an open request cannot be changed', async () => {
      const request = await aRequest('CR-9999-0002');

      await expect(
        db('change_requests')
          .where({ id: request.id })
          .update({ requested_by: 'user:default/someone-else' }),
      ).rejects.toThrow(/URS_IMMUTABLE/);

      // The parts that are still open may still move.
      await expect(
        db('change_requests')
          .where({ id: request.id })
          .update({ status: ChangeRequestStatus.ASSESSED }),
      ).resolves.toBe(1);
    });

    test('an impact assessment cannot be rewritten or deleted', async () => {
      const request = await aRequest('CR-9999-0003');
      await repo.createImpactAssessment({
        id: 'ia-001',
        changeRequestId: request.id,
        summary: 'Touches the sampling loop.',
        gxpImpact: true,
        validationImpact: 'Re-execute the sampling test.',
        affectedVersionIds: [],
        assessedBy: 'user:default/assessor',
        assessedAt: new Date(),
      });

      await expect(
        db('impact_assessments').where({ id: 'ia-001' }).update({ summary: 'No impact' }),
      ).rejects.toThrow(/URS_APPEND_ONLY/);

      await expect(
        db('impact_assessments').where({ id: 'ia-001' }).del(),
      ).rejects.toThrow(/URS_APPEND_ONLY/);
    });

    test('a request is assessed at most once', async () => {
      const request = await aRequest('CR-9999-0004');
      const assessment = {
        id: 'ia-002',
        changeRequestId: request.id,
        summary: 'First assessment.',
        gxpImpact: false,
        validationImpact: 'None.',
        affectedVersionIds: [],
        assessedBy: 'user:default/assessor',
        assessedAt: new Date(),
      };
      await repo.createImpactAssessment(assessment);

      await expect(
        repo.createImpactAssessment({ ...assessment, id: 'ia-003' }),
      ).rejects.toThrow();
    });
  });

  describe('Status changes through the repository', () => {
    test('an illegal jump is refused', async () => {
      const requirementId = nextRequirementId();
      const version = aVersion(requirementId);
      await repo.createRequirementVersion(version);

      await expect(
        repo.updateRequirementVersion({
          ...version,
          status: URSStatus.APPROVED,
        }),
      ).rejects.toThrow(/cannot move from DRAFT to APPROVED/);
    });

    test('approval stamps the approver and the release date', async () => {
      const requirementId = nextRequirementId();
      const version = aVersion(requirementId, {
        status: URSStatus.IN_APPROVAL,
      });
      await repo.createRequirementVersion(version);

      const approvedAt = new Date();
      await repo.updateRequirementVersion({
        ...version,
        status: URSStatus.APPROVED,
        approvedBy: 'qa',
        approvedAt,
      });

      const stored = await repo.getRequirementVersion(version.id);
      expect(stored).toMatchObject({
        status: URSStatus.APPROVED,
        approvedBy: 'qa',
      });
      expect(stored!.releasedAt).toBeInstanceOf(Date);
    });

    // Superseding an approved version used to be impossible: the repository
    // rejected every write to an approved row, so approving a second version
    // rolled the whole approval back.
    test('an approved version can be superseded', async () => {
      const requirementId = nextRequirementId();
      const approved = aVersion(requirementId, {
        status: URSStatus.APPROVED,
        approvedBy: 'qa',
        approvedAt: new Date(),
      });
      await repo.createRequirementVersion(approved);

      await expect(
        repo.updateRequirementVersion({
          ...approved,
          status: URSStatus.SUPERSEDED,
          supersededBy: 'the-next-one',
        }),
      ).resolves.toBeUndefined();

      const stored = await repo.getRequirementVersion(approved.id);
      expect(stored).toMatchObject({
        status: URSStatus.SUPERSEDED,
        supersededBy: 'the-next-one',
        approvedBy: 'qa',
      });
    });
  });
});
