import BuildIcon from '@material-ui/icons/Build';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const buildRouteRef = createRouteRef();

const buildPage = PageBlueprint.make({
  name: 'build',
  params: {
    path: '/build',
    routeRef: buildRouteRef,
    title: 'Build',
    icon: <BuildIcon />,
    loader: () => import('./BuildLandingPage').then(m => <m.BuildLandingPage />),
  },
});

export const buildModule = createFrontendModule({
  pluginId: 'app',
  extensions: [buildPage],
});
