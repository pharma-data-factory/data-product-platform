import { decidePermission } from './policy';
import { quickActionsForRole } from './dashboard';
import {
  dataProductCertificationManagePermission,
  dataProductCreatePermission,
  goldenPathReleaseManagePermission,
  marketplaceAdminPermission,
  marketplaceViewPermission,
  platformAdminPermission,
} from './permissions';
import { PlatformRole } from './roles';

const SCAFFOLDER_CREATE = {
  name: 'scaffolder.task.create',
  attributes: { action: 'create' as const },
};

const SCAFFOLDER_ACTION = {
  name: 'scaffolder.action.execute',
  attributes: { action: 'create' as const },
};

const CATALOG_READ = {
  name: 'catalog.entity.read',
  attributes: { action: 'read' as const },
};

const TECHDOCS_READ = {
  name: 'techdocs.entity.read',
  attributes: { action: 'read' as const },
};

describe('permission matrix', () => {
  it.each(['VIEWER', 'DEVELOPER', 'DATA_PRODUCT_OWNER', 'PLATFORM_ADMIN'] as PlatformRole[])(
    '%s can view Catalog, APIs, TechDocs, Marketplace, and Data Products',
    role => {
      expect(decidePermission(CATALOG_READ, role)).toBe('allow');
      expect(decidePermission(TECHDOCS_READ, role)).toBe('allow');
      expect(decidePermission(marketplaceViewPermission, role)).toBe('allow');
      expect(
        decidePermission(
          { name: 'data-product.view', attributes: { action: 'read' } },
          role,
        ),
      ).toBe('allow');
    },
  );

  it('denies unauthenticated requests', () => {
    expect(decidePermission(CATALOG_READ)).toBe('deny');
    expect(decidePermission(TECHDOCS_READ)).toBe('deny');
    expect(decidePermission(SCAFFOLDER_CREATE)).toBe('deny');
  });

  it('allows Viewer AAS reads and denies AAS writes', () => {
    expect(
      decidePermission(
        { name: 'aas.read', attributes: { action: 'read' } },
        'VIEWER',
      ),
    ).toBe('allow');
    expect(
      decidePermission(
        { name: 'aas.manage', attributes: { action: 'update' } },
        'VIEWER',
      ),
    ).toBe('deny');
    expect(
      decidePermission(
        { name: 'aas.manage', attributes: { action: 'update' } },
        'DEVELOPER',
      ),
    ).toBe('deny');
    expect(
      decidePermission(
        { name: 'aas.manage', attributes: { action: 'update' } },
        'DATA_PRODUCT_OWNER',
      ),
    ).toBe('allow');
    expect(
      decidePermission(
        { name: 'aas.manage', attributes: { action: 'update' } },
        'PLATFORM_ADMIN',
      ),
    ).toBe('allow');
  });

  it('denies Viewer Scaffolder execution and Data Product create', () => {
    expect(decidePermission(SCAFFOLDER_CREATE, 'VIEWER')).toBe('deny');
    expect(decidePermission(SCAFFOLDER_ACTION, 'VIEWER')).toBe('deny');
    expect(decidePermission(dataProductCreatePermission, 'VIEWER')).toBe(
      'deny',
    );
    expect(decidePermission(marketplaceAdminPermission, 'VIEWER')).toBe(
      'deny',
    );
  });

  it('allows Developer Scaffolder execution and Data Product create', () => {
    expect(decidePermission(SCAFFOLDER_CREATE, 'DEVELOPER')).toBe('allow');
    expect(decidePermission(SCAFFOLDER_ACTION, 'DEVELOPER')).toBe('allow');
    expect(decidePermission(dataProductCreatePermission, 'DEVELOPER')).toBe(
      'allow',
    );
    expect(
      decidePermission(dataProductCertificationManagePermission, 'DEVELOPER'),
    ).toBe('deny');
    expect(decidePermission(platformAdminPermission, 'DEVELOPER')).toBe(
      'deny',
    );
  });

  it('allows Owner governance and certification actions', () => {
    expect(decidePermission(SCAFFOLDER_CREATE, 'DATA_PRODUCT_OWNER')).toBe(
      'allow',
    );
    expect(
      decidePermission(
        dataProductCertificationManagePermission,
        'DATA_PRODUCT_OWNER',
      ),
    ).toBe('allow');
    expect(decidePermission(platformAdminPermission, 'DATA_PRODUCT_OWNER')).toBe(
      'deny',
    );
  });

  it('allows Admin full platform, template, and marketplace administration', () => {
    expect(decidePermission(platformAdminPermission, 'PLATFORM_ADMIN')).toBe(
      'allow',
    );
    expect(decidePermission(marketplaceAdminPermission, 'PLATFORM_ADMIN')).toBe(
      'allow',
    );
    expect(
      decidePermission(
        { name: 'scaffolder.template.management' },
        'PLATFORM_ADMIN',
      ),
    ).toBe('allow');
    expect(
      decidePermission(
        { name: 'catalog.location.create', attributes: { action: 'create' } },
        'PLATFORM_ADMIN',
      ),
    ).toBe('allow');
    expect(decidePermission(goldenPathReleaseManagePermission, 'PLATFORM_ADMIN')).toBe(
      'allow',
    );
  });

  it('denies Developer Golden Path release approval', () => {
    expect(decidePermission(goldenPathReleaseManagePermission, 'DEVELOPER')).toBe(
      'deny',
    );
    expect(
      decidePermission(goldenPathReleaseManagePermission, 'DATA_PRODUCT_OWNER'),
    ).toBe('deny');
  });

  it('allows Developer Create on RELEASED official templates and denies retired ones', () => {
    const parameterRead = {
      name: 'scaffolder.template.parameter.read',
      attributes: { action: 'read' as const },
    };
    expect(
      decidePermission(
        parameterRead,
        'DEVELOPER',
        'template:default/mqtt-temperature-data-product',
      ),
    ).toBe('allow');
    expect(
      decidePermission(
        parameterRead,
        'DEVELOPER',
        'template:default/python-microservice',
      ),
    ).toBe('allow');
  });
});

describe('role-aware dashboard actions', () => {
  it('returns Viewer marketplace and catalog actions', () => {
    expect(quickActionsForRole('VIEWER').map(action => action.label)).toEqual([
      'Open Developer Hub',
      'Explore Marketplace',
      'Browse Data Products',
      'Search Documentation',
      'Release Catalog',
      'My Access',
    ]);
  });

  it('returns Developer create and marketplace actions', () => {
    expect(quickActionsForRole('DEVELOPER').map(action => action.label)).toEqual([
      'Create Data Product',
      'Open Developer Hub',
      'Explore Marketplace',
      'Browse Data Products',
      'Search Documentation',
      'Release Catalog',
      'My Access',
    ]);
  });

  it('returns Owner quality and dependency actions', () => {
    expect(
      quickActionsForRole('DATA_PRODUCT_OWNER').map(action => action.label),
    ).toEqual([
      'Create Data Product',
      'Open Developer Hub',
      'Explore Marketplace',
      'Browse Data Products',
      'Search Documentation',
      'Release Catalog',
      'My Access',
    ]);
  });

  it('returns Admin platform administration actions', () => {
    expect(
      quickActionsForRole('PLATFORM_ADMIN').map(action => action.label),
    ).toEqual([
      'Create Data Product',
      'Manage Platform',
      'Entitlements',
      'Open Developer Hub',
      'Explore Marketplace',
      'Browse Data Products',
      'Search Documentation',
      'Release Catalog',
      'My Access',
    ]);
  });
});
