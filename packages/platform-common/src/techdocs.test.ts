import { techDocsPath } from './techdocs';

describe('techDocsPath (NXD-102)', () => {
  const entity = (kind: string, annotations: Record<string, string>, namespace?: string) => ({
    kind,
    metadata: { name: 'thing', namespace, annotations },
  });

  it('reads an entity that builds its own docs, with its real kind', () => {
    expect(techDocsPath(entity('Component', { 'backstage.io/techdocs-ref': 'dir:.' }))).toBe(
      '/docs/default/component/thing',
    );
    // Was hard-coded to `component`, which pointed API links at nothing.
    expect(techDocsPath(entity('API', { 'backstage.io/techdocs-ref': 'dir:.' }, 'Prod'))).toBe(
      '/docs/prod/api/thing',
    );
  });

  it('follows techdocs-entity to the docs an entity borrows, with an optional page', () => {
    expect(
      techDocsPath(
        entity('Component', {
          'backstage.io/techdocs-entity': 'component:default/data-product-platform',
        }),
      ),
    ).toBe('/docs/default/component/data-product-platform');
    expect(
      techDocsPath(
        entity('Component', {
          'backstage.io/techdocs-entity': 'component:default/data-product-platform',
          'backstage.io/techdocs-entity-path': '/uns/',
        }),
      ),
    ).toBe('/docs/default/component/data-product-platform/uns/');
    expect(
      techDocsPath(entity('API', { 'backstage.io/techdocs-entity': 'data-product-platform' })),
    ).toBe('/docs/default/component/data-product-platform');
  });

  it('prefers the borrowed docs when both are set', () => {
    expect(
      techDocsPath(
        entity('Component', {
          'backstage.io/techdocs-ref': 'dir:.',
          'backstage.io/techdocs-entity': 'component:default/data-product-platform',
        }),
      ),
    ).toBe('/docs/default/component/data-product-platform');
  });

  it('returns nothing — never a raw annotation value — when there are no docs', () => {
    expect(techDocsPath(entity('Component', {}))).toBeUndefined();
    expect(
      techDocsPath(entity('Component', { 'backstage.io/techdocs-entity': 'a:b:c' })),
    ).toBeUndefined();
  });
});
