import {
  buildCreateChangeRequestDefaults,
  buildUrsChangeRequestDeepLink,
  filterChangeRequestsByProductSoftRefs,
  matchesProductSoftRefs,
} from './changeRequestPrefill';

describe('changeRequestPrefill', () => {
  it('builds description soft-refs for product + baseline', () => {
    const defaults = buildCreateChangeRequestDefaults({
      baselineId: 'urs-old',
      productVersionId: 'ver-1',
      productId: 'prod-1',
      successor: 'urs-new',
      reason: 'Custom reason',
    });
    expect(defaults.title).toContain('urs-old');
    expect(defaults.reason).toBe('Custom reason');
    expect(defaults.description).toContain('urs-old');
    expect(defaults.description).toContain('ver-1');
    expect(defaults.description).toContain('prod-1');
    expect(defaults.description).toContain('urs-new');
    expect(defaults.description).toMatch(/not a GxP/i);
  });

  it('builds deep link query for Product Composer CTA', () => {
    const href = buildUrsChangeRequestDeepLink({
      ursBaselineId: 'urs-old',
      productVersionId: 'ver-1',
      productId: 'prod-1',
      successor: 'urs-new',
    });
    expect(href.startsWith('/urs-composer/change-requests/new?')).toBe(true);
    const q = new URLSearchParams(href.split('?')[1]);
    expect(q.get('baselineId')).toBe('urs-old');
    expect(q.get('productVersionId')).toBe('ver-1');
    expect(q.get('productId')).toBe('prod-1');
    expect(q.get('successor')).toBe('urs-new');
    expect(q.get('reason')).toMatch(/SUPERSEDED/i);
  });

  it('matchesProductSoftRefs hits exact breadcrumb phrases', () => {
    const defaults = buildCreateChangeRequestDefaults({
      baselineId: 'urs-old',
      productVersionId: 'ver-1',
      productId: 'prod-1',
    });
    expect(
      matchesProductSoftRefs(
        { title: defaults.title, description: defaults.description },
        { productVersionId: 'ver-1' },
      ),
    ).toBe(true);
    expect(
      matchesProductSoftRefs(
        { title: defaults.title, description: defaults.description },
        { productId: 'prod-1' },
      ),
    ).toBe(true);
    expect(
      matchesProductSoftRefs(
        { title: defaults.title, description: defaults.description },
        { ursBaselineId: 'urs-old' },
      ),
    ).toBe(true);
    expect(
      matchesProductSoftRefs(
        { title: defaults.title, description: defaults.description },
        { productVersionId: 'other' },
      ),
    ).toBe(false);
  });

  it('filterChangeRequestsByProductSoftRefs returns matching subset', () => {
    const a = buildCreateChangeRequestDefaults({
      productVersionId: 'ver-1',
      productId: 'prod-1',
    });
    const b = buildCreateChangeRequestDefaults({
      productVersionId: 'ver-2',
      productId: 'prod-2',
    });
    const items = [
      { id: '1', title: a.title, description: a.description },
      { id: '2', title: b.title, description: b.description },
    ];
    expect(
      filterChangeRequestsByProductSoftRefs(items, {
        productVersionId: 'ver-1',
      }).map(i => i.id),
    ).toEqual(['1']);
  });

  it('resolveProductSoftRefMatchAxis prefers PRODUCT_VERSION', () => {
    const {
      resolveProductSoftRefMatchAxis,
    } = require('@internal/platform-common');
    const defaults = buildCreateChangeRequestDefaults({
      baselineId: 'urs-old',
      productVersionId: 'ver-1',
      productId: 'prod-1',
    });
    expect(
      resolveProductSoftRefMatchAxis(
        { title: defaults.title, description: defaults.description },
        {
          productVersionId: 'ver-1',
          productId: 'prod-1',
          ursBaselineId: 'urs-old',
        },
      ),
    ).toBe('PRODUCT_VERSION');
  });
});
