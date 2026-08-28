process.env.BACKSTAGE_OLD_TESTS = 'true';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '..');
const cliPath = path.resolve(
  require.resolve('@backstage/cli/package.json'),
  '../bin/backstage-cli',
);

const result = spawnSync(
  process.execPath,
  [cliPath, 'package', 'test', ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env, cwd: packageRoot },
);

process.exit(result.status ?? 1);
