import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import BuildIcon from '@material-ui/icons/Build';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const accessRouteRef = createRouteRef();
const entitlementsRouteRef = createRouteRef();
const integrationRouteRef = createRouteRef();
const governanceOverviewRouteRef = createRouteRef();

const myAccessPage = PageBlueprint.make({
  name: 'my-access',
  params: {
    path: '/access',
    routeRef: accessRouteRef,
    title: 'My Access',
    icon: <VerifiedUserIcon />,
    loader: () => import('./MyAccessPage').then(m => <m.MyAccessPage />),
  },
});

const entitlementsAdminPage = PageBlueprint.make({
  name: 'entitlements-admin',
  params: {
    path: '/admin/entitlements',
    routeRef: entitlementsRouteRef,
    loader: () =>
      import('./EntitlementsAdminPage').then(m => <m.EntitlementsAdminPage />),
  },
});

const marketplaceIntegrationPage = PageBlueprint.make({
  name: 'marketplace-integration',
  params: {
    path: '/admin/marketplace-integration',
    routeRef: integrationRouteRef,
    loader: () =>
      import('./MarketplaceIntegrationPage').then(m => (
        <m.MarketplaceIntegrationPage />
      )),
  },
});

const governanceOverviewPage = PageBlueprint.make({
  name: 'platform-governance-overview',
  params: {
    path: '/admin/platform-architecture',
    routeRef: governanceOverviewRouteRef,
    title: 'Platform Architecture',
    icon: <BuildIcon />,
    loader: () =>
      import('./PlatformGovernanceOverviewPage').then(m => (
        <m.PlatformGovernanceOverviewPage />
      )),
  },
});

export const entitlementsModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    myAccessPage,
    entitlementsAdminPage,
    marketplaceIntegrationPage,
    governanceOverviewPage,
  ],
});
