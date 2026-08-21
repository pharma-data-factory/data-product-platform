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

export const developerHubModule = createFrontendModule({
  pluginId: 'app',
  extensions: [developerHubPage],
});
