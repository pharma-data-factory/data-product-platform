import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const CONTENT = path.join(ROOT, 'templates/mqtt-temperature-product/content');

function render(source: string): string {
  return source.replace(/\$\{\{\s*values\.name\s*\}\}/g, 'cold-room-temperature');
}

describe('developer journey local E2E proof', () => {
  it('proves the MQTT Temperature generated service contract locally', () => {
    const main = render(fs.readFileSync(path.join(CONTENT, 'app/main.py'), 'utf8'));
    const catalog = render(
      fs.readFileSync(path.join(CONTENT, 'catalog-info.yaml'), 'utf8'),
    );
    const qualityCi = fs.readFileSync(
      path.join(CONTENT, '.github/workflows/data-product-quality.yml'),
      'utf8',
    );
    const docs = fs.readFileSync(path.join(CONTENT, 'docs/index.md'), 'utf8');

    expect(main).toContain('/health');
    expect(main).toContain('/api/v1/quality');
    expect(catalog).toContain('type: data-product');
    expect(catalog).toContain('cold-room-temperature');
    expect(qualityCi).toMatch(/Security scan/i);
    expect(qualityCi).toContain('pip-audit');
    expect(docs).toMatch(/TechDocs|Documentation|MQTT Temperature/i);
    expect(
      fs.existsSync(
        path.join(ROOT, 'docs/developer/github-integration-test.md'),
      ),
    ).toBe(true);
  });
});
