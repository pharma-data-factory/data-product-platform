/**
 * URS Composer Database Migrations
 *
 * Defines all schema for URS Composer P1A persistence.
 * Executed by Backstage DatabaseService on plugin startup.
 *
 * All tables use UUID primary keys and include audit/timing columns.
 * Foreign keys enforce referential integrity.
 * Indexes optimize common query patterns.
 */

import { Knex } from 'knex';
import { seedMissingGenesisVersions } from './seeds';

/**
 * Migration: Create URS Composer schema
 *
 * Tables:
 * - business_capabilities: Canonical business capability reference model
 * - requirement_sets: User requirements specifications (URS documents)
 * - requirement_versions: Versioned requirements with lifecycle
 * - baselines: Immutable snapshots of requirement set versions
 * - approval_workflows: Reusable workflow templates
 * - approval_instances: Concrete approval execution for one baseline
 * - approval_steps: Individual approval steps within an instance
 * - requirements: P0 legacy requirement storage (deprecated)
 * - audit_events: Append-only immutable audit trail
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================================
  // BUSINESS CAPABILITIES
  // ============================================================================

  if (!(await knex.schema.hasTable('business_capabilities'))) {
    await knex.schema.createTable('business_capabilities', table => {
      table.string('id', 255).primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.string('domain', 100).notNullable();
      table.string('status', 50).notNullable().defaultTo('ACTIVE');
      table.string('source', 255);
      table.string('documentation_ref', 1024);
      table.integer('version').defaultTo(1);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('created_by', 255);

      table.index(['status']);
      table.index(['domain']);
    });
  }

  // ============================================================================
  // BUSINESS ROLES (P1B)
  // ============================================================================

  if (!(await knex.schema.hasTable('business_roles'))) {
    await knex.schema.createTable('business_roles', table => {
      table.string('id', 255).primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.string('status', 50).notNullable().defaultTo('ACTIVE');
      table.integer('version').defaultTo(1);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('created_by', 255);
      table.string('updated_by', 255);
      table.timestamp('updated_at');

      table.index(['status']);
    });
  }

  // ============================================================================
  // REQUIREMENT SETS (P0 + P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('requirement_sets'))) {
    await knex.schema.createTable('requirement_sets', table => {
      table.string('id', 255).primary();
      table.string('requirement_set_id', 255).notNullable().unique();
      table.integer('version_number').notNullable();
      table.text('business_capability_refs');
      table.text('business_need').notNullable();
      table.text('desired_outcome');
      table.text('business_value');
      table.text('stakeholders');
      table.text('process_context');
      table.string('solution_type', 50).notNullable();
      table.string('solution_name', 255);
      table.string('solution_catalog_ref', 255);
      table.text('scope');
      table.text('out_of_scope');
      table.string('gxp_relevance', 50);
      table.boolean('patient_impact').defaultTo(false);
      table.boolean('data_integrity_impact').defaultTo(false);
      table.boolean('electronic_records').defaultTo(false);
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.string('template_version', 50);
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('updated_by', 255);
      table.timestamp('updated_at');
      table.integer('revision').defaultTo(1);
      table.string('supersedes_ref', 255);

      table.index(['status']);
      table.index(['created_at']);
      table.index(['solution_type']);
    });
  } else if (!(await knex.schema.hasColumn('requirement_sets', 'business_capability_refs'))) {
    await knex.schema.alterTable('requirement_sets', table => {
      table.text('business_capability_refs');
    });
  }

  // Carries the reason for a controlled revision. Without this column the
  // value set by updateRequirementSetDraft and reviseRequirementSet was
  // silently dropped under Postgres while surviving in memory mode.
  if (!(await knex.schema.hasColumn('requirement_sets', 'version_comment'))) {
    await knex.schema.alterTable('requirement_sets', table => {
      table.text('version_comment');
    });
  }

  if (!(await knex.schema.hasColumn('requirement_sets', 'supersedes_ref'))) {
    await knex.schema.alterTable('requirement_sets', table => {
      table.string('supersedes_ref', 255);
    });
  }

  // ============================================================================
  // REQUIREMENT VERSIONS (P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('requirement_versions'))) {
    await knex.schema.createTable('requirement_versions', table => {
      table.string('id', 255).primary();
      table.string('requirement_id', 255).notNullable();
      table.string('version', 50).notNullable();
      table.integer('version_number').notNullable();
      table.string('title', 255).notNullable();
      table.text('statement').notNullable();
      table.text('rationale');
      table.string('category', 100);
      table.string('priority', 50);
      table.text('acceptance_intent');
      table.string('gxp_relevance', 50);
      table.string('source', 255);
      table.string('owner', 255);
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.string('revision_of', 255);
      table.text('revision_reason');
      table.string('superseded_by', 255);
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('approved_by', 255);
      table.timestamp('approved_at');
      table.integer('revision').defaultTo(1);

      table.index(['requirement_id']);
      table.index(['version_number']);
      table.index(['status']);
      table.unique(['requirement_id', 'version']);
    });
  }

  // Idempotent: add multi-dimensional classification columns to existing
  // requirement_versions tables (fresh installs also run this, since the
  // createTable above does not include them).
  if (!(await knex.schema.hasColumn('requirement_versions', 'component_type'))) {
    await knex.schema.alterTable('requirement_versions', table => {
      table.string('component_type', 50).index();
      table.string('requirement_nature', 50);
      table.string('criticality', 20);
      table.text('classification_meta');
    });
  }

  // Idempotent: structured major/minor version numbering. The legacy `version`
  // column keeps carrying the label for existing readers; `version_label` is
  // the value the versioning domain computes from now on. Backfilled below so
  // that upgraded databases are indistinguishable from fresh ones.
  if (!(await knex.schema.hasColumn('requirement_versions', 'major'))) {
    await knex.schema.alterTable('requirement_versions', table => {
      table.integer('major');
      table.integer('minor');
      table.string('version_label', 50);
      table.timestamp('released_at');
    });

    // Parsed inline rather than through the versioning domain: a migration has
    // to keep interpreting the data as it was written, even if the label
    // format later changes.
    const rows = await knex('requirement_versions').select(
      'id',
      'version',
      'status',
      'approved_at',
    );

    for (const row of rows) {
      const match = /^(\d+)\.(\d+)/.exec(String(row.version ?? ''));
      const major = match ? parseInt(match[1], 10) : 0;
      const minor = match ? parseInt(match[2], 10) : 1;

      await knex('requirement_versions')
        .where({ id: row.id })
        .update({
          major,
          minor,
          version_label: row.version ?? `${major}.${minor}`,
          released_at: row.status === 'APPROVED' ? row.approved_at : null,
        });
    }
  }

  // Idempotent: hash of the signed content. Written when a version is created
  // and never afterwards; a signature stores the hash it saw, and a mismatch
  // means the content moved underneath an existing signature.
  if (!(await knex.schema.hasColumn('requirement_versions', 'content_hash'))) {
    await knex.schema.alterTable('requirement_versions', table => {
      table.string('content_hash', 64);
    });
  }

  // ============================================================================
  // BASELINES (P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('baselines'))) {
    await knex.schema.createTable('baselines', table => {
      table.string('id', 255).primary();
      table.string('requirement_set_id', 255).notNullable();
      table.string('baseline_version', 50).notNullable();
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.text('requirement_version_ids').notNullable();
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('approved_by', 255);
      table.timestamp('approved_at');
      table.string('superseded_by', 255);
      table.integer('revision').defaultTo(1);

      table.index(['requirement_set_id']);
      table.index(['baseline_version']);
      table.index(['status']);
      table.unique(['requirement_set_id', 'baseline_version']);
      table.foreign('requirement_set_id').references('id').inTable('requirement_sets');
    });
  }

  // ============================================================================
  // APPROVAL WORKFLOWS (P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('approval_workflows'))) {
    await knex.schema.createTable('approval_workflows', table => {
      table.string('id', 255).primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.text('steps').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('created_by', 255);
    });
  }

  // ============================================================================
  // APPROVAL INSTANCES (P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('approval_instances'))) {
    await knex.schema.createTable('approval_instances', table => {
      table.string('id', 255).primary();
      table.string('workflow_id', 255).notNullable();
      table.string('baseline_id', 255).notNullable();
      table.string('status', 50).notNullable().defaultTo('NOT_STARTED');
      table.integer('current_step_sequence').defaultTo(0);
      table.string('started_by', 255).notNullable();
      table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
      table.string('completed_by', 255);
      table.timestamp('completed_at');
      table.integer('revision').defaultTo(1);

      table.index(['baseline_id']);
      table.index(['status']);
      table.foreign('workflow_id').references('id').inTable('approval_workflows');
      table.foreign('baseline_id').references('id').inTable('baselines');
    });
  }

  // ============================================================================
  // APPROVAL STEPS (P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('approval_steps'))) {
    await knex.schema.createTable('approval_steps', table => {
      table.string('id', 255).primary();
      table.string('approval_instance_id', 255).notNullable();
      table.integer('sequence').notNullable();
      table.string('role', 100).notNullable();
      table.string('status', 50).notNullable().defaultTo('PENDING');
      table.string('assigned_to', 255);
      table.string('decision', 50);
      table.text('comment');
      table.string('acted_by', 255);
      table.timestamp('acted_at');

      table.index(['approval_instance_id']);
      table.index(['status']);
      table.foreign('approval_instance_id').references('id').inTable('approval_instances');
    });
  }

  // Steps created before this column existed were read back with an undefined
  // `required`, which made approveApprovalStep treat the first approval as the
  // final one. Existing rows default to required so historic multi-step
  // instances keep their full chain.
  if (!(await knex.schema.hasColumn('approval_steps', 'required'))) {
    await knex.schema.alterTable('approval_steps', table => {
      table.boolean('required').notNullable().defaultTo(true);
    });
  }

  // ============================================================================
  // REQUIREMENTS (P0 - BACKWARD COMPATIBILITY)
  // ============================================================================

  if (!(await knex.schema.hasTable('requirements'))) {
    await knex.schema.createTable('requirements', table => {
      table.string('id', 255).primary();
      table.string('requirement_set_id', 255).notNullable();
      table.string('requirement_id', 255).notNullable();
      table.string('title', 255).notNullable();
      table.text('statement').notNullable();
      table.text('rationale');
      table.string('category', 100);
      table.string('priority', 50);
      table.text('acceptance_intent');
      table.string('gxp_relevance', 50);
      table.string('source', 255);
      table.string('owner', 255);
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['requirement_set_id']);
      table.index(['requirement_id']);
      table.foreign('requirement_set_id').references('id').inTable('requirement_sets');
    });
  }

  // Idempotent: add classification columns to the P0 draft requirements table.
  if (!(await knex.schema.hasColumn('requirements', 'component_type'))) {
    await knex.schema.alterTable('requirements', table => {
      table.string('component_type', 50);
      table.string('requirement_nature', 50);
      table.string('criticality', 20);
      table.text('classification_meta');
    });
  }

  // ============================================================================
  // AUDIT EVENTS (APPEND-ONLY)
  // ============================================================================

  if (!(await knex.schema.hasTable('audit_events'))) {
    await knex.schema.createTable('audit_events', table => {
      table.string('id', 255).primary();
      table.string('entity_type', 100).notNullable();
      table.string('entity_id', 255).notNullable();
      // entity_version records the semantic/string version identifier of the
      // audited entity (RequirementVersion.version / Baseline.baselineVersion,
      // e.g. "1.0"), NOT the integer revision counter. Stored as text so audit
      // history is never lossy.
      table.text('entity_version');
      table.string('event_type', 100).notNullable();
      table.text('old_value');
      table.text('new_value');
      table.string('actor', 255).notNullable();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.string('correlation_id', 255);
      table.text('reason');
      table.text('metadata');

      table.index(['entity_id']);
      table.index(['timestamp']);
      table.index(['entity_type']);
    });
  } else if (knex.client.config.client === 'pg') {
    // Existing database: ensure entity_version is text (it was created as
    // integer, but the active version model emits semantic/string versions such
    // as "1.0"). Idempotent — remove any integer-typed column default and
    // widen the type. Existing audit rows (if any) are NULL or integers and
    // widen losslessly to text. This migration is PostgreSQL-specific; other
    // dialects store values dynamically and have no information_schema.columns.
    // Resolved from the connection rather than hard-coded to 'public', so the
    // migration also applies when a search path puts the tables elsewhere,
    // which is how the test suites get a schema each.
    const [col] = await knex('information_schema.columns')
      .where({
        table_schema: knex.raw('current_schema()'),
        table_name: 'audit_events',
        column_name: 'entity_version',
      })
      .select('data_type');
    if (col && col.data_type === 'integer') {
      // entity_version has no foreign key or default; purely widen the type.
      await knex.schema.alterTable('audit_events', table => {
        table.text('entity_version').alter();
      });
    }
  }

  // ============================================================================
  // BASELINE ITEMS
  // ============================================================================

  // Replaces the requirement_version_ids JSON array on `baselines`, which
  // could not carry per-item data and could not be joined against. That column
  // is kept in sync for readers that predate this table, but it is deprecated:
  // baseline_items is the source of truth.
  if (!(await knex.schema.hasTable('baseline_items'))) {
    await knex.schema.createTable('baseline_items', table => {
      table.string('baseline_id', 255).notNullable();
      table.string('requirement_version_id', 255).notNullable();
      // What changed relative to the predecessor baseline; computed
      // server-side. UNKNOWN marks rows backfilled from the JSON array, where
      // the comparison was never recorded.
      table.string('review_scope', 20).notNullable().defaultTo('UNKNOWN');
      table.integer('position').notNullable().defaultTo(0);

      table.primary(['baseline_id', 'requirement_version_id']);
      table.index(['requirement_version_id']);
      table.foreign('baseline_id').references('id').inTable('baselines');
    });

    // Backfill from the JSON array so existing baselines keep their contents.
    const legacy = await knex('baselines').select(
      'id',
      'requirement_version_ids',
    );
    const rows: Array<{
      baseline_id: string;
      requirement_version_id: string;
      review_scope: string;
      position: number;
    }> = [];

    for (const baseline of legacy) {
      let ids: string[] = [];
      try {
        ids = JSON.parse(baseline.requirement_version_ids || '[]');
      } catch {
        ids = [];
      }
      ids.forEach((versionId, position) => {
        rows.push({
          baseline_id: baseline.id,
          requirement_version_id: versionId,
          review_scope: 'UNKNOWN',
          position,
        });
      });
    }

    if (rows.length) {
      await knex.batchInsert('baseline_items', rows, 100);
    }
  }

  // ============================================================================
  // CHANGE CONTROL
  // ============================================================================

  if (!(await knex.schema.hasTable('change_requests'))) {
    await knex.schema.createTable('change_requests', table => {
      // Human-readable and assigned server-side: CR-<year>-<sequence>.
      table.string('id', 64).primary();
      table.string('title', 255).notNullable();
      table.text('description').notNullable();
      table.text('reason').notNullable();
      table.text('affected_requirement_ids').notNullable();
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.string('requested_by', 255).notNullable();
      table.timestamp('requested_at').notNullable().defaultTo(knex.fn.now());
      table.string('decided_by', 255);
      table.timestamp('decided_at');
      table.text('decision_reason');
      table.integer('revision').notNullable().defaultTo(1);

      table.index(['status']);
      table.index(['requested_by']);
    });
  }

  if (!(await knex.schema.hasTable('impact_assessments'))) {
    await knex.schema.createTable('impact_assessments', table => {
      table.string('id', 255).primary();
      // One assessment per request: a second one would leave it ambiguous
      // which assessment the approval was based on.
      table.string('change_request_id', 64).notNullable().unique();
      table.text('summary').notNullable();
      table.boolean('gxp_impact').notNullable().defaultTo(false);
      table.text('validation_impact').notNullable();
      table.text('affected_version_ids').notNullable();
      table.string('assessed_by', 255).notNullable();
      table.timestamp('assessed_at').notNullable().defaultTo(knex.fn.now());

      table
        .foreign('change_request_id')
        .references('id')
        .inTable('change_requests');
    });
  }

  // Idempotent: the approved change request a version was raised under.
  if (
    !(await knex.schema.hasColumn('requirement_versions', 'change_request_id'))
  ) {
    await knex.schema.alterTable('requirement_versions', table => {
      table.string('change_request_id', 64).index();
    });
  }

  // ============================================================================
  // ELECTRONIC SIGNATURES (21 CFR Part 11 / EU Annex 11)
  // ============================================================================

  if (!(await knex.schema.hasTable('signatures'))) {
    await knex.schema.createTable('signatures', table => {
      table.string('id', 255).primary();
      // What was signed. Kept as a loose reference rather than a foreign key
      // because signatures outlive the records they describe.
      table.string('target_type', 50).notNullable();
      table.string('target_id', 255).notNullable();
      // AUTHORED | REVIEWED | APPROVED_QA
      table.string('meaning', 50).notNullable();
      table.string('signed_by', 255).notNullable();
      table.timestamp('signed_at').notNullable().defaultTo(knex.fn.now());
      // The content hash at the moment of signing. This is what makes the
      // signature verifiable after the fact.
      table.string('content_hash_at_signing', 64).notNullable();
      table.text('comment');

      table.index(['target_id']);
      table.index(['signed_by']);
      table.index(['meaning']);
      // A given user signs a given record with a given meaning at most once.
      table.unique(['target_type', 'target_id', 'meaning', 'signed_by']);
    });
  }

  // Signature credentials: the second factor for signing ("something you
  // know"). Deliberately separate from Backstage authentication, which stays
  // untouched — see domain/reauth.ts.
  if (!(await knex.schema.hasTable('signature_credentials'))) {
    await knex.schema.createTable('signature_credentials', table => {
      table.string('user_ref', 255).primary();
      table.string('pin_hash', 255).notNullable();
      table.string('salt', 255).notNullable();
      // Recorded per row so the hash parameters can be strengthened later
      // without invalidating existing credentials.
      table.string('algo', 50).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at');
      table.integer('failed_attempts').notNullable().defaultTo(0);
      table.timestamp('locked_until');
    });
  }

  // Data repair (not content seed): older installs may have requirements
  // without genesis 0.1 versions. Safe and idempotent on every boot.
  if (
    (await knex.schema.hasTable('requirements')) &&
    (await knex.schema.hasTable('requirement_versions'))
  ) {
    await seedMissingGenesisVersions(knex);
  }

  await applyGxpConstraints(knex);
}

/**
 * Database-level enforcement of the GxP invariants.
 *
 * These are guarantees, not conveniences: the application layer already
 * refuses the same operations, but a regulated audit trail may not depend on
 * application code being correct. Anything that reaches the database through
 * another path — a console, a repair script, a future plugin — is stopped here
 * too.
 *
 * PostgreSQL only. Partial indexes and row triggers have no portable
 * equivalent, and SQLite is used for unit tests rather than regulated data.
 */
