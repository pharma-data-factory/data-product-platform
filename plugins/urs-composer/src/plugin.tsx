import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import DescriptionIcon from '@material-ui/icons/Description';
import {
  createRouteRef_,
  editRouteRef,
  libraryRouteRef,
  requirementSetRouteRef,
  rootRouteRef,
} from './routes';

const overviewPage = PageBlueprint.make({
  params: {
    path: '/urs',
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
    path: '/urs/library',
    routeRef: libraryRouteRef,
    loader: () =>
      import('./pages/URSLibraryPage').then(m => <m.URSLibraryPage />),
  },
});

const createPage = PageBlueprint.make({
  name: 'create',
  params: {
    path: '/urs/new',
    routeRef: createRouteRef_,
    loader: () =>
      import('./pages/CreateURSWizardPage').then(m => <m.CreateURSWizardPage />),
  },
});

const editPage = PageBlueprint.make({
  name: 'edit',
  params: {
    path: '/urs/:id/edit',
    routeRef: editRouteRef,
    loader: () =>
      import('./pages/CreateURSWizardPage').then(m => <m.EditURSWizardPage />),
  },
});

const detailPage = PageBlueprint.make({
  name: 'detail',
  params: {
    path: '/urs/:id',
    routeRef: requirementSetRouteRef,
    loader: () =>
      import('./pages/URSRequirementSetPage').then(m => <m.URSRequirementSetPage />),
  },
});

export const ursComposerPlugin = createFrontendPlugin({
  pluginId: 'urs-composer',
  extensions: [overviewPage, libraryPage, createPage, editPage, detailPage],
  routes: {
    root: rootRouteRef,
    library: libraryRouteRef,
    create: createRouteRef_,
    edit: editRouteRef,
    requirementSet: requirementSetRouteRef,
  },
});
