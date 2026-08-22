import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import PrecisionManufacturingIcon from '@material-ui/icons/SettingsInputComponent';
import { detailRouteRef, rootRouteRef } from './routes';

const equipmentPage = PageBlueprint.make({
  params: {
    path: '/equipment',
    routeRef: rootRouteRef,
    title: 'Equipment',
    icon: <PrecisionManufacturingIcon />,
    loader: () =>
      import('./components/EquipmentPage').then(m => <m.EquipmentPage />),
  },
});

const equipmentDetailPage = PageBlueprint.make({
  name: 'detail',
  params: {
    path: '/equipment/:name',
    routeRef: detailRouteRef,
    loader: () =>
      import('./components/EquipmentDetailPage').then(m => (
        <m.EquipmentDetailPage />
      )),
  },
});

export const nexoraAssetsPlugin = createFrontendPlugin({
  pluginId: 'nexora-assets',
  extensions: [equipmentPage, equipmentDetailPage],
  routes: {
    root: rootRouteRef,
    detail: detailRouteRef,
  },
});
