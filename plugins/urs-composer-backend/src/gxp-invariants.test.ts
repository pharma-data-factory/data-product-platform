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
  RequirementPriority,
  RequirementVersion,
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
