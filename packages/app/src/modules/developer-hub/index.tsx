import DeveloperModeIcon from '@material-ui/icons/DeveloperMode';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const developerHubRouteRef = createRouteRef();

const developerHubPage = PageBlueprint.make({
  name: 'developer',
  params: {
    path: '/developer',
    routeRef: developerHubRouteRef,
    title: 'Developer Hub',
    icon: <DeveloperModeIcon />,
    loader: () =>
      import('./DeveloperHubPage').then(m => <m.DeveloperHubPage />),
  },
});

// NXD-166. Roles & permissions, under Help & Docs.
const rolesHelpRouteRef = createRouteRef();

const rolesHelpPage = PageBlueprint.make({
  name: 'roles-help',
  params: {
    path: '/developer/roles',
    routeRef: rolesHelpRouteRef,
    title: 'Roles & permissions',
    loader: () => import('./RolesHelpPage').then(m => <m.RolesHelpPage />),
  },
});

export const developerHubModule = createFrontendModule({
  pluginId: 'app',
  extensions: [developerHubPage, rolesHelpPage],
});
