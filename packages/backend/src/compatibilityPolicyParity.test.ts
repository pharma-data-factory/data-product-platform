import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');

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
    const sdkDir = path
      .join(ROOT, 'packages/data-product-sdk')
      .replace(/\\/g, '/');
    const python = JSON.parse(
      execFileSync(
        'python',
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
