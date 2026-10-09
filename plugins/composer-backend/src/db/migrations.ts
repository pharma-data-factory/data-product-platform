/**
 * Product Composer database migrations.
 *
 * Owns the Product Composer domain schema. Does not touch Backstage Catalog
 * tables or the URS Composer schema (that plugin owns its own tables).
 */

import { Knex } from 'knex';
import {
  TRACEABILITY_SOURCE_TYPES,
  TRACEABILITY_TARGET_TYPES,
} from '@internal/platform-common';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('products'))) {
    await knex.schema.createTable('products', table => {
      table.string('id', 255).primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.text('business_purpose');
      table.string('product_type', 50).notNullable();
      table.string('domain', 100);
      table.string('subdomain', 100);
      table.string('owner', 255);
      table.string('team', 255);
      table.string('lifecycle', 50).notNullable().defaultTo('EXPERIMENTAL');
      table.string('status', 50).notNullable().defaultTo('ACTIVE');
      table.string('criticality', 20);
      table.string('gxp_relevance', 20);
      table.string('data_classification', 30);
      table.text('consumers');
      table.text('slo');
      table.text('cost_info');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('updated_by', 255);
      table.timestamp('updated_at');
      table.integer('revision').defaultTo(1);

      table.index(['status']);
      table.index(['domain']);
    });
  }

  if (!(await knex.schema.hasTable('product_versions'))) {
    await knex.schema.createTable('product_versions', table => {
      table.string('id', 255).primary();
      table.string('product_id', 255).notNullable();
      table.string('version', 50).notNullable();
      table.integer('version_number').notNullable();
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.text('changelog');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('approved_by', 255);
      table.timestamp('approved_at');
      table.integer('revision').defaultTo(1);

      table.index(['product_id']);
      table.index(['status']);
      table.unique(['product_id', 'version']);
      table.foreign('product_id').references('id').inTable('products');
    });
  }

  if (!(await knex.schema.hasTable('product_components'))) {
    await knex.schema.createTable('product_components', table => {
      table.string('id', 255).primary();
      table.string('product_version_id', 255).notNullable();
      table.string('component_type', 50).notNullable();
      table.string('name', 255).notNullable();
      table.text('description');
      table.string('ref', 255);
      table.string('interface_type', 30);
      table.string('source_system', 100);
      table.string('target_system', 100);
      table.text('config');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('updated_by', 255);
      table.timestamp('updated_at');
      table.integer('revision').defaultTo(1);

      table.index(['product_version_id']);
      table.index(['component_type']);
      table
        .foreign('product_version_id')
        .references('id')
        .inTable('product_versions');
    });
  }

  if (!(await knex.schema.hasTable('data_contracts'))) {
    await knex.schema.createTable('data_contracts', table => {
      table.string('id', 255).primary();
      table.string('product_component_id', 255).notNullable();
      table.string('schema_type', 30).notNullable();
      table.string('schema_ref', 512);
      table.text('contract_spec');
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.string('version', 50).notNullable().defaultTo('1.0');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('updated_by', 255);
      table.timestamp('updated_at');
      table.integer('revision').defaultTo(1);

      table.index(['product_component_id']);
      table
        .foreign('product_component_id')
        .references('id')
        .inTable('product_components');
    });
  }

  if (!(await knex.schema.hasTable('traceability_links'))) {
    await knex.schema.createTable('traceability_links', table => {
      table.string('id', 255).primary();
      table.string('source_type', 50).notNullable();
      table.string('source_id', 255).notNullable();
      table.string('relationship_type', 50).notNullable();
      table.string('target_type', 50).notNullable();
      table.string('target_id', 255).notNullable();
      table.text('metadata');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['source_type', 'source_id']);
      table.index(['target_type', 'target_id']);
      table.unique([
        'source_type',
        'source_id',
        'relationship_type',
        'target_type',
        'target_id',
      ]);
    });
  }

  if (!(await knex.schema.hasTable('composer_audit_events'))) {
    await knex.schema.createTable('composer_audit_events', table => {
      table.string('id', 255).primary();
      table.string('entity_type', 100).notNullable();
      table.string('entity_id', 255).notNullable();
      table.string('event_type', 100).notNullable();
      table.text('metadata');
      table.string('actor', 255).notNullable();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.text('old_value');
      table.text('new_value');
      // MVP1-B. See the note on the retrofit branch below for why these three
      // are nullable in the schema and required in the type.
      table.string('correlation_id', 255);
      table.text('reason');
      table.integer('entity_version');

      table.index(['entity_id']);
      table.index(['timestamp']);
      table.index(['correlation_id']);
    });
  } else {
    if (!(await knex.schema.hasColumn('composer_audit_events', 'old_value'))) {
      await knex.schema.alterTable('composer_audit_events', table => {
        table.text('old_value');
      });
    }
    if (!(await knex.schema.hasColumn('composer_audit_events', 'new_value'))) {
      await knex.schema.alterTable('composer_audit_events', table => {
        table.text('new_value');
      });
    }
    // MVP1-B: the product-side audit trail gains what the URS one already had.
    //
    // `correlation_id` stays nullable here on purpose, and the reasoning is
    // NXD-065's: rows written before this migration were never part of a
    // recorded operation, and inventing a correlation for them would be worse
    // than an honest gap in an append-only trail. The guarantee is on new
    // writes, and it is enforced by the type — `ComposerAuditEvent.correlationId`
    // is required, so a write site cannot compile without one.
    //
    // `reason` and `entity_version` close NXD-064 C-2: a requirement change
    // carried its rationale and a product change did not, and the two stores
    // could not be correlated by version.
    if (
      !(await knex.schema.hasColumn('composer_audit_events', 'correlation_id'))
    ) {
      await knex.schema.alterTable('composer_audit_events', table => {
        table.string('correlation_id', 255);
        table.index(['correlation_id']);
      });
    }
    if (!(await knex.schema.hasColumn('composer_audit_events', 'reason'))) {
      await knex.schema.alterTable('composer_audit_events', table => {
        table.text('reason');
      });
    }
    if (
      !(await knex.schema.hasColumn('composer_audit_events', 'entity_version'))
    ) {
      await knex.schema.alterTable('composer_audit_events', table => {
        table.integer('entity_version');
      });
    }
  }

  // Phase 1: versioning foundation columns on product_versions
  if (await knex.schema.hasTable('product_versions')) {
    const cols = ['parent_version_id', 'release_commit_sha', 'artifact_digest', 'baseline_id'];
    for (const col of cols) {
      if (!(await knex.schema.hasColumn('product_versions', col))) {
        await knex.schema.alterTable('product_versions', table => {
          if (col === 'parent_version_id') {
            table.string('parent_version_id', 255);
          } else if (col === 'release_commit_sha') {
            table.string('release_commit_sha', 255);
          } else if (col === 'artifact_digest') {
            table.string('artifact_digest', 512);
          } else if (col === 'baseline_id') {
            table.string('baseline_id', 255);
          }
        });
      }
    }
  }

  // Slice 1a: the URS baseline a version implements.
  //
  // Separate from `baseline_id` above, which is a ProductBaseline. Nullable:
  // products created before this could not state one, and a sandbox product
  // legitimately has none. The release gate is where absence becomes a
  // blocker, not the schema.
  if (await knex.schema.hasTable('product_versions')) {
    if (!(await knex.schema.hasColumn('product_versions', 'urs_baseline_id'))) {
      await knex.schema.alterTable('product_versions', table => {
        table.string('urs_baseline_id', 255).nullable();
        table.index(['urs_baseline_id']);
      });
    }
  }

  // NXD-137: the registry version a release build was registered as. Written
  // once by the release provenance import; nullable, because most versions
  // are never built and every version before this was not registered.
  if (await knex.schema.hasTable('product_versions')) {
    if (!(await knex.schema.hasColumn('product_versions', 'artifact_ref'))) {
      await knex.schema.alterTable('product_versions', table => {
        table.string('artifact_ref', 255).nullable();
      });
    }
  }

  // Slice 1a: Product Requirements — the snapshot of an approved URS baseline
  // that a Product Version implements.
  //
  // A copy rather than a join to the URS Composer's tables: that plugin owns
  // its schema and cross-plugin database access is forbidden (AGENTS.md,
  // "PLUGIN BOUNDARIES"), and more importantly the product must keep the
  // wording it was built against even after the URS side revises.
  if (!(await knex.schema.hasTable('product_requirements'))) {
    await knex.schema.createTable('product_requirements', table => {
      table.string('id', 255).primary();
      table.string('product_version_id', 255).notNullable();
      table.string('urs_baseline_id', 255).notNullable();
      table.string('urs_requirement_version_id', 255).notNullable();
      table.string('requirement_ref', 255).notNullable();
      table.text('title').notNullable();
      table.text('statement');
      table.string('category', 100);
      table.string('priority', 50);
      table.string('gxp_relevance', 20);
      table.string('version_label', 50);
      table.string('content_hash', 255);
      table.string('origin', 30).notNullable().defaultTo('PRODUCT');
      table.integer('position').notNullable().defaultTo(0);
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['product_version_id']);
      table.index(['product_version_id', 'requirement_ref']);
      // Identity: one row per pinned requirement version per product version.
      // In the database as well as the service, per NXD-009 — the service
      // check cannot close the race between two concurrent binds.
      table.unique(['product_version_id', 'urs_requirement_version_id']);
      table
        .foreign('product_version_id')
        .references('id')
        .inTable('product_versions');
    });
  }

  // Phase 1: revision-specific traceability links
  if (await knex.schema.hasTable('traceability_links')) {
    if (!(await knex.schema.hasColumn('traceability_links', 'source_revision'))) {
      await knex.schema.alterTable('traceability_links', table => {
        table.integer('source_revision');
      });
    }
    if (!(await knex.schema.hasColumn('traceability_links', 'target_revision'))) {
      await knex.schema.alterTable('traceability_links', table => {
        table.integer('target_revision');
      });
    }
  }

  // Phase 1: product baselines
  if (!(await knex.schema.hasTable('product_baselines'))) {
    await knex.schema.createTable('product_baselines', table => {
      table.string('id', 255).primary();
      table.string('product_version_id', 255).notNullable();
      table.string('baseline_version', 50).notNullable();
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.text('snapshot').notNullable();
      table.text('urs_baseline_ids');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('approved_by', 255);
      table.timestamp('approved_at');
      table.string('superseded_by', 255);
      table.integer('revision').defaultTo(1);

      table.index(['product_version_id']);
      table.index(['status']);
      table.foreign('product_version_id').references('id').inTable('product_versions');
    });
  }

  // Phase 5 closure (Slice 3): CI release provenance on the baseline.
  //
  // Columns rather than a write into `snapshot`: that object is checksummed at
  // creation (`_provenance.snapshotChecksum`, P-EXT-S1) over its own canonical
  // JSON, and provenance arrives afterwards, so writing it in would invalidate
  // the very checksum the block exists to provide.
  //
  // Nullable throughout. Every baseline that already exists was created before
  // CI could post anything, and a baseline made for a version that is never
  // built legitimately has none. Absence is a release-gate question, not a
  // schema violation.
  if (await knex.schema.hasTable('product_baselines')) {
    if (!(await knex.schema.hasColumn('product_baselines', 'release_commit_sha'))) {
      await knex.schema.alterTable('product_baselines', table => {
        table.string('release_commit_sha', 64).nullable();
        table.string('artifact_digest', 512).nullable();
        table.timestamp('provenance_timestamp').nullable();
        table.string('provenance_recorded_by', 255).nullable();
      });
    }
  }

  // Phase 1: enforce version and baseline identity in the database.
  await assertNoDuplicateIdentities(knex);
  await createIdentityIndexes(knex);

  // Phase 4 (P4-S3): ProductDependency — a version declares which DataContracts it consumes.
  if (!(await knex.schema.hasTable('product_version_dependencies'))) {
    await knex.schema.createTable('product_version_dependencies', table => {
      table.string('id', 255).primary();
      table.string('product_version_id', 255).notNullable();
      table.string('contract_id', 255).notNullable();
      table.text('description');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.integer('revision').defaultTo(1);

      table.index(['product_version_id']);
      table.index(['contract_id']);
      // A version may only declare one dependency per contract.
      table.unique(['product_version_id', 'contract_id']);
      table.foreign('product_version_id').references('id').inTable('product_versions');
      // Note: no FK to data_contracts — contracts may be deleted independently.
      // The service validates contract existence at creation time.
    });
  }

  // Phase 4 (P4-S1): DataContract identity — name and owner.
  //
  // DataContract had no name or owner before Phase 4 (NXD-010, NXD-034).
  // The columns are added as nullable so the migration is safe to run against
  // databases that already contain contract rows: existing rows keep NULL for
  // name, and the service enforces non-null for all new contracts. The unique
  // index only fires for non-NULL names (NULLs do not collide in unique indexes
  // in both SQLite and PostgreSQL), so pre-existing rows are unaffected.
  if (await knex.schema.hasTable('data_contracts')) {
    const hasName = await knex.schema.hasColumn('data_contracts', 'name');
    if (!hasName) {
      await knex.schema.alterTable('data_contracts', table => {
        table.string('name', 255).nullable();
        table.string('owner', 255).nullable();
      });
      await knex.raw(
        'create unique index if not exists data_contracts_name_unique ' +
          'on data_contracts (product_component_id, lower(name))',
      );
    }
    // Phase 4 (P4-S6): Data Quality contracts — declarative quality rules.
    const hasQualityRules = await knex.schema.hasColumn('data_contracts', 'quality_rules');
    if (!hasQualityRules) {
      await knex.schema.alterTable('data_contracts', table => {
        table.text('quality_rules').nullable();
      });
    }

    await promoteDataContractsToCoordinates(knex);

    // Phase 4 closure (Slice 2): provider-neutral exchange definitions.
    //
    // Nullable throughout. A contract that predates this knows nothing about
    // how it is delivered, and inventing a mechanism for it would be a guess
    // that consumers could then match on. The release gate is where a missing
    // mechanism becomes a blocker; the schema stays permissive so existing
    // rows remain readable.
    const hasDelivery = await knex.schema.hasColumn(
      'data_contracts',
      'delivery_mechanism',
    );
    if (!hasDelivery) {
      await knex.schema.alterTable('data_contracts', table => {
        table.string('delivery_mechanism', 64).nullable();
        table.string('exchange_endpoint', 1024).nullable();
        table.string('access_mode', 30).nullable();
        table.string('classification', 30).nullable();
        table.text('sla').nullable(); // JSON — ContractSla
      });
    }
  }

  // Upgrade Notifications (W2-1): records generated when a contract version bumps.
  if (!(await knex.schema.hasTable('upgrade_notifications'))) {
    await knex.schema.createTable('upgrade_notifications', table => {
      table.string('id', 255).primary();
      table.string('type', 64).notNullable();           // UPGRADE_NOTIFICATION_TYPES
      table.string('subject_name', 255).notNullable();  // contract or artifact name
      table.string('new_version', 100).notNullable();
      table.string('current_version', 100).nullable();
      table.text('summary').notNullable();
      table.boolean('breaking').notNullable().defaultTo(false);
      table.string('consumer_ref', 255).notNullable();
      table.boolean('read').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index(['consumer_ref']);
      table.index(['read']);
    });
  }

  // A-2: Schema snapshots for drift detection.
  if (!(await knex.schema.hasTable('schema_snapshots'))) {
    await knex.schema.createTable('schema_snapshots', table => {
      table.string('id', 255).primary();
      table.string('contract_id', 255).notNullable();
      table.string('version', 100).notNullable();
      table.text('schema').notNullable();         // JSON: JsonSchemaLike
      table.string('captured_at', 64).notNullable();
      table.string('captured_by', 255).notNullable();
      table.index(['contract_id']);
      table.index(['captured_at']);
    });
  }

  // 5-R1: Product-level policy declarations.
  if (await knex.schema.hasTable('products')) {
    const hasPolicies = await knex.schema.hasColumn('products', 'declared_policies');
    if (!hasPolicies) {
      await knex.schema.alterTable('products', table => {
        table.text('declared_policies').nullable(); // JSON array of policy coordinates
      });
    }

    // Step 2 ("one door"): where the code lives and which Catalog entity
    // describes it. Written by the `nexora:product:create` scaffolder action
    // from the repository the task published and the entity it registered.
    //
    // Both nullable, and they stay nullable: three other paths create products
    // (the API, an applied AI spec draft, the platform bootstrap) and none of
    // them has a repository. Existing rows are untouched.
    //
    // The unique index is on the entity ref alone, case-folded. Two products
    // claiming one Catalog entity is precisely the ambiguity these columns
    // exist to remove — the reverse lookup that the /data-products cross-link
    // uses has to have exactly one answer. NULLs do not collide in a unique
    // index in either SQLite or PostgreSQL, so every repository-less product
    // remains legal. `repository_url` is deliberately *not* unique: two
    // products in one monorepo is a shape the platform should not forbid.
    const hasRepositoryUrl = await knex.schema.hasColumn(
      'products',
      'repository_url',
    );
    if (!hasRepositoryUrl) {
      await knex.schema.alterTable('products', table => {
        table.string('repository_url', 1024).nullable();
        table.string('catalog_entity_ref', 255).nullable();
      });
      await knex.raw(
        'create unique index if not exists products_catalog_entity_ref_unique ' +
          'on products (lower(catalog_entity_ref))',
      );
    }
  }

  // Contract Subscriptions (P-EXT-S4): operational consumer registrations.
  if (!(await knex.schema.hasTable('contract_subscriptions'))) {
    await knex.schema.createTable('contract_subscriptions', table => {
      table.string('id', 255).primary();
      table.string('contract_id', 255).notNullable();
      table.string('consumer_ref', 255).notNullable();
      table.string('consumer_label', 255).notNullable();
      table.string('compatible_versions', 100).notNullable().defaultTo('*');
      table.string('status', 32).notNullable().defaultTo('ACTIVE');
      table.text('purpose').nullable();
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').nullable();
      table.integer('revision').defaultTo(1);
      table.index(['contract_id']);
      table.index(['consumer_ref']);
      table.unique(['contract_id', 'consumer_ref']);
    });
  }

  // MVP1-B (Slice B-4a): test evidence becomes a first-class row.
  //
  // Append-only. A re-run is new evidence, not a correction of the old row,
  // so there is deliberately no unique constraint on
  // (requirement_version_id, test_suite, test_case) and no upsert path. That
  // a test passed on Tuesday and failed on Wednesday is precisely what a
  // reviewer needs to see, and "which is current" is a question asked of the
  // rows by `latestExecutionPerCase`, not a column that overwrites history.
  //
  // `requirement_version_id` carries the URS `RequirementVersion.id` as a
  // value and not a foreign key. It cannot be one: the URS Composer owns its
  // own database, and AGENTS.md (PLUGIN BOUNDARIES) forbids a direct
  // cross-plugin database reference. The service checks the value against
  // this plugin's own `product_requirements` snapshot instead, which answers
  // the same question without crossing the boundary.
  if (!(await knex.schema.hasTable('test_executions'))) {
    await knex.schema.createTable('test_executions', table => {
      table.string('id', 255).primary();
      table.string('requirement_version_id', 255).notNullable();
      table.string('test_suite', 255).notNullable();
      table.string('test_case', 512).notNullable();
      table.string('status', 16).notNullable();
      table.timestamp('executed_at').notNullable();
      table.string('execution_artifact_url', 1024).nullable();
      table.string('correlation_id', 255).notNullable();
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['requirement_version_id']);
      table.index(['correlation_id']);
    });
  }

  // MVP1 item 6 / NXD-064 C-3: what the model proposed becomes durable.
  //
  // `AISpecDraft` lived in an in-process `Map`. A draft was lost on restart,
  // invisible to a second instance, and left no record of what the model
  // proposed — only of what a human then applied. NEXORA_STRATEGY.md requires
  // that "AI may implement and propose, but controlled approvals remain
  // human", and an approval whose subject was never stored is not a
  // controlled approval.
  //
  // `model_id`, `prompt_hash` and `raw_response` are notNullable because they
  // are the point. Parsing is lossy on purpose here — `parseProductSpecResponse`
  // drops requirement refs the model invented and falls back to PROCESSING for
  // an unknown component type — so the parsed columns record what was accepted
  // and `raw_response` records what was said. Only the second can answer a
  // reviewer asking whether the proposal was altered before it was applied.
  //
  // The prompt itself is deliberately not stored, only its hash: the user
  // prompt embeds requirement text, which the URS Composer owns, and copying
  // it here would put regulated content in a second plugin's database.
  //
  // `urs_baseline_id` is a value, not a foreign key, for the same reason
  // `product_versions` and `test_executions` treat it that way — AGENTS.md
  // PLUGIN BOUNDARIES.
  //
  // `generated_by`/`generated_at` rather than `created_by`/`created_at`: the
  // same fact under the name the domain type already uses, as
  // `schema_snapshots` does with `captured_by`. `applied_by`/`applied_at` and
  // `product_id` are nullable because a pending or rejected draft never
  // acquires them, which is the difference between a proposal and a decision.
  if (!(await knex.schema.hasTable('ai_spec_drafts'))) {
    await knex.schema.createTable('ai_spec_drafts', table => {
      table.string('id', 255).primary();
      table.string('urs_baseline_id', 255).notNullable();
      table.string('status', 32).notNullable().defaultTo('PENDING_REVIEW');
      table.string('product_name', 255).notNullable();
      table.text('description').notNullable();
      table.string('domain', 255).notNullable();
      table.text('suggested_components').notNullable();
      table.text('suggested_contracts').notNullable();
      table.string('model_id', 255).notNullable();
      table.string('prompt_hash', 128).notNullable();
      table.text('raw_response').notNullable();
      table.string('generated_by', 255).notNullable();
      table.string('generated_at', 64).notNullable();
      table.string('applied_by', 255);
      table.string('applied_at', 64);
      table.string('product_id', 255);

      table.index(['urs_baseline_id']);
      table.index(['status']);
      table.index(['generated_at']);
    });
  }

  // MVP1 item 11: a minimal Stage 3. The left arm of the V-model.
  //
  // Traceability ran UAS → Baseline → ProductRequirement → Component with
  // nothing between requirement and design (G-7 in
  // docs/compliance/traceability-and-gmp.md). A requirement says what the
  // business needs; a component is a thing that was built. The functional
  // specification is the statement of what the system must *do* to satisfy the
  // requirement, and it is the artefact a GxP reviewer looks for between them.
  //
  // One FS per bound requirement, which is what makes derivation possible and
  // what `minimal` means here — this slice does not model an FS that spans two
  // requirements or a requirement that needs two. The unique index on
  // (product_version_id, urs_requirement_version_id) is that rule, and it is
  // also what makes `deriveFunctionalSpecifications` idempotent.
  //
  // `urs_requirement_version_id` is a value, not a foreign key: the URS
  // Composer owns its own database (AGENTS.md, PLUGIN BOUNDARIES), the same
  // treatment product_requirements and test_executions give the identifier.
  // `product_version_id` is a real foreign key — that table is ours.
  if (!(await knex.schema.hasTable('functional_specifications'))) {
    await knex.schema.createTable('functional_specifications', table => {
      table.string('id', 255).primary();
      table.string('product_version_id', 255).notNullable();
      table.string('urs_requirement_version_id', 255).notNullable();
      table.string('fs_code', 100).notNullable();
      table.string('title', 512).notNullable();
      table.text('description').notNullable();
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['product_version_id']);
      table.index(['urs_requirement_version_id']);
      table
        .foreign('product_version_id')
        .references('id')
        .inTable('product_versions');
    });
  }

  await createFunctionalSpecIndexes(knex);
  await addTraceabilityIntegrity(knex);
  await createTraceabilityLookupIndexes(knex);
  // NXD-128. Approvals and releases, as attested: meaning, justification,
  // who, when, and whether a PIN was verified. Never changed, never removed.
  if (!(await knex.schema.hasTable('product_signatures'))) {
    await knex.schema.createTable('product_signatures', table => {
      table.string('id', 255).primary();
      table.string('product_id', 255).notNullable().index();
      table.string('entity_type', 32).notNullable();
      table.string('entity_id', 255).notNullable().index();
      table.string('meaning', 32).notNullable();
      table.text('justification').notNullable();
      table.string('signed_by', 255).notNullable();
      table.string('signed_at', 64).notNullable();
      table.boolean('gmp_relevant').notNullable();
      table.string('reauth_method', 64).nullable();
    });
  }

  // NXD-153. An AI build assignment and what became of it, as NXD-064 C-3
  // keeps a spec draft: the model, what it was given (as a hash), who issued
  // it and when, then the run and the pull request. `requirements` is the
  // assigned refs with their content hashes, not their text: the text is in
  // `product_requirements`, a snapshot that does not change.
  if (!(await knex.schema.hasTable('ai_build_assignments'))) {
    await knex.schema.createTable('ai_build_assignments', table => {
      table.string('id', 255).primary();
      table.string('product_id', 255).notNullable().index();
      table.string('product_version_id', 255).notNullable().index();
      table.string('version_label', 64).notNullable();
      table.string('status', 32).notNullable();
      table.text('requirements').notNullable();
      table.text('note').nullable();
      table.string('model_id', 255).notNullable();
      table.string('payload_hash', 128).notNullable();
      table.string('repository_url', 1024).notNullable();
      table.string('branch', 255).notNullable();
      table.string('issued_by', 255).notNullable();
      table.string('issued_at', 64).notNullable();
      table.string('dispatch_reason', 255).nullable();
      table.string('run_url', 1024).nullable();
      table.string('run_conclusion', 64).nullable();
      table.integer('pull_request_number').nullable();
      table.string('pull_request_url', 1024).nullable();
      table.string('pull_request_head_sha', 64).nullable();
      table.string('merged_at', 64).nullable();
      table.string('merge_commit_sha', 64).nullable();
      table.string('closed_at', 64).nullable();
      table.string('updated_at', 64).notNullable();
    });
  }
  // NXD-154. Which coding agent the assignment ran. Nullable: rows from
  // before the choice existed ran Claude Code, and are read as such.
  if (!(await knex.schema.hasColumn('ai_build_assignments', 'agent'))) {
    await knex.schema.alterTable('ai_build_assignments', table => {
      table.string('agent', 32).nullable();
    });
  }

  await makeAuditTrailAppendOnly(knex);
}