async function applyGxpConstraints(knex: Knex): Promise<void> {
  if (knex.client.config.client !== 'pg') {
    return;
  }

  // Statuses in which a requirement version is still being worked on.
  const OPEN_STATUSES = ['DRAFT', 'IN_REVIEW', 'REVIEWED', 'IN_APPROVAL'];

  // Invariant 15: a requirement has at most one open version at a time.
  // Pre-existing violations would make the index creation fail with a message
  // that does not say what to do, so they are reported explicitly instead.
  const conflicting = await knex('requirement_versions')
    .whereIn('status', OPEN_STATUSES)
    .groupBy('requirement_id')
    .havingRaw('count(*) > 1')
    .select('requirement_id');

  if (conflicting.length > 0) {
    const ids = conflicting.map(r => r.requirement_id).join(', ');
    throw new Error(
      `Cannot enforce the single-open-version rule: these requirements already ` +
        `have more than one version in ${OPEN_STATUSES.join('/')}: ${ids}. ` +
        `Resolve the duplicates (reject or supersede the stale versions) and restart.`,
    );
  }

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS requirement_versions_single_open
      ON requirement_versions (requirement_id)
      WHERE status IN ('DRAFT', 'IN_REVIEW', 'REVIEWED', 'IN_APPROVAL')
  `);

  // Invariant 1: content is frozen once a version leaves DRAFT, and a released
  // version may only change its status (to superseded or obsolete).
  await knex.raw(`
    CREATE OR REPLACE FUNCTION urs_requirement_version_immutability()
    RETURNS trigger AS $fn$
    BEGIN
      IF OLD.status <> 'DRAFT' AND (
            NEW.title              IS DISTINCT FROM OLD.title
         OR NEW.statement          IS DISTINCT FROM OLD.statement
         OR NEW.rationale          IS DISTINCT FROM OLD.rationale
         OR NEW.acceptance_intent  IS DISTINCT FROM OLD.acceptance_intent
         OR NEW.category           IS DISTINCT FROM OLD.category
         OR NEW.priority           IS DISTINCT FROM OLD.priority
         OR NEW.gxp_relevance      IS DISTINCT FROM OLD.gxp_relevance
         OR NEW.criticality        IS DISTINCT FROM OLD.criticality
         OR NEW.component_type     IS DISTINCT FROM OLD.component_type
         OR NEW.requirement_nature IS DISTINCT FROM OLD.requirement_nature
         OR NEW.content_hash       IS DISTINCT FROM OLD.content_hash
         OR NEW.change_request_id  IS DISTINCT FROM OLD.change_request_id
      ) THEN
        RAISE EXCEPTION
          'URS_IMMUTABLE: requirement version % is content-frozen at status %',
          OLD.id, OLD.status USING ERRCODE = '23514';
      END IF;

      IF OLD.status IN ('APPROVED', 'SUPERSEDED', 'OBSOLETE', 'REJECTED') AND (
            NEW.requirement_id IS DISTINCT FROM OLD.requirement_id
         OR NEW.version        IS DISTINCT FROM OLD.version
         OR NEW.version_label  IS DISTINCT FROM OLD.version_label
         OR NEW.major          IS DISTINCT FROM OLD.major
         OR NEW.minor          IS DISTINCT FROM OLD.minor
         OR NEW.created_by     IS DISTINCT FROM OLD.created_by
         OR NEW.created_at     IS DISTINCT FROM OLD.created_at
         OR NEW.approved_by    IS DISTINCT FROM OLD.approved_by
         OR NEW.approved_at    IS DISTINCT FROM OLD.approved_at
         OR NEW.released_at    IS DISTINCT FROM OLD.released_at
      ) THEN
        RAISE EXCEPTION
          'URS_IMMUTABLE: released requirement version % may only change status',
          OLD.id USING ERRCODE = '23514';
      END IF;

      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql
  `);

  // A version that was ever reviewed is part of the record and cannot be
  // removed; abandoned drafts may still be deleted.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION urs_requirement_version_no_delete()
    RETURNS trigger AS $fn$
    BEGIN
      IF OLD.status <> 'DRAFT' THEN
        RAISE EXCEPTION
          'URS_IMMUTABLE: requirement version % cannot be deleted at status %',
          OLD.id, OLD.status USING ERRCODE = '23514';
      END IF;
      RETURN OLD;
    END;
    $fn$ LANGUAGE plpgsql
  `);

  // Invariant 2: the audit trail is append-only.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION urs_append_only()
    RETURNS trigger AS $fn$
    BEGIN
      RAISE EXCEPTION
        'URS_APPEND_ONLY: % is append-only; % is not permitted',
        TG_TABLE_NAME, TG_OP USING ERRCODE = '23514';
    END;
    $fn$ LANGUAGE plpgsql
  `);

  // A baseline is a snapshot. Once it is released, what it pins is the record
  // of what was released, so its contents stop being editable.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION urs_baseline_item_frozen()
    RETURNS trigger AS $fn$
    DECLARE
      target_id text;
      baseline_status text;
    BEGIN
      target_id := COALESCE(NEW.baseline_id, OLD.baseline_id);
      SELECT status INTO baseline_status FROM baselines WHERE id = target_id;

      IF baseline_status IS DISTINCT FROM 'DRAFT' THEN
        RAISE EXCEPTION
          'URS_IMMUTABLE: baseline % is % and its contents are frozen',
          target_id, baseline_status USING ERRCODE = '23514';
      END IF;

      RETURN COALESCE(NEW, OLD);
    END;
    $fn$ LANGUAGE plpgsql
  `);

  // A decided change request is the authority a later version was raised
  // under. Rewriting it afterwards would rewrite that justification.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION urs_change_request_immutability()
    RETURNS trigger AS $fn$
    BEGIN
      IF OLD.status IN ('APPROVED', 'REJECTED') THEN
        RAISE EXCEPTION
          'URS_IMMUTABLE: change request % was already %; it cannot be changed',
          OLD.id, OLD.status USING ERRCODE = '23514';
      END IF;

      IF NEW.id            IS DISTINCT FROM OLD.id
      OR NEW.requested_by  IS DISTINCT FROM OLD.requested_by
      OR NEW.requested_at  IS DISTINCT FROM OLD.requested_at THEN
        RAISE EXCEPTION
          'URS_IMMUTABLE: origin of change request % cannot be changed', OLD.id
          USING ERRCODE = '23514';
      END IF;

      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql
  `);

  // CREATE TRIGGER has no IF NOT EXISTS before PostgreSQL 14, and this
  // migration runs on every boot, so each trigger is dropped and recreated.
  const triggers: Array<[string, string, string, string]> = [
    [
      'requirement_versions_immutability',
      'requirement_versions',
      'BEFORE UPDATE',
      'urs_requirement_version_immutability',
    ],
    [
      'requirement_versions_no_delete',
      'requirement_versions',
      'BEFORE DELETE',
      'urs_requirement_version_no_delete',
    ],
    [
      'audit_events_append_only',
      'audit_events',
      'BEFORE UPDATE OR DELETE',
      'urs_append_only',
    ],
    // A signature is a statement someone made at a point in time. It can be
    // superseded by a later one, never edited or withdrawn.
    [
      'signatures_append_only',
      'signatures',
      'BEFORE UPDATE OR DELETE',
      'urs_append_only',
    ],
    // The assessment an approval was based on stays as it was written.
    [
      'impact_assessments_append_only',
      'impact_assessments',
      'BEFORE UPDATE OR DELETE',
      'urs_append_only',
    ],
    [
      'change_requests_immutability',
      'change_requests',
      'BEFORE UPDATE',
      'urs_change_request_immutability',
    ],
    [
      'baseline_items_frozen',
      'baseline_items',
      'BEFORE INSERT OR UPDATE OR DELETE',
      'urs_baseline_item_frozen',
    ],
  ];

  for (const [name, table, timing, fn] of triggers) {
    await knex.raw(`DROP TRIGGER IF EXISTS ${name} ON ${table}`);
    await knex.raw(
      `CREATE TRIGGER ${name} ${timing} ON ${table} FOR EACH ROW EXECUTE FUNCTION ${fn}()`,
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  // Tables removed in reverse dependency order
  await knex.schema.dropTableIfExists('signature_credentials');
  await knex.schema.dropTableIfExists('signatures');
  await knex.schema.dropTableIfExists('impact_assessments');
  await knex.schema.dropTableIfExists('change_requests');
  await knex.schema.dropTableIfExists('baseline_items');
  await knex.schema.dropTableIfExists('audit_events');
  await knex.schema.dropTableIfExists('approval_steps');
  await knex.schema.dropTableIfExists('approval_instances');
  await knex.schema.dropTableIfExists('approval_workflows');
  await knex.schema.dropTableIfExists('baselines');
  await knex.schema.dropTableIfExists('requirement_versions');
  await knex.schema.dropTableIfExists('requirements');
  await knex.schema.dropTableIfExists('requirement_sets');
  await knex.schema.dropTableIfExists('business_capabilities');
  await knex.schema.dropTableIfExists('business_roles');
}
