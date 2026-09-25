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
  await knex.schema.dropTableIfExists('schema_snapshots');
  await knex.schema.dropTableIfExists('upgrade_notifications');
  await knex.schema.dropTableIfExists('contract_subscriptions');
  await knex.schema.dropTableIfExists('product_version_dependencies');
  await knex.schema.dropTableIfExists('product_requirements');
  await knex.schema.dropTableIfExists('product_baselines');
  await knex.schema.dropTableIfExists('composer_audit_events');
  await knex.schema.dropTableIfExists('traceability_links');
  await knex.schema.dropTableIfExists('data_contracts');
  await knex.schema.dropTableIfExists('product_components');
  await knex.schema.dropTableIfExists('product_versions');
  await knex.schema.dropTableIfExists('products');
}