/**
 * NXD-093. Link lookups by id alone, on either end.
 *
 * `listTraceabilityLinks` asks "which links touch these entities" without
 * knowing their types. The `(source_type, source_id)` and
 * `(target_type, target_id)` indexes lead with the type, so PostgreSQL
 * cannot enter them on the id and planned a sequential scan of the whole
 * table; with these two it plans a BitmapOr of two index scans. Plain
 * `if not exists` so one statement covers both dialects.
 */
async function createTraceabilityLookupIndexes(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('traceability_links'))) {
    return;
  }
  await knex.raw(
    'create index if not exists traceability_links_source_id_idx ' +
      'on traceability_links (source_id)',
  );
  await knex.raw(
    'create index if not exists traceability_links_target_id_idx ' +
      'on traceability_links (target_id)',
  );
}

/**
 * NXD-092. The product-side audit trail becomes append-only in the database,
 * the way `urs-composer-backend` has made `audit_events` since NXD-064.
 *
 * The repository only ever inserts into `composer_audit_events`, but that
 * was a property of this code, not of the record: a console, a repair script
 * or a future plugin could rewrite who released what. Row triggers refuse
 * UPDATE and DELETE; a statement trigger refuses TRUNCATE, which bypasses
 * row triggers and is a delete of everything at once.
 *
 * PostgreSQL only, like every trigger in this repository. SQLite is used for
 * unit tests, not regulated data; the triggers are proven in
 * `db/migrations.postgres.test.ts`. The `down` migration's DROP TABLE is not
 * affected — removing the schema is an administrative act, not an edit.
 */
