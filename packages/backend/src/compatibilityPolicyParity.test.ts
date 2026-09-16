import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');

/**
 * Finds an interpreter that can actually run the Python SDK.
 *
 * The binary is not always called `python` (CI's setup-python provides that
 * name, most Linux distributions only provide `python3`), and a `-minimal`
 * install can be on PATH while lacking the standard library the SDK imports.
 * Both cases used to surface as a bare `spawnSync python ENOENT`.
 */
function resolvePythonInterpreter(): string | undefined {
  const candidates = [
    process.env.PYTHON,
    process.env.PYTHON_BIN,
    'python3',
    'python',
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['-c', 'import json, sys'], { stdio: 'ignore' });
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

describe('shared compatibility policy', () => {
  it('keeps YAML, SDK JSON, and plugin JSON identical', () => {
    const canonical = yaml.parse(
      fs.readFileSync(
        path.join(ROOT, 'config/data-product-compatibility-policy.yaml'),
        'utf8',
      ),
    );
    const sdk = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          'packages/data-product-sdk/dataprod/compatibility-policy.json',
        ),
        'utf8',
      ),
    );
    const plugin = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          'plugins/data-products/src/compatibility-policy.json',
        ),
        'utf8',
      ),
    );
    expect(sdk).toEqual(canonical);
    expect(plugin).toEqual(canonical);
  });

  it('keeps platform version YAML and plugin JSON identical', () => {
    const canonical = yaml.parse(
      fs.readFileSync(
        path.join(ROOT, 'config/data-product-platform-versions.yaml'),
        'utf8',
      ),
    );
    const plugin = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, 'plugins/data-products/src/platform-versions.json'),
        'utf8',
      ),
    );
    expect(plugin).toEqual(canonical);
  });

  it('applies the shared policy in the Python SDK', () => {
    const interpreter = resolvePythonInterpreter();

    // CI installs Python and the SDK, so a missing interpreter there is a real
    // failure and must not be skipped away — the cross-language parity of this
    // policy is the whole point of the test. On a developer machine without a
    // usable Python the suite skips instead of reporting a red baseline.
    if (!interpreter) {
      if (process.env.CI) {
        throw new Error(
          'No usable Python interpreter found (tried $PYTHON, $PYTHON_BIN, python3, python). ' +
            'CI must run the Python SDK parity check.',
        );
      }
      console.warn(
        'Skipping Python SDK parity: no interpreter with a working standard ' +
          'library found. Set PYTHON=/path/to/python to run it locally.',
      );
      return;
    }

    const sdkDir = path
      .join(ROOT, 'packages/data-product-sdk')
      .replace(/\\/g, '/');
    const python = JSON.parse(
      execFileSync(
        interpreter,
        [
          '-c',
          [
            'import json,sys',
            `sys.path.insert(0, r"${sdkDir}")`,
            'from dataprod.compatibility import evaluate_compatibility',
            'previous={"version":"1.0.0","required":["id","name"],"properties":{"id":{"type":"string"},"name":{"type":"string"}}}',
            'nxt={"version":"2.0.0","required":["id","site"],"properties":{"id":{"type":"number"},"site":{"type":"string"}}}',
            'print(json.dumps(evaluate_compatibility(previous,nxt,[{"name":"sample-consumer","consumesContract":"sample-event","compatibleVersions":["1.x"],"active":True}],contract="sample-event")))',
          ].join(';'),
        ],
        { encoding: 'utf8' },
      ),
    );
    expect(python.status).toBe('BREAKING_CHANGE');
    expect(python.findings.map((item: { rule: string }) => item.rule)).toEqual([
      'major_version_change',
      'removed_required_field',
      'changed_field_type',
      'new_required_field',
      'consumer_version_mismatch',
    ]);
    expect(python.blockedConsumers).toEqual(['sample-consumer']);
  });
});
