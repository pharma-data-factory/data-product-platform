import fs from 'fs';
import path from 'path';
import {
  DOCUMENTATION_PAGES,
  GOLDEN_PATH_DOC_SECTIONS,
  documentationFilePath,
} from '@internal/platform-common';

const ROOT = path.resolve(__dirname, '../../..');

describe('Developer Hub TechDocs', () => {
  it('publishes hub, architecture, and Golden Path how-to pages', () => {
    const files = new Set(
      DOCUMENTATION_PAGES.map(page => documentationFilePath(page.path)),
    );
    for (const relative of files) {
      expect({ relative, exists: fs.existsSync(path.join(ROOT, relative)) }).toEqual(
        { relative, exists: true },
      );
    }

    const mkdocs = fs.readFileSync(path.join(ROOT, 'mkdocs.yml'), 'utf8');
    expect(mkdocs).toContain('developer/index.md');
    expect(mkdocs).toContain('developer/getting-started.md');
    expect(mkdocs).toContain('developer/first-data-product.md');
    expect(mkdocs).toContain('architecture/platform.md');
    expect(
      fs.readFileSync(path.join(ROOT, 'docs/architecture/platform.md'), 'utf8'),
    ).toContain('/platform/architecture/developer');
    expect(mkdocs).toContain('how-to/mqtt-temperature.md');
    expect(mkdocs).toContain('how-to/rest-equipment.md');
    expect(mkdocs).toContain('how-to/oee.md');
    expect(mkdocs).toContain('how-to/oee-pilot.md');
    expect(mkdocs).toContain('how-to/compose-uns.md');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'packages/app/src/modules/developer-hub/index.tsx'),
        'utf8',
      ),
    ).toContain("path: '/developer'");
  });

  it('keeps existing TechDocs and Search sources functional', () => {
    const index = fs.readFileSync(path.join(ROOT, 'docs/index.md'), 'utf8');
    expect(index).toContain('demo-guide.md');
    expect(index).toContain('developer/index.md');
    expect(
      fs.existsSync(path.join(ROOT, 'docs/architecture.md')),
    ).toBe(true);
    expect(
      fs.readFileSync(path.join(ROOT, 'catalog-info.yaml'), 'utf8'),
    ).toContain('backstage.io/techdocs-ref: dir:.');

    const backendIndex = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-techdocs-backend'))",
    );
    expect(backendIndex).toContain(
      "backend.add(import('@backstage/plugin-search-backend-module-techdocs'))",
    );
  });

  it('documents the Golden Path documentation standard', () => {
    const standard = fs.readFileSync(
      path.join(ROOT, 'docs/engineering/golden-path-documentation.md'),
      'utf8',
    );
    for (const section of GOLDEN_PATH_DOC_SECTIONS) {
      expect(standard).toContain(section);
    }
  });

  it('includes platform Mermaid diagrams', () => {
    const platform = fs.readFileSync(
      path.join(ROOT, 'docs/architecture/platform.md'),
      'utf8',
    );
    expect(platform).toContain('```mermaid');
    expect(platform).toContain('IT/OT Systems');
    expect(platform).toContain('Pharma Data Factory');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'docs/architecture/data-product.md'),
        'utf8',
      ),
    ).toContain('Contract');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'docs/architecture/identity.md'),
        'utf8',
      ),
    ).toContain('Catalog User');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'docs/architecture/integration.md'),
        'utf8',
      ),
    ).toContain('Provider');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'docs/architecture/deployment-models.md'),
        'utf8',
      ),
    ).toContain('Internal Developer Platform');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'docs/developer/first-data-product.md'),
        'utf8',
      ),
    ).toContain('## 17. Open TechDocs');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'docs/architecture/data-product.md'),
        'utf8',
      ),
    ).toContain('Interface');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'docs/architecture/platform.md'),
        'utf8',
      ),
    ).toContain('Docker');
    expect(
      fs.readFileSync(
        path.join(ROOT, 'docs/architecture/identity.md'),
        'utf8',
      ),
    ).toContain('Entra');
  });
});
