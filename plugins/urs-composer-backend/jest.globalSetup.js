/**
 * Probes optional test infrastructure once before the suite loads so tests can
 * gate whole describe blocks with describe.skip (eslint-clean skip semantics).
 */
module.exports = async () => {
  const knex = require('knex');
  const pgSettings = {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.TEST_DB_PORT || '5435', 10),
    user: process.env.TEST_DB_USER || 'urs_test',
    password: process.env.TEST_DB_PASSWORD || 'test_pass123',
    database: process.env.TEST_DB_NAME || 'urs_composer_test',
  };

  const admin = knex({ client: 'pg', connection: pgSettings });
  try {
    await admin.raw('select 1');
    process.env.URS_TEST_PG_AVAILABLE = '1';
  } catch (error) {
    // In CI the database is a provisioned service, so "unavailable" means the
    // pipeline is broken. Skipping there would hide the GxP invariant suites
    // behind a green check, which is exactly what used to happen.
    if (process.env.CI) {
      await admin.destroy().catch(() => {});
      throw new Error(
        `PostgreSQL is required in CI but was unreachable at ` +
          `${pgSettings.host}:${pgSettings.port}: ${error.message}`,
      );
    }
    process.env.URS_TEST_PG_AVAILABLE = '0';
  } finally {
    await admin.destroy().catch(() => {});
  }
};
