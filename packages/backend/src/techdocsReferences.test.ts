import fs from 'fs';
import path from 'path';
import { parse as parseYaml, parseAllDocuments } from 'yaml';

/**
 * NXD-102. Every documentation reference a catalog entity makes can build.
 *
 * Eleven entities pointed TechDocs at directories it refuses to read
 * (`dir:../../docs`, outside the catalog file's own directory) or at
 * directories with no mkdocs.yml; the platform entity they should have
 * borrowed from was never registered. The reader answered 404 for all of
 * them, and a test pinned one of the broken references as correct.
 */

const ROOT = path.resolve(__dirname, '../../..');

/** Catalog files the base configuration loads, resolved from packages/backend. */
function baseCatalogFiles(): string[] {
  const config = parseYaml(fs.readFileSync(path.join(ROOT, 'app-config.yaml'), 'utf8'));
  return (config.catalog.locations as Array<{ type: string; target: string }>)
    .filter(location => location.type === 'file')
    .map(location => path.resolve(ROOT, 'packages/backend', location.target))
    .filter(file => fs.existsSync(file));
}

type Entity = {
  kind: string;
  metadata: { name: string; namespace?: string; annotations?: Record<string, string> };
};

function entitiesIn(file: string): Entity[] {
  return parseAllDocuments(fs.readFileSync(file, 'utf8'))
    .map(doc => doc.toJSON() as Entity)
    .filter(entity => entity?.metadata?.name && entity.kind !== 'Location');
}

describe('TechDocs references in the committed catalog (NXD-102)', () => {
  const files = baseCatalogFiles();
  const registered = new Set(
    files.flatMap(file =>
      entitiesIn(file).map(
        e => `${e.kind.toLowerCase()}:${e.metadata.namespace ?? 'default'}/${e.metadata.name}`,
      ),
    ),
  );

  it('registers the platform documentation entity', () => {
    expect(registered.has('component:default/data-product-platform')).toBe(true);
  });

  it('points every techdocs-ref at a directory inside its catalog file that has an mkdocs.yml', () => {
    const broken: string[] = [];
    for (const file of files) {
      for (const entity of entitiesIn(file)) {
        const ref = entity.metadata.annotations?.['backstage.io/techdocs-ref'];
        if (!ref?.startsWith('dir:')) continue;
        const base = path.dirname(file);
        const target = path.resolve(base, ref.slice('dir:'.length));
        const inside = target === base || target.startsWith(base + path.sep);
        if (!inside || !fs.existsSync(path.join(target, 'mkdocs.yml'))) {
          broken.push(`${path.relative(ROOT, file)} ${entity.kind}:${entity.metadata.name} ${ref}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('points every techdocs-entity at an entity the catalog actually loads', () => {
    const dangling: string[] = [];
    for (const file of files) {
      for (const entity of entitiesIn(file)) {
        const ref = entity.metadata.annotations?.['backstage.io/techdocs-entity'];
        if (ref && !registered.has(ref.toLowerCase())) {
          dangling.push(`${entity.kind}:${entity.metadata.name} -> ${ref}`);
        }
      }
    }
    expect(dangling).toEqual([]);
  });
});
