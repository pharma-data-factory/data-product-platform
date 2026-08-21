import CategoryIcon from '@material-ui/icons/Category';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const platformComponentsRouteRef = createRouteRef();
const platformComponentDetailRouteRef = createRouteRef();

const platformComponentsPage = PageBlueprint.make({
  name: 'platform-components',
  params: {
    path: '/platform-components',
    routeRef: platformComponentsRouteRef,
    title: 'Platform Components',
    icon: <CategoryIcon />,
    loader: () =>
      import('./PlatformComponentsPage').then(m => <m.PlatformComponentsPage />),
  },
});

const platformComponentDetailPage = PageBlueprint.make({
  name: 'platform-component-detail',
  params: {
    path: '/platform-components/:name',
    routeRef: platformComponentDetailRouteRef,
    loader: () =>
      import('./PlatformComponentDetailPage').then(
        m => <m.PlatformComponentDetailPage />,
      ),
  },
});

export const platformComponentsModule = createFrontendModule({
  pluginId: 'app',
  extensions: [platformComponentsPage, platformComponentDetailPage],
});
