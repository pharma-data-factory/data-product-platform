import DeviceHubIcon from '@material-ui/icons/DeviceHub';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const composeRouteRef = createRouteRef();

const composePage = PageBlueprint.make({
  name: 'compose',
  params: {
    path: '/compose',
    routeRef: composeRouteRef,
    title: 'Compose',
    icon: <DeviceHubIcon />,
    loader: () => import('./ComposePage').then(m => <m.ComposePage />),
  },
});

export const composerModule = createFrontendModule({
  pluginId: 'app',
  extensions: [composePage],
});
