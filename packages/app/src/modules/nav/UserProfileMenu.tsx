import { useEffect, useState, type MouseEvent } from 'react';
import {
  Avatar,
  Button,
  Divider,
  Popover,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  sidebarConfig,
  useSidebarOpenState,
} from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import {
  ROLE_LABELS,
  githubLoginFromEntityRef,
  hasApprovedPlatformAccess,
  isGuestIdentity,
  platformGroupNames,
  resolvePlatformRole,
} from '@internal/platform-common';
import { C, PHARMA_NAVY, PHARMA_TEAL } from '../theme/tokens';
import { signOutToLanding } from '../identity/session';

const useStyles = makeStyles({
  trigger: {
    alignItems: 'center',
    background: 'transparent',
    border: 0,
    color: '#C5D0DC',
    cursor: 'pointer',
    display: 'flex',
    gap: 12,
    minHeight: 56,
    padding: '8px 16px 16px 22px',
    textAlign: 'left',
    width: '100%',
    '&:hover': {
      background: '#163154',
    },
  },
  triggerClosed: {
    justifyContent: 'center',
    paddingLeft: 0,
    paddingRight: 0,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  role: {
    color: PHARMA_TEAL,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  paper: {
    background: C.paper,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    minWidth: 280,
    padding: 16,
  },
  label: {
    color: C.muted,
    fontSize: 11,
    letterSpacing: '0.08em',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  value: {
    color: PHARMA_NAVY,
    fontSize: 13,
    marginTop: 2,
    wordBreak: 'break-all',
  },
  signOut: {
    marginTop: 16,
    textTransform: 'none',
    fontWeight: 600,
  },
  sidebarSignOut: {
    background: PHARMA_NAVY,
    borderRadius: 8,
    boxShadow: 'none',
    color: '#FFFFFF',
    fontWeight: 600,
    margin: '0 16px 16px',
    textTransform: 'none',
    width: 'calc(100% - 32px)',
    '&:hover': {
      background: '#163154',
      boxShadow: 'none',
    },
  },
  sidebarSignOutClosed: {
    minWidth: 40,
    margin: '0 8px 16px',
    padding: 8,
    width: 'auto',
  },
});

interface ProfileState {
  displayName: string;
  githubLogin?: string;
  userEntityRef: string;
  roleLabel: string;
  groups: string[];
  picture?: string;
}

export function UserProfileMenu() {
  const classes = useStyles();
  const { isOpen } = useSidebarOpenState();
  const identityApi = useApi(identityApiRef);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [profile, setProfile] = useState<ProfileState>();

  useEffect(() => {
    let active = true;
    Promise.all([
      identityApi.getBackstageIdentity(),
      identityApi.getProfileInfo().catch(
        (): { displayName?: string; picture?: string } => ({}),
      ),
    ])
      .then(([identity, info]) => {
        if (!active) {
          return;
        }
        const guest = isGuestIdentity(identity.userEntityRef);
        setProfile({
          displayName: info.displayName ?? identity.userEntityRef,
          githubLogin: guest
            ? undefined
            : githubLoginFromEntityRef(identity.userEntityRef),
          userEntityRef: identity.userEntityRef,
          roleLabel: hasApprovedPlatformAccess(identity.ownershipEntityRefs)
            ? ROLE_LABELS[resolvePlatformRole(identity.ownershipEntityRefs)]
            : 'Access not granted',
          groups: platformGroupNames(identity.ownershipEntityRefs),
          picture: info.picture,
        });
      })
      .catch(() => {
        if (active) {
          setProfile({
            displayName: 'Signed in',
            userEntityRef: 'user:default/unknown',
            roleLabel: 'Viewer',
            groups: [],
          });
        }
      });
    return () => {
      active = false;
    };
  }, [identityApi]);

  const openMenu = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSignOut = async () => {
    setAnchorEl(null);
    await signOutToLanding(identityApi);
  };

  return (
    <>
      <button
        type="button"
        className={[
          classes.trigger,
          isOpen ? undefined : classes.triggerClosed,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={openMenu}
        aria-label="Open user menu"
        style={{
          width: isOpen
            ? sidebarConfig.drawerWidthOpen
            : sidebarConfig.drawerWidthClosed,
        }}
      >
        <Avatar
          src={profile?.picture}
          alt={profile?.displayName ?? 'User'}
          style={{ width: 32, height: 32, background: PHARMA_TEAL }}
        >
          {(profile?.displayName ?? 'U').slice(0, 1).toUpperCase()}
        </Avatar>
        {isOpen && (
          <span>
            <span className={classes.name}>
              {profile?.displayName ?? 'Signed in'}
            </span>
            <br />
            <span className={classes.role}>
              {profile?.roleLabel ?? 'Viewer'}
            </span>
          </span>
        )}
      </button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ className: classes.paper }}
      >
        {profile && (
          <>
            <Typography className={classes.label}>Display Name</Typography>
            <Typography className={classes.value}>{profile.displayName}</Typography>
            <Typography className={classes.label}>GitHub login</Typography>
            <Typography className={classes.value}>
              {profile.githubLogin ?? 'Not a GitHub user identity'}
            </Typography>
            <Typography className={classes.label}>User identity</Typography>
            <Typography className={classes.value}>
              {profile.userEntityRef}
            </Typography>
            <Typography className={classes.label}>Effective role</Typography>
            <Typography className={classes.value}>{profile.roleLabel}</Typography>
            <Typography className={classes.label}>Groups</Typography>
            <Typography className={classes.value}>
              {profile.groups.length > 0 ? profile.groups.join(', ') : 'None'}
            </Typography>
            <Divider style={{ marginTop: 16 }} />
          </>
        )}
        <Button
          className={classes.signOut}
          color="primary"
          fullWidth
          variant="contained"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </Popover>
      <Button
        className={[
          classes.sidebarSignOut,
          isOpen ? undefined : classes.sidebarSignOutClosed,
        ]
          .filter(Boolean)
          .join(' ')}
        variant="contained"
        onClick={handleSignOut}
        aria-label="Sign Out"
      >
        {isOpen ? 'Sign Out' : <ExitToAppIcon />}
      </Button>
    </>
  );
}
