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

      table.index(['entity_id']);
      table.index(['timestamp']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('composer_audit_events');
  await knex.schema.dropTableIfExists('traceability_links');
  await knex.schema.dropTableIfExists('data_contracts');
  await knex.schema.dropTableIfExists('product_components');
  await knex.schema.dropTableIfExists('product_versions');
  await knex.schema.dropTableIfExists('products');
}
