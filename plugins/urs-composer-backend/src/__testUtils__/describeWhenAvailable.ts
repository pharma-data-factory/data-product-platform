/** Whole-suite skip when PostgreSQL was unreachable during jest.globalSetup. */
export const describeWhenPg =
  process.env.URS_TEST_PG_AVAILABLE === '1' ? describe : describe.skip;

/** Resolve better-sqlite3 from the workspace backend package (no local dep). */
function sqliteDriverResolvable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require.resolve('better-sqlite3', {
      paths: [require.resolve('@backstage/backend-defaults/package.json')],
    });
    return true;
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require.resolve('better-sqlite3', {
        paths: [`${__dirname}/../../../../packages/backend`],
      });
      return true;
    } catch {
      return false;
    }
  }
}

/** Whole-suite skip when better-sqlite3 cannot be loaded (W&D seed proof). */
export const describeWhenSqlite = sqliteDriverResolvable()
  ? describe
  : describe.skip;
