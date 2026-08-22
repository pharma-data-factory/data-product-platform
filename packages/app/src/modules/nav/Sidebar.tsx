import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarScrollWrapper,
  SidebarSpace,
} from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import {
  NavContentBlueprint,
  NavContentComponentProps,
} from '@backstage/plugin-app-react';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { NotificationsSidebarItem } from '@backstage/plugin-notifications';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import SettingsIcon from '@material-ui/icons/Settings';
import {
  PlatformRole,
  canExecuteScaffolder,
  hasApprovedPlatformAccess,
  resolvePlatformRole,
} from '@internal/platform-common';
import { SidebarLogo } from './SidebarLogo';
import { UserProfileMenu } from './UserProfileMenu';

export const SidebarContent = NavContentBlueprint.make({
  params: {
    component: PlatformSidebar,
  },
});

function PlatformSidebar({ navItems }: NavContentComponentProps) {
  const identityApi = useApi(identityApiRef);
  const [role, setRole] = useState<PlatformRole>('VIEWER');
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setRole(resolvePlatformRole(identity.ownershipEntityRefs));
      setHasAccess(hasApprovedPlatformAccess(identity.ownershipEntityRefs));
    });
  }, [identityApi]);

  const nav = navItems.withComponent(item => (
    <SidebarItem icon={() => item.icon} to={item.href} text={item.title} />
  ));

  nav.take('page:search');
  nav.take('page:notifications');
  nav.take('page:app-visualizer');
  const createItem = nav.take('page:scaffolder');

  return (
    <Sidebar>
      <SidebarLogo />
      {hasAccess && (
        <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
          <SidebarSearchModal />
        </SidebarGroup>
      )}
      {hasAccess && <SidebarDivider />}
      {hasAccess && (
        <SidebarGroup label="Menu" icon={<MenuIcon />}>
          {nav.take('page:app/home')}
          {nav.take('page:app/developer')}
          {nav.take('page:catalog')}
          {nav.take('page:marketplace')}
          {nav.take('page:app/releases')}
          {nav.take('page:app/platform-components')}
          {nav.take('page:app/compose')}
          {nav.take('page:app/assets')}
          {nav.take('page:nexora-assets')}
          {nav.take('page:nexora-assets/detail')}
          {nav.take('page:data-products')}
          {nav.take('page:nexora-contracts')}
          {nav.take('page:nexora-contracts/detail')}
          {nav.take('page:nexora-quality')}
          {nav.take('page:nexora-quality/detail')}
          {nav.take('page:app/my-access')}
          {canExecuteScaffolder(role) ? createItem : null}
          <SidebarDivider />
          <SidebarScrollWrapper>
            {nav.rest({ sortBy: 'title' })}
          </SidebarScrollWrapper>
        </SidebarGroup>
      )}
      <SidebarSpace />
      {hasAccess && (
        <>
          <SidebarDivider />
          <NotificationsSidebarItem />
          <SidebarDivider />
          <SidebarGroup label="Settings" icon={<SettingsIcon />} to="/settings">
            {nav.take('page:user-settings')}
          </SidebarGroup>
        </>
      )}
      <UserProfileMenu />
    </Sidebar>
  );
}
