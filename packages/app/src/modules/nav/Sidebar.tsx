import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarSpace,
  SidebarSubmenu,
  SidebarSubmenuItem,
} from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { NotificationsSidebarItem } from '@backstage/plugin-notifications';
import SearchIcon from '@material-ui/icons/Search';
import SettingsIcon from '@material-ui/icons/Settings';
import {
  PlatformRole,
  canAdministerPlatform,
  hasApprovedPlatformAccess,
  resolvePlatformRole,
} from '@internal/platform-common';
import { SidebarLogo } from './SidebarLogo';
import { UserProfileMenu } from './UserProfileMenu';
import HomeIcon from '@material-ui/icons/Home';
import BuildIcon from '@material-ui/icons/Build';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import EmojiEventsIcon from '@material-ui/icons/EmojiEvents';
import CategoryIcon from '@material-ui/icons/Category';
import DeviceHubIcon from '@material-ui/icons/DeviceHub';
import FolderOpenIcon from '@material-ui/icons/FolderOpen';
import StorageIcon from '@material-ui/icons/Storage';
import ViewListIcon from '@material-ui/icons/ViewList';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import DescriptionIcon from '@material-ui/icons/Description';
import StorefrontIcon from '@material-ui/icons/Storefront';
import BusinessIcon from '@material-ui/icons/Business';
import ExtensionIcon from '@material-ui/icons/Extension';
import AdminIcon from '@material-ui/icons/Security';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import GroupIcon from '@material-ui/icons/Group';
import AssignmentTurnedInIcon from '@material-ui/icons/AssignmentTurnedIn';
import StoreIcon from '@material-ui/icons/Store';

export const SidebarContent = NavContentBlueprint.make({
  params: {
    component: PlatformSidebar,
  },
});

function PlatformSidebar() {
  const identityApi = useApi(identityApiRef);
  const [role, setRole] = useState<PlatformRole>('VIEWER');
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setRole(resolvePlatformRole(identity.ownershipEntityRefs));
      setHasAccess(hasApprovedPlatformAccess(identity.ownershipEntityRefs));
    });
  }, [identityApi]);

  const admin = canAdministerPlatform(role);

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
        <>
          <SidebarItem icon={HomeIcon} to="/" text="Home" />

          <SidebarItem icon={BuildIcon} to="/build" text="Build">
            <SidebarSubmenu title="Build">
              <SidebarSubmenuItem
                icon={AddCircleIcon}
                to="/create"
                title="Start Building"
              />
              <SidebarSubmenuItem
                icon={EmojiEventsIcon}
                to="/releases"
                title="Golden Paths"
              />
              <SidebarSubmenuItem
                icon={CategoryIcon}
                to="/platform-components"
                title="Components"
              />
              <SidebarSubmenuItem
                icon={DeviceHubIcon}
                to="/compose"
                title="Composer"
                subtitle="Advanced"
              />
            </SidebarSubmenu>
          </SidebarItem>

          <SidebarItem icon={FolderOpenIcon} to="/my-products" text="My Products">
            <SidebarSubmenu title="My Products">
              <SidebarSubmenuItem
                icon={StorageIcon}
                to="/data-products"
                title="Data Products"
              />
              <SidebarSubmenuItem
                icon={ViewListIcon}
                to="/catalog"
                title="Catalog"
              />
            </SidebarSubmenu>
          </SidebarItem>

          <SidebarItem icon={CheckCircleIcon} to="/validate" text="Validate">
            <SidebarSubmenu title="Validate">
              <SidebarSubmenuItem
                icon={DescriptionIcon}
                to="/urs-composer"
                title="URS Composer"
              />
              <SidebarSubmenuItem
                icon={ViewListIcon}
                to="/urs-composer/library"
                title="URS Library"
              />
              <SidebarSubmenuItem
                icon={AssignmentTurnedInIcon}
                to="/validation-expert"
                title="Validation Expert"
              />
            </SidebarSubmenu>
          </SidebarItem>

          <SidebarItem icon={StorefrontIcon} to="/marketplace" text="Marketplace" />
          <SidebarItem icon={BusinessIcon} to="/model-company" text="Model Company" />

          {admin ? (
            <SidebarItem icon={AdminIcon} to="/admin" text="Admin">
              <SidebarSubmenu title="Admin">
                <SidebarSubmenuItem
                  icon={GroupIcon}
                  to="/admin/users"
                  title="Users & Roles"
                />
                <SidebarSubmenuItem
                  icon={CategoryIcon}
                  to="/urs-composer/capabilities"
                  title="Business Capabilities"
                />
                <SidebarSubmenuItem
                  icon={AssignmentTurnedInIcon}
                  to="/urs-composer/business-roles"
                  title="Business Roles"
                />
                <SidebarSubmenuItem
                  icon={VerifiedUserIcon}
                  to="/admin/entitlements"
                  title="Entitlements"
                />
                <SidebarSubmenuItem
                  icon={StoreIcon}
                  to="/admin/marketplace-integration"
                  title="Marketplace Integration"
                />
                <SidebarSubmenuItem
                  icon={BuildIcon}
                  to="/admin/platform-architecture"
                  title="Platform Architecture"
                />
                <SidebarSubmenuItem
                  icon={ExtensionIcon}
                  to="/plugin-directory"
                  title="Plugin Directory"
                />
              </SidebarSubmenu>
            </SidebarItem>
          ) : null}
        </>
      )}
      <SidebarSpace />
      {hasAccess && (
        <>
          <SidebarDivider />
          <NotificationsSidebarItem />
          <SidebarDivider />
          <SidebarItem icon={SettingsIcon} to="/access" text="Settings">
            <SidebarSubmenu title="Settings">
              <SidebarSubmenuItem
                icon={VerifiedUserIcon}
                to="/access"
                title="My Access"
              />
            </SidebarSubmenu>
          </SidebarItem>
        </>
      )}
      <UserProfileMenu />
    </Sidebar>
  );
}
