import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const SDK_DIR = path.join(ROOT, 'packages/data-product-sdk/dataprod');
const WORKFLOW = 'data-product-quality.yml';
const DATA_PRODUCT_TEMPLATES = [
  'templates/mqtt-temperature-product/content',
  'templates/rest-equipment-product/content',
  'templates/machine-state-consumer/content',
  'templates/oee-data-product/content',
];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) {
      return [];
    }
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [path.relative(dir, full)];
  });
}

describe('Data Product Foundation', () => {
  it('vendors the shared SDK into both Data Product templates', () => {
    const sdkFiles = walk(SDK_DIR).sort();
    expect(sdkFiles).toEqual(
      expect.arrayContaining([
        '__init__.py',
        'quality.py',
        'compatibility.py',
        'contracts.py',
        'metadata.py',
        'compatibility-policy.json',
      ]),
    );

    for (const template of DATA_PRODUCT_TEMPLATES) {
      const vendorDir = path.join(ROOT, template, 'dataprod');
      expect(walk(vendorDir).sort()).toEqual(sdkFiles);
      for (const relative of sdkFiles) {
        expect(fs.readFileSync(path.join(vendorDir, relative), 'utf8')).toBe(
          fs.readFileSync(path.join(SDK_DIR, relative), 'utf8'),
        );
      }
    }
  });

  it('keeps product-specific source and storage logic out of the SDK', () => {
    const sdkSource = walk(SDK_DIR)
      .map(relative => fs.readFileSync(path.join(SDK_DIR, relative), 'utf8'))
      .join('\n')
      .toLowerCase();
    expect(sdkSource).not.toContain('mqtt');
    expect(sdkSource).not.toContain('paho');
    expect(sdkSource).not.toContain('equipmentid');
    expect(sdkSource).not.toContain('temperature');
    expect(sdkSource).not.toContain('sqlite');
    expect(sdkSource).not.toContain('source_api');
  });

  it('keeps vendored SDK version constants identical to the canonical SDK', () => {
    const canonical = fs.readFileSync(path.join(SDK_DIR, 'metadata.py'), 'utf8');
    expect(canonical).toContain('DATA_PRODUCT_STANDARD_VERSION = "1.0.0"');
    expect(canonical).toContain('DATA_PRODUCT_SDK_VERSION = "1.0.0"');

    for (const template of DATA_PRODUCT_TEMPLATES) {
      const vendored = fs.readFileSync(
        path.join(ROOT, template, 'dataprod/metadata.py'),
        'utf8',
      );
      expect(vendored).toBe(canonical);
    }
  });

  it('shares one reusable Data Product quality workflow', () => {
    const canonical = fs.readFileSync(
      path.join(ROOT, '.github/workflows', WORKFLOW),
      'utf8',
    );
    expect(canonical).toContain('workflow_call');
    expect(canonical).toMatch(/name:\s*Lint/);
    expect(canonical).toMatch(/name:\s*Unit tests/);
    expect(canonical).toMatch(/name:\s*Contract tests/);
    expect(canonical).toMatch(/name:\s*Data quality tests/);
    expect(canonical).toMatch(/name:\s*Compatibility tests/);
    expect(canonical).toMatch(/name:\s*Docker build/);

    for (const template of DATA_PRODUCT_TEMPLATES) {
      const vendored = fs.readFileSync(
        path.join(ROOT, template, '.github/workflows', WORKFLOW),
        'utf8',
      );
      expect(vendored).toBe(canonical);
      const ci = fs.readFileSync(
        path.join(ROOT, template, '.github/workflows/ci.yml'),
        'utf8',
      );
      expect(ci).toContain(`uses: ./.github/workflows/${WORKFLOW}`);
    }
  });
});
