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
import BrightnessIcon from '@material-ui/icons/Brightness6';
import {
  PlatformRole,
  canAdministerPlatform,
  hasApprovedPlatformAccess,
  resolvePlatformRole,
} from '@internal/platform-common';
import { SidebarLogo } from './SidebarLogo';
import { UserProfileMenu } from './UserProfileMenu';
import { PlatformFooter } from './PlatformFooter';
import HomeIcon from '@material-ui/icons/Home';
import BuildIcon from '@material-ui/icons/Build';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import EmojiEventsIcon from '@material-ui/icons/EmojiEvents';
import CategoryIcon from '@material-ui/icons/Category';
import DeviceHubIcon from '@material-ui/icons/DeviceHub';
import FolderOpenIcon from '@material-ui/icons/FolderOpen';
import LayersIcon from '@material-ui/icons/Layers';
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
    <>
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

          {/*
            Grouped along the lifecycle a user actually follows:
            discover what exists → define what is needed → build it →
            operate it → validate it. Routes are unchanged; only the
            grouping and the labels moved.

            URS Composer used to sit under "Validate", which is where a
            user looking for requirements would never think to look:
            requirements come before building, validation after it.
          */}
          <SidebarItem icon={StorefrontIcon} to="/marketplace" text="Discover">
            <SidebarSubmenu title="Discover">
              <SidebarSubmenuItem
                icon={StorefrontIcon}
                to="/marketplace"
                title="Marketplace"
              />
              <SidebarSubmenuItem
                icon={ViewListIcon}
                to="/catalog"
                title="Catalog"
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
            </SidebarSubmenu>
          </SidebarItem>

          <SidebarItem icon={DescriptionIcon} to="/urs-composer" text="Define">
            <SidebarSubmenu title="Define">
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
              {/*
                Business master data the URS workflow consumes, not platform
                administration. Visibility stays admin-only exactly as before;
                writes remain gated by businessCapabilityManagePermission in
                the backend.
              */}
              {admin ? (
                <SidebarSubmenuItem
                  icon={CategoryIcon}
                  to="/urs-composer/capabilities"
                  title="Business Capabilities"
                />
              ) : null}
              {admin ? (
                <SidebarSubmenuItem
                  icon={AssignmentTurnedInIcon}
                  to="/urs-composer/business-roles"
                  title="Business Roles"
                />
              ) : null}
            </SidebarSubmenu>
          </SidebarItem>

          <SidebarItem icon={BuildIcon} to="/build" text="Build">
            <SidebarSubmenu title="Build">
              <SidebarSubmenuItem
                icon={AddCircleIcon}
                to="/create"
                title="Start Building"
              />
              <SidebarSubmenuItem
                icon={DeviceHubIcon}
                to="/compose"
                title="Composer"
                subtitle="Advanced"
              />
              {/*
                The end of the Build journey. /products holds the release
                governance — versions, requirements, the release gate — and
                until NXD-056 it could not be navigated to at all.
              */}
              <SidebarSubmenuItem
                icon={LayersIcon}
                to="/products"
                title="Products"
              />
            </SidebarSubmenu>
          </SidebarItem>

          <SidebarItem icon={FolderOpenIcon} to="/my-products" text="Operate">
            <SidebarSubmenu title="Operate">
              <SidebarSubmenuItem
                icon={FolderOpenIcon}
                to="/my-products"
                title="My Products"
              />
              <SidebarSubmenuItem
                icon={StorageIcon}
                to="/data-products"
                title="Data Products"
              />
            </SidebarSubmenu>
          </SidebarItem>

          <SidebarItem
            icon={CheckCircleIcon}
            to="/validate"
            text="Validate"
          >
            <SidebarSubmenu title="Validate">
              <SidebarSubmenuItem
                icon={AssignmentTurnedInIcon}
                to="/validation-expert"
                title="Validation Expert"
              />
            </SidebarSubmenu>
          </SidebarItem>

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
                  icon={VerifiedUserIcon}
                  to="/admin/entitlements"
                  title="Entitlements"
                />
                <SidebarSubmenuItem
                  icon={StoreIcon}
                  to="/admin/marketplace-integration"
                  title="Marketplace Integration"
                />
              </SidebarSubmenu>
            </SidebarItem>
          ) : null}

          {/* Reference material, not administration. */}
          {admin ? (
            <SidebarItem icon={ExtensionIcon} to="/admin/platform-architecture" text="Platform">
              <SidebarSubmenu title="Platform">
                <SidebarSubmenuItem
                  icon={BuildIcon}
                  to="/admin/platform-architecture"
                  title="Architecture"
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
              {/*
                Backstage's own settings page. Appearance there switches
                between the nexora-light and nexora-dark themes; both are
                registered in modules/theme but had no entry point.
              */}
              <SidebarSubmenuItem
                icon={BrightnessIcon}
                to="/settings"
                title="Appearance"
              />
            </SidebarSubmenu>
          </SidebarItem>
        </>
      )}
      <UserProfileMenu />
    </Sidebar>
    <PlatformFooter />
  </>
  );
}
