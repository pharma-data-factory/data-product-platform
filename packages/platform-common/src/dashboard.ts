import { PlatformRole } from './roles';

export interface QuickAction {
  id: string;
  label: string;
  to: string;
}

const EXPLORE_ACTIONS: QuickAction[] = [
  { id: 'hub', label: 'Open Developer Hub', to: '/developer' },
  { id: 'marketplace', label: 'Explore Marketplace', to: '/marketplace' },
  { id: 'products', label: 'Browse Data Products', to: '/data-products' },
  { id: 'docs', label: 'Search Documentation', to: '/search' },
];

const CREATE_ACTION: QuickAction = {
  id: 'create',
  label: 'Create Data Product',
  to: '/create',
};

const RELEASES_ACTION: QuickAction = {
  id: 'releases',
  label: 'Release Catalog',
  to: '/releases',
};

const MY_ACCESS_ACTION: QuickAction = {
  id: 'my-access',
  label: 'My Access',
  to: '/access',
};

export function quickActionsForRole(role: PlatformRole): QuickAction[] {
  switch (role) {
    case 'VIEWER':
      return [...EXPLORE_ACTIONS, RELEASES_ACTION, MY_ACCESS_ACTION];
    case 'DEVELOPER':
      return [CREATE_ACTION, ...EXPLORE_ACTIONS, RELEASES_ACTION, MY_ACCESS_ACTION];
    case 'DATA_PRODUCT_OWNER':
      return [CREATE_ACTION, ...EXPLORE_ACTIONS, RELEASES_ACTION, MY_ACCESS_ACTION];
    case 'PLATFORM_ADMIN':
      return [
        CREATE_ACTION,
        { id: 'platform', label: 'Manage Platform', to: '/settings' },
        { id: 'entitlements', label: 'Entitlements', to: '/admin/entitlements' },
        {
          id: 'plugin-directory',
          label: 'Plugin Directory',
          to: '/plugin-directory',
        },
        ...EXPLORE_ACTIONS,
        RELEASES_ACTION,
        MY_ACCESS_ACTION,
      ];
    default:
      return [];
  }
}