async function makeAuditTrailAppendOnly(knex: Knex): Promise<void> {
  if (knex.client.config.client !== 'pg') {
    return;
  }

  await knex.raw(`
    CREATE OR REPLACE FUNCTION composer_append_only()
    RETURNS trigger AS $fn$
    BEGIN
      RAISE EXCEPTION
        'COMPOSER_APPEND_ONLY: % is append-only; % is not permitted',
        TG_TABLE_NAME, TG_OP USING ERRCODE = '23514';
    END;
    $fn$ LANGUAGE plpgsql
  `);

  // CREATE TRIGGER has no IF NOT EXISTS before PostgreSQL 14, and this
  // migration runs on every boot, so each trigger is dropped and recreated.
  const triggers: Array<[string, string]> = [
    [
      'composer_audit_events_append_only',
      'BEFORE UPDATE OR DELETE ON composer_audit_events FOR EACH ROW',
    ],
    [
      'composer_audit_events_no_truncate',
      'BEFORE TRUNCATE ON composer_audit_events FOR EACH STATEMENT',
    ],
    // NXD-128.
    [
      'product_signatures_append_only',
      'BEFORE UPDATE OR DELETE ON product_signatures FOR EACH ROW',
    ],
    [
      'product_signatures_no_truncate',
      'BEFORE TRUNCATE ON product_signatures FOR EACH STATEMENT',
    ],
  ];
  for (const [name, definition] of triggers) {
    const table = definition.split(' ON ')[1].split(' ')[0];
    await knex.raw(`DROP TRIGGER IF EXISTS ${name} ON ${table}`);
    await knex.raw(
      `CREATE TRIGGER ${name} ${definition} EXECUTE FUNCTION composer_append_only()`,
    );
  }
}

