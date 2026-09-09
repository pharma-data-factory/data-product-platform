import { ursComposerPlugin } from './plugin';

const EXPECTED_PAGE_PATHS = [
  '/urs-composer',
  '/urs-composer/library',
  '/urs-composer/new',
  '/urs-composer/capabilities',
  '/urs-composer/business-roles',
  '/urs-composer/:id/edit',
  '/urs-composer/baselines/:id/changes',
  '/urs-composer/:id',
] as const;

describe('ursComposerPlugin routes', () => {
  it('exposes route refs for URS Composer pages', () => {
    expect(Object.keys(ursComposerPlugin.routes ?? {})).toEqual(
      expect.arrayContaining([
        'root',
        'library',
        'create',
        'edit',
        'requirementSet',
        'capabilities',
        'businessRoles',
        'changeSet',
      ]),
    );
  });

  it('registers expected page paths', () => {
    expect(EXPECTED_PAGE_PATHS).toHaveLength(
      Object.keys(ursComposerPlugin.routes ?? {}).length,
    );
    expect(EXPECTED_PAGE_PATHS).toEqual([
      '/urs-composer',
      '/urs-composer/library',
      '/urs-composer/new',
      '/urs-composer/capabilities',
      '/urs-composer/business-roles',
      '/urs-composer/:id/edit',
      '/urs-composer/baselines/:id/changes',
      '/urs-composer/:id',
    ]);
  });
});
