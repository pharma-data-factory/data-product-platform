import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const validateRouteRef = createRouteRef();

const validatePage = PageBlueprint.make({
  name: 'validate',
  params: {
    path: '/validate',
    routeRef: validateRouteRef,
    title: 'Validate',
    icon: <CheckCircleIcon />,
    loader: () =>
      import('./ValidateLandingPage').then(m => <m.ValidateLandingPage />),
  },
});

export const validateModule = createFrontendModule({
  pluginId: 'app',
  extensions: [validatePage],
});