/**
 * The two rules that make a functional specification identifiable.
 *
 * Expression indexes, so raw SQL with `if not exists` — the form that works on
 * both dialects, as `createIdentityIndexes` does for versions and baselines.
 * `lower(fs_code)` because `FS-OEE-014` and `fs-oee-014` are the same code
 * said twice, and a traceability chain with two of them is not a chain.
 */
async function createFunctionalSpecIndexes(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('functional_specifications'))) {
    return;
  }
  await knex.raw(
    'create unique index if not exists functional_specifications_code_unique ' +
      'on functional_specifications (product_version_id, lower(fs_code))',
  );
  await knex.raw(
    'create unique index if not exists functional_specifications_requirement_unique ' +
      'on functional_specifications (product_version_id, urs_requirement_version_id)',
  );
}

/**
 * Make `traceability_links` say what it points at, and refuse what it cannot.
 *
 * MVP1-B (Slice B-4a), audit completion item 4. The table has carried
 * `source_type` and `target_type` since Phase 1 as free `varchar(50)`
 * columns. Nothing checked them, so they drifted: `URS`, `URS_REQUIREMENT`
 * and `URS_REQUIREMENT_VERSION` all meant "a requirement", and `COMPONENT`
 * and `PRODUCT_COMPONENT` both meant a component. A discriminator that
 * accepts anything discriminates nothing, and — the part that matters — an
 * endpoint whose kind is unknown cannot be resolved to check it exists.
 *
 * Three mechanisms, because no single one reaches:
 *
 *  1. A real foreign key, for the one endpoint that lives in this schema.
 *     `target_test_execution_id` is nullable and references
 *     `test_executions`. `source_id`/`target_id` stay polymorphic and can
 *     never carry a foreign key themselves.
 *  2. CHECK constraints on the two type columns — PostgreSQL only, see below.
 *  3. Existence validation in the service, which is what actually runs on
 *     both dialects and for every write.
 */
