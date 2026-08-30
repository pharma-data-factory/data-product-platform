import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import DescriptionIcon from '@material-ui/icons/Description';
import { URSComposerApi, ursComposerApiRef } from './api/ursComposerApi';
import {
  createRouteRef_,
  editRouteRef,
  libraryRouteRef,
  requirementSetRouteRef,
  rootRouteRef,
} from './routes';

const ursComposerApi = ApiBlueprint.make({
  name: 'service',
  params: defineParams =>
    defineParams({
      api: ursComposerApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new URSComposerApi({ discoveryApi, fetchApi }),
    }),
});

const overviewPage = PageBlueprint.make({
  params: {
    path: '/urs-composer',
    routeRef: rootRouteRef,
    title: 'URS Composer',
    icon: <DescriptionIcon />,
    loader: () =>
      import('./pages/URSComposerPage').then(m => <m.URSComposerPage />),
  },
});

const libraryPage = PageBlueprint.make({
  name: 'library',
  params: {
    path: '/urs-composer/library',
    routeRef: libraryRouteRef,
    loader: () =>
      import('./pages/URSLibraryPage').then(m => <m.URSLibraryPage />),
  },
});

const createPage = PageBlueprint.make({
  name: 'create',
  params: {
    path: '/urs-composer/new',
    routeRef: createRouteRef_,
    loader: () =>
      import('./pages/CreateURSWizardPage').then(m => <m.CreateURSWizardPage />),
  },
});

const editPage = PageBlueprint.make({
  name: 'edit',
  params: {
    path: '/urs-composer/:id/edit',
    routeRef: editRouteRef,
    loader: () =>
      import('./pages/CreateURSWizardPage').then(m => <m.EditURSWizardPage />),
  },
});

const detailPage = PageBlueprint.make({
  name: 'detail',
  params: {
    path: '/urs-composer/:id',
    routeRef: requirementSetRouteRef,
    loader: () =>
      import('./pages/URSRequirementSetPage').then(m => <m.URSRequirementSetPage />),
  },
});

export const ursComposerPlugin = createFrontendPlugin({
  pluginId: 'urs-composer',
  extensions: [
    ursComposerApi,
    overviewPage,
    libraryPage,
    createPage,
    editPage,
    detailPage,
  ],
  routes: {
    root: rootRouteRef,
    library: libraryRouteRef,
    create: createRouteRef_,
    edit: editRouteRef,
    requirementSet: requirementSetRouteRef,
  },
});
