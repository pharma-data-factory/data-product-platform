/**
 * Product Composer database migrations.
 *
 * Owns the Product Composer domain schema. Does not touch Backstage Catalog
 * tables or the URS Composer schema (that plugin owns its own tables).
 */

import { Knex } from 'knex';

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

      table.index(['entity_id']);
      table.index(['timestamp']);
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
  await knex.schema.dropTableIfExists('contract_subscriptions');
  await knex.schema.dropTableIfExists('product_version_dependencies');
  await knex.schema.dropTableIfExists('product_baselines');
  await knex.schema.dropTableIfExists('composer_audit_events');
  await knex.schema.dropTableIfExists('traceability_links');
  await knex.schema.dropTableIfExists('data_contracts');
  await knex.schema.dropTableIfExists('product_components');
  await knex.schema.dropTableIfExists('product_versions');
  await knex.schema.dropTableIfExists('products');
}