async function addTraceabilityIntegrity(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('traceability_links'))) {
    return;
  }

  if (
    !(await knex.schema.hasColumn(
      'traceability_links',
      'target_test_execution_id',
    ))
  ) {
    await knex.schema.alterTable('traceability_links', table => {
      // Nullable and additive: every link written before this points at a
      // component and has no execution to name. `target_id` still carries
      // the value for every reader that predates this column; this one
      // exists so the database can refuse an execution id that is not there.
      table
        .string('target_test_execution_id', 255)
        .nullable()
        .references('id')
        .inTable('test_executions');
    });
  }

  await assertTraceabilityVocabulary(knex);

  // The only dialect branch in this file, and it is worth saying why.
  //
  // Everything else here is written so one statement covers both PostgreSQL
  // (production) and SQLite (tests). A CHECK constraint cannot be: SQLite's
  // ALTER TABLE supports RENAME, ADD COLUMN and DROP COLUMN and nothing else,
  // so adding one to an existing table would mean rebuilding the table —
  // copying production rows through a create/copy/drop/rename dance to gain
  // a guarantee the service already enforces on every write.
  //
  // So the constraint is added where the data actually lives, and SQLite
  // parity is carried by `validateTraceabilityLink` plus the suite. The
  // constraint itself is proven in `db/migrations.postgres.test.ts`, which is
  // the one composer suite that runs against real PostgreSQL.
  if (knex.client.config.client !== 'pg') {
    return;
  }

  const constraints: [string, string, readonly string[]][] = [
    [
      'traceability_links_source_type_check',
      'source_type',
      TRACEABILITY_SOURCE_TYPES,
    ],
    [
      'traceability_links_target_type_check',
      'target_type',
      TRACEABILITY_TARGET_TYPES,
    ],
  ];

  // Rebuilt when the vocabulary moves, not merely created when absent.
  //
  // This used to `continue` on any existing constraint of the right name. That
  // is correct exactly once. Adding FUNCTIONAL_SPEC for Stage 3 (item 11) is
  // the first time either array has grown since the constraint was introduced,
  // and on a database that already had it the old CHECK would have survived
  // untouched — so every FS link would be refused in production while a fresh
  // test schema, which builds the constraint from the current array, passed.
  // A guard that only agrees with the code on an empty database is worse than
  // no guard, because it is trusted.
  //
  // Comparing the rendered definition rather than tracking a version: the
  // question is whether the constraint in the database says what the array
  // says, and `pg_get_constraintdef` answers it directly.
  for (const [name, column, values] of constraints) {
    const list = values.map(value => `'${value}'`).join(', ');

    // Scoped to the table. `conname` is unique per relation, not per database,
    // so the previous unscoped lookup would have been satisfied by a
    // same-named constraint on any other table — and then skipped creating
    // this one.
    const existing = await knex
      .select(knex.raw('pg_get_constraintdef(oid) as def'))
      .from('pg_constraint')
      .where({ conname: name })
      .andWhere('conrelid', '=', knex.raw('?::regclass', ['traceability_links']))
      .first();

    if (existing) {
      // The admitted set, not the rendered text. PostgreSQL prints a CHECK
      // with its own casts and parentheses, and that spelling is a function of
      // the column type and the server version — comparing it literally would
      // rebuild the constraint on every start after a Postgres upgrade.
      // Comparing the values answers the actual question.
      const admitted = new Set(
        Array.from(
          (existing as { def: string }).def.matchAll(/'([^']*)'/g),
          match => match[1],
        ),
      );
      const current = new Set<string>(values);
      const unchanged =
        admitted.size === current.size &&
        [...current].every(value => admitted.has(value));
      if (unchanged) {
        continue;
      }
      // The vocabulary moved. Dropping and re-adding revalidates every
      // existing row against the new list, so a value that is no longer
      // admitted fails the migration here rather than silently persisting —
      // the same refuse-do-not-guess posture as assertTraceabilityVocabulary.
      await knex.raw('alter table ?? drop constraint ??', [
        'traceability_links',
        name,
      ]);
    }

    await knex.raw(
      `alter table ?? add constraint ?? check (?? in (${list}))`,
      ['traceability_links', name, column],
    );
  }
}

