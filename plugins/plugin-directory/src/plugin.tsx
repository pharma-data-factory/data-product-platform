import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import ExtensionIcon from '@material-ui/icons/Extension';
import { PluginDirectoryClient, pluginDirectoryApiRef } from './api';
import { detailRouteRef, rootRouteRef } from './routes';

const pluginDirectoryApi = ApiBlueprint.make({
  name: 'service',
  params: defineParams =>
    defineParams({
      api: pluginDirectoryApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new PluginDirectoryClient({ discoveryApi, fetchApi }),
    }),
});

const directoryPage = PageBlueprint.make({
  params: {
    path: '/plugin-directory',
    routeRef: rootRouteRef,
    title: 'Plugin Directory',
    icon: <ExtensionIcon />,
    loader: () =>
      import('./components/PluginDirectoryPage').then(m => (
        <m.PluginDirectoryPage />
      )),
  },
});

const detailPage = PageBlueprint.make({
  name: 'detail',
  params: {
    path: '/plugin-directory/:pluginId',
    routeRef: detailRouteRef,
    loader: () =>
      import('./components/PluginDetailPage').then(m => <m.PluginDetailPage />),
  },
});

export const pluginDirectoryPlugin = createFrontendPlugin({
  pluginId: 'plugin-directory',
  extensions: [pluginDirectoryApi, directoryPage, detailPage],
  routes: {
    root: rootRouteRef,
    detail: detailRouteRef,
  },
});
