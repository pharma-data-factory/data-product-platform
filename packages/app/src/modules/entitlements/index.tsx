import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const accessRouteRef = createRouteRef();
const entitlementsRouteRef = createRouteRef();
const integrationRouteRef = createRouteRef();

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

export const entitlementsModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    myAccessPage,
    entitlementsAdminPage,
    marketplaceIntegrationPage,
  ],
});