/**
 * Rows whose `source_type`/`target_type` is outside the vocabulary.
 *
 * Reports and stops, the same choice `assertNoDuplicateIdentities` makes and
 * for the same reason. Normalising `COMPONENT` to `PRODUCT_COMPONENT`
 * unattended would be a guess about what an author meant, on a table that
 * feeds the release gate — and a wrong guess there produces a link that looks
 * verified and is not. The data is already ambiguous; the constraint only
 * makes that visible.
 */
async function assertTraceabilityVocabulary(knex: Knex): Promise<void> {
  const rows = await knex('traceability_links')
    .select('id', 'source_type', 'target_type')
    .whereNotIn('source_type', [...TRACEABILITY_SOURCE_TYPES])
    .orWhereNotIn('target_type', [...TRACEABILITY_TARGET_TYPES]);

  if (rows.length === 0) {
    return;
  }

  const problems = (rows as any[])
    .slice(0, 20)
    .map(
      row =>
        `  traceability_links: id=${row.id} ` +
        `source_type=${row.source_type} target_type=${row.target_type}`,
    );
  const more =
    rows.length > problems.length
      ? `\n  ... and ${rows.length - problems.length} more`
      : '';

  throw new Error(
    'Composer migration stopped: traceability_links contains rows whose ' +
      'source_type or target_type is outside the supported vocabulary.\n' +
      `${problems.join('\n')}${more}\n` +
      `Supported source_type: ${TRACEABILITY_SOURCE_TYPES.join(', ')}\n` +
      `Supported target_type: ${TRACEABILITY_TARGET_TYPES.join(', ')}\n` +
      'These links cannot be resolved to an entity, so the release gate ' +
      'cannot tell whether they verify anything. Correct them deliberately ' +
      'and redeploy — the migration will not guess what a link meant.',
  );
}

