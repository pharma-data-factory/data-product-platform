import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const adminRouteRef = createRouteRef();
const usersRolesRouteRef = createRouteRef();

const adminPage = PageBlueprint.make({
  name: 'admin',
  params: {
    path: '/admin',
    routeRef: adminRouteRef,
    title: 'Admin',
    icon: <VerifiedUserIcon />,
    loader: () => import('./AdminLandingPage').then(m => <m.AdminLandingPage />),
  },
});

const usersRolesPage = PageBlueprint.make({
  name: 'users-roles',
  params: {
    path: '/admin/users',
    routeRef: usersRolesRouteRef,
    loader: () => import('./UsersRolesPage').then(m => <m.UsersRolesPage />),
  },
});

export const adminModule = createFrontendModule({
  pluginId: 'app',
  extensions: [adminPage, usersRolesPage],
});
