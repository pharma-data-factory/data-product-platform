import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import AssignmentIcon from '@material-ui/icons/Assignment';
import { detailRouteRef, rootRouteRef } from './routes';

const contractsPage = PageBlueprint.make({
  params: {
    path: '/contracts',
    routeRef: rootRouteRef,
    title: 'Contracts',
    icon: <AssignmentIcon />,
    loader: () =>
      import('./components/ContractExplorerPage').then(m => (
        <m.ContractExplorerPage />
      )),
  },
});

const contractDetailPage = PageBlueprint.make({
  name: 'detail',
  params: {
    path: '/contracts/:name',
    routeRef: detailRouteRef,
    loader: () =>
      import('./components/ProductContractPage').then(m => (
        <m.ProductContractPage />
      )),
  },
});

export const nexoraContractsPlugin = createFrontendPlugin({
  pluginId: 'nexora-contracts',
  extensions: [contractsPage, contractDetailPage],
  routes: {
    root: rootRouteRef,
    detail: detailRouteRef,
  },
});
