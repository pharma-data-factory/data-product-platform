/**
 * The platform policy is authored once and read in more than one place.
 *
 * config/data-product-platform-policy.yaml is the source of truth; the JSON
 * next to the release gate is a vendored copy so the gate needs no YAML parser
 * at runtime. Copies drift, and a drifted policy enforces something nobody
 * wrote down — which is worse than enforcing nothing, because the document
 * still reads as though the rule applies.
 *
 * Sits beside compatibilityPolicyParity.test.ts, which does the same job for
 * the compatibility policy, and reads both files from disk rather than
 * importing across a workspace boundary.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');

describe('shared platform policy', () => {
  it('keeps the YAML source and the vendored JSON identical', () => {
    const canonical = yaml.parse(
      fs.readFileSync(
        path.join(ROOT, 'config/data-product-platform-policy.yaml'),
        'utf8',
      ),
    );
    const vendored = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, 'plugins/composer-backend/src/platform-policy.json'),
        'utf8',
      ),
    );

    expect(vendored).toEqual(canonical);
  });

  it('keeps the version the templates pin in step with the policy', () => {
    // Templates write dataprod.platform/policy-version at scaffold time. If
    // that literal fell behind, every new product would claim conformance to a
    // policy version it was not built against.
    const canonical = yaml.parse(
      fs.readFileSync(
        path.join(ROOT, 'config/data-product-platform-policy.yaml'),
        'utf8',
      ),
    );

    const dataProductTemplates = [
      'oee-data-product',
      'rest-equipment-product',
      'mqtt-temperature-product',
      'machine-state-consumer',
      'aas-data-product',
    ];

    for (const template of dataProductTemplates) {
      const source = fs.readFileSync(
        path.join(ROOT, 'templates', template, 'template.yaml'),
        'utf8',
      );
      expect({ template, pinned: source }).toMatchObject({
        template,
        pinned: expect.stringContaining(
          `policyVersion: '${canonical.version}'`,
        ),
      });
    }
  });
});