/**
 * Rows that would violate the identity indexes added below.
 *
 * The service has refused duplicates since NXD-006/NXD-007, but data written
 * before that could already contain them, and a duplicate baseline label means
 * the candidate a ValidationContext binds to was ambiguous. Deciding which of
 * two colliding baselines keeps the label is a records decision, not something
 * a migration should make: relabelling would rewrite a GxP-relevant identifier
 * that an external QMS or an existing ValidationContext may reference.
 *
 * So this reports and stops. Deployment is blocked until someone resolves the
 * collision deliberately, which is the correct outcome — the data was already
 * ambiguous, the constraint only makes that visible.
 */
async function assertNoDuplicateIdentities(knex: Knex): Promise<void> {
  const problems: string[] = [];

  if (await knex.schema.hasTable('product_versions')) {
    const rows = await knex('product_versions')
      .select('product_id', 'version_number')
      .select(knex.raw('count(*) as occurrences'))
      .groupBy('product_id', 'version_number')
      .havingRaw('count(*) > 1');
    for (const row of rows as any[]) {
      problems.push(
        `  product_versions: product_id=${row.product_id} ` +
          `version_number=${row.version_number} (${row.occurrences} rows)`,
      );
    }
  }

  if (await knex.schema.hasTable('product_baselines')) {
    const rows = await knex('product_baselines')
      .select('product_version_id')
      .select(knex.raw('lower(baseline_version) as label'))
      .select(knex.raw('count(*) as occurrences'))
      .groupBy('product_version_id', knex.raw('lower(baseline_version)'))
      .havingRaw('count(*) > 1');
    for (const row of rows as any[]) {
      problems.push(
        `  product_baselines: product_version_id=${row.product_version_id} ` +
          `baseline_version=${row.label} (${row.occurrences} rows)`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(
      'Composer migration stopped: the database already contains rows that ' +
        'would violate the version/baseline identity constraints.\n' +
        `${problems.join('\n')}\n` +
        'These rows are ambiguous and must be resolved deliberately — the ' +
        'migration will not relabel a controlled identifier on your behalf. ' +
        'Decide which row keeps the label, correct the others, then redeploy.',
    );
  }
}

/**
 * Namespace given to contracts that predate coordinates.
 *
 * A holding namespace, not a guess. The alternative was to derive one from the
 * owning Product's name, but Product names are free text ("Contract Product"),
 * so deriving would either fail for almost every row or require slugifying —
 * and two different names can slug to the same segment, which is precisely the
 * ambiguity a coordinate exists to remove. `legacy` says what is true: this
 * contract was identified by its component and has not been given a real
 * namespace yet. Moving it is a deliberate act, not a migration's guess.
 */
const LEGACY_CONTRACT_NAMESPACE = 'legacy';

/** Mirrors `isNameSegment` in platform-common. Kept local: a migration must */
/** not change behaviour when the domain package is refactored. */
const CONTRACT_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Slice 1 of the phase-closure plan: a DataContract gets its own coordinate.
 *
 * Until now a contract was keyed by `(product_component_id, lower(name))`, so
 * it could not be named from outside the component that declared it —
 * `product.ts` itself carried a comment promising a later slice would fix
 * that. Identity becomes `(namespace, lower(name), version)`;
 * `product_component_id` stays as the relation to the providing component.
 *
 * The migration refuses rather than guesses, following NXD-009. Three things
 * can stop it, and all three mean the existing data is already ambiguous:
 *
 *   - a contract with no name (rows predating P4-S1);
 *   - a name that is not a coordinate segment, which cannot appear in a ref;
 *   - two contracts that would land on the same coordinate.
 *
 * Every offending row is reported in one message, so remediation is one pass
 * rather than a fix-redeploy-discover-the-next-one loop.
 */
async function promoteDataContractsToCoordinates(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn('data_contracts', 'namespace')) {
    return;
  }

  const rows: any[] = await knex('data_contracts').select(
    'id',
    'product_component_id',
    'name',
    'version',
  );

  const problems: string[] = [];
  const seen = new Map<string, string>();

  for (const row of rows) {
    const name = String(row.name ?? '').trim();
    if (!name) {
      problems.push(
        `  ${row.id}: has no name (predates P4-S1) — name it before upgrading`,
      );
      continue;
    }
    if (!CONTRACT_SEGMENT.test(name) || name.length > 64) {
      problems.push(
        `  ${row.id}: name "${name}" is not lowercase kebab-case, so it ` +
          `cannot appear in a coordinate — rename it`,
      );
      continue;
    }
    const coordinate = `${LEGACY_CONTRACT_NAMESPACE}/${name}@${row.version}`;
    const previous = seen.get(coordinate);
    if (previous) {
      problems.push(
        `  ${row.id}: would collide with ${previous} at ${coordinate} — ` +
          `both are named "${name}" at version ${row.version}. Rename one, or ` +
          `bump its version`,
      );
      continue;
    }
    seen.set(coordinate, row.id);
  }

  if (problems.length > 0) {
    throw new Error(
      'Composer migration stopped: DataContracts cannot be promoted to ' +
        'coordinates because the existing rows are ambiguous.\n' +
        `${problems.join('\n')}\n` +
        'A contract is now identified by namespace/name@version so it can be ' +
        'referenced from another Product. The migration will not rename a ' +
        'contract on your behalf — a name a consumer may already have written ' +
        'down is not something to change silently. Correct the rows above, ' +
        `then redeploy. Promoted contracts land in the "${LEGACY_CONTRACT_NAMESPACE}" ` +
        'namespace; move them to a real one deliberately afterwards.',
    );
  }

  await knex.schema.alterTable('data_contracts', table => {
    table.string('namespace', 64).nullable();
  });
  await knex('data_contracts').update({
    namespace: LEGACY_CONTRACT_NAMESPACE,
  });

  // The old index keyed identity to the component. Dropping it is the point of
  // the slice: two components may now provide differently-named contracts, and
  // one component may no longer claim a name another already holds in the same
  // namespace.
  await knex.raw('drop index if exists data_contracts_name_unique');
  await knex.raw(
    'create unique index if not exists data_contracts_coordinate_unique ' +
      'on data_contracts (namespace, lower(name), version)',
  );
}

/**
 * Unique indexes backing the identity rules the service enforces.
 *
 * The baseline index is on `lower(baseline_version)` so the database agrees
 * with the service, which treats "Rev-A" and "rev-a" as one label. Expression
 * indexes with `IF NOT EXISTS` are supported by both dialects in use here
 * (PostgreSQL in production, SQLite in tests), so one statement covers both.
 *
 * These close the race the service check cannot: two concurrent creates can
 * both pass an application-level uniqueness check.
 */
async function createIdentityIndexes(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('product_versions')) {
    await knex.raw(
      'create unique index if not exists product_versions_ordinal_unique ' +
        'on product_versions (product_id, version_number)',
    );
  }
  if (await knex.schema.hasTable('product_baselines')) {
    await knex.raw(
      'create unique index if not exists product_baselines_label_unique ' +
        'on product_baselines (product_version_id, lower(baseline_version))',
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ai_build_assignments');
  await knex.schema.dropTableIfExists('ai_spec_drafts');
  // Before product_versions: functional_specifications carries a foreign key
  // into it.
  await knex.schema.dropTableIfExists('functional_specifications');
  await knex.schema.dropTableIfExists('schema_snapshots');
  await knex.schema.dropTableIfExists('upgrade_notifications');
  await knex.schema.dropTableIfExists('contract_subscriptions');
  await knex.schema.dropTableIfExists('product_version_dependencies');
  await knex.schema.dropTableIfExists('product_requirements');
  await knex.schema.dropTableIfExists('product_baselines');
  await knex.schema.dropTableIfExists('composer_audit_events');
  // Before test_executions: traceability_links carries a foreign key into it.
  await knex.schema.dropTableIfExists('traceability_links');
  await knex.schema.dropTableIfExists('test_executions');
  await knex.schema.dropTableIfExists('data_contracts');
  await knex.schema.dropTableIfExists('product_components');
  await knex.schema.dropTableIfExists('product_versions');
  await knex.schema.dropTableIfExists('products');
}
