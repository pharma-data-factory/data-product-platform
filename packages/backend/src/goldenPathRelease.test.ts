import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import {
  currentReleasedVersion,
  loadGoldenPathReleaseCatalog,
  validateGoldenPathReleaseCatalog,
} from '@internal/platform-common';

const ROOT = path.resolve(__dirname, '../../..');

describe('Golden Path release foundation', () => {
  it('keeps YAML and JSON release catalogs identical', () => {
    const canonical = yaml.parse(
      fs.readFileSync(
        path.join(ROOT, 'catalog/releases/golden-path-releases.yaml'),
        'utf8',
      ),
    );
    const runtime = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          'packages/platform-common/src/golden-path-releases.json',
        ),
        'utf8',
      ),
    );
    expect(runtime).toEqual(canonical);
    expect(validateGoldenPathReleaseCatalog(loadGoldenPathReleaseCatalog())).toEqual(
      [],
    );
  });

  it('keeps current RELEASED versions aligned with the platform version line', () => {
    const versions = yaml.parse(
      fs.readFileSync(
        path.join(ROOT, 'config/data-product-platform-versions.yaml'),
        'utf8',
      ),
    ) as { templates: Record<string, string> };
    expect(currentReleasedVersion('mqtt-temperature-data-product')).toBe(
      versions.templates['mqtt-temperature-data-product'],
    );
    expect(currentReleasedVersion('rest-equipment-data-product')).toBe(
      versions.templates['rest-equipment-data-product'],
    );
    expect(currentReleasedVersion('oee-data-product')).toBe(
      versions.templates['oee-data-product'],
    );
  });

  it('does not change MQTT or REST Golden Path runtime templates', () => {
    const mqtt = fs.readFileSync(
      path.join(ROOT, 'templates/mqtt-temperature-product/template.yaml'),
      'utf8',
    );
    const rest = fs.readFileSync(
      path.join(ROOT, 'templates/rest-equipment-product/template.yaml'),
      'utf8',
    );
    expect(mqtt).toContain('dataprod.platform/templateVersion: 1.0.0');
    expect(rest).toContain('dataprod.platform/templateVersion: 1.0.0');
    expect(mqtt).toContain('dataprod.platform/certification-status: CERTIFIED');
    expect(rest).toContain('dataprod.platform/certification-status: CERTIFIED');
  });

  it('labels Platform Edition and SaaS according to ROADMAP.md', () => {
    const roadmap = fs.readFileSync(path.join(ROOT, 'ROADMAP.md'), 'utf8');
    const distribution = fs.readFileSync(
      path.join(ROOT, 'docs/engineering/distribution-channels.md'),
      'utf8',
    );
    expect(roadmap).toContain('PLATFORM EDITION');
    expect(roadmap).toMatch(/Status: \*\*PLANNED\*\*/);
    expect(roadmap).toContain('FUTURE — SAAS');
    expect(distribution).toContain('PLATFORM_EDITION | PLANNED');
    expect(distribution).toContain('SAAS | FUTURE');
    expect(distribution).not.toMatch(/SaaS Edition.*AVAILABLE/);
  });
});
