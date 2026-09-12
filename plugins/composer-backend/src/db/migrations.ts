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
      table.string('urs_baseline_id', 255);
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('approved_by', 255);
      table.timestamp('approved_at');
      table.string('superseded_by', 255);
      table.integer('revision').defaultTo(1);

      table.index(['product_version_id']);
      table.index(['status']);
      table.index(['urs_baseline_id']);
      table.foreign('product_version_id').references('id').inTable('product_versions');
    });
  } else if (
    !(await knex.schema.hasColumn('product_baselines', 'urs_baseline_id'))
  ) {
    await knex.schema.alterTable('product_baselines', table => {
      table.string('urs_baseline_id', 255);
      table.index(['urs_baseline_id']);
    });
  }

  // Backfill urs_baseline_id from legacy urs_baseline_ids JSON array (first element)
  if (
    (await knex.schema.hasTable('product_baselines')) &&
    (await knex.schema.hasColumn('product_baselines', 'urs_baseline_id'))
  ) {
    const rows = await knex('product_baselines')
      .whereNull('urs_baseline_id')
      .whereNotNull('urs_baseline_ids')
      .select('id', 'urs_baseline_ids');
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.urs_baseline_ids);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) {
          await knex('product_baselines')
            .where({ id: row.id })
            .update({ urs_baseline_id: String(parsed[0]) });
        }
      } catch {
        // ignore malformed legacy JSON
      }
    }
  }

  // Phase: Product Manifest v0.1
  if (!(await knex.schema.hasTable('product_manifests'))) {
    await knex.schema.createTable('product_manifests', table => {
      table.string('id', 255).primary();
      table.string('product_id', 255).notNullable();
      table.string('product_version_id', 255).notNullable();
      table.string('product_baseline_id', 255).notNullable();
      table.string('urs_baseline_id', 255).notNullable();
      table.string('manifest_version', 20).notNullable().defaultTo('0.1');
      table.string('content_hash', 128).notNullable();
      table.text('document').notNullable();
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.integer('revision').defaultTo(1);

      table.index(['product_version_id']);
      table.index(['product_baseline_id']);
      table.index(['urs_baseline_id']);
      table.unique(['product_baseline_id', 'manifest_version']);
      table
        .foreign('product_version_id')
        .references('id')
        .inTable('product_versions');
      table
        .foreign('product_baseline_id')
        .references('id')
        .inTable('product_baselines');
    });
  }

  // Advisory reverse index: Product ↔ URS Change Request soft links (not GxP)
  if (!(await knex.schema.hasTable('product_change_signals'))) {
    await knex.schema.createTable('product_change_signals', table => {
      table.string('id', 255).primary();
      table.string('product_id', 255);
      table.string('product_version_id', 255).notNullable();
      table.string('urs_baseline_id', 255);
      table.string('change_request_id', 255).notNullable();
      table.string('source', 50).notNullable().defaultTo('SOFT_HYDRATE');
      table.string('match_axis', 50).notNullable();
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('last_hydrated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['product_version_id']);
      table.index(['product_id']);
      table.index(['urs_baseline_id']);
      table.index(['change_request_id']);
      table.unique(['change_request_id', 'product_version_id']);
      table
        .foreign('product_version_id')
        .references('id')
        .inTable('product_versions');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_change_signals');
  await knex.schema.dropTableIfExists('product_manifests');
  await knex.schema.dropTableIfExists('product_baselines');
  await knex.schema.dropTableIfExists('composer_audit_events');
  await knex.schema.dropTableIfExists('traceability_links');
  await knex.schema.dropTableIfExists('data_contracts');
  await knex.schema.dropTableIfExists('product_components');
  await knex.schema.dropTableIfExists('product_versions');
  await knex.schema.dropTableIfExists('products');
}
