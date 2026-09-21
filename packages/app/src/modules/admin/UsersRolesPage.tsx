import { useEffect, useState } from 'react';
import {
  Content,
  Header,
  Page,
  Progress,
  ErrorPanel,
} from '@backstage/core-components';
import {
  useApi,
  fetchApiRef,
  discoveryApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import type { Entity } from '@backstage/catalog-model';
import { Button, TextField, Typography, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';
import { usePlatformRole } from '@internal/plugin-data-products';
import {
  canManagePlatformUsers,
  resolvePlatformRole,
  PLATFORM_GROUPS,
  GROUP_TO_ROLE,
  ROLE_LABELS,
} from '@internal/platform-common';
import type { PlatformRole } from '@internal/platform-common';
import { NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';

const USER_KIND = 'User';
const BLOCKED = '__blocked__';

const ROLE_OPTIONS = PLATFORM_GROUPS.map(group => ({
  group,
  label: ROLE_LABELS[GROUP_TO_ROLE[group]],
}));

function groupForRole(role: PlatformRole): string {
  const match = PLATFORM_GROUPS.find(group => GROUP_TO_ROLE[group] === role);
  return match ?? 'platform-viewers';
}

function isBlocked(memberOf: string[]): boolean {
  return !memberOf.some(group =>
    PLATFORM_GROUPS.includes(group as (typeof PLATFORM_GROUPS)[number]),
  );
}

function userMemberOf(user: Entity): string[] {
  const memberOf = (user.spec as { memberOf?: string[] } | undefined)?.memberOf;
  return Array.isArray(memberOf) ? memberOf : [];
}

export function UsersRolesPage() {
  const { role } = usePlatformRole();
  const catalogApi = useApi(catalogApiRef);
  const fetchApi = useApi(fetchApiRef);
  const discovery = useApi(discoveryApiRef);
  const identityApi = useApi(identityApiRef);

  const [users, setUsers] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null);

  const [newLogin, setNewLogin] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRoleGroup, setNewRoleGroup] = useState('platform-viewers');

  const admin = canManagePlatformUsers(role);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await catalogApi.getEntities({ filter: { kind: USER_KIND } });
      setUsers(res.items);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogApi]);

  const apiCall = async (method: string, path: string, body?: unknown) => {
    const baseUrl = await discovery.getBaseUrl('users');
    const { token } = await identityApi.getCredentials();
    const response = await fetchApi.fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return response.json();
  };

  const [signIns, setSignIns] = useState<
    Array<{ timestamp: string; actor: string; provider: string }>
  >([]);

  const loadSignIns = async () => {
    try {
      setSignIns(
        (await apiCall('GET', '/signins')) as Array<{
          timestamp: string;
          actor: string;
          provider: string;
        }>,
      );
    } catch {
      setSignIns([]);
    }
  };

  useEffect(() => {
    if (admin) {
      loadSignIns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  const setUserRole = async (user: Entity, value: string) => {
    const nonPlatform = userMemberOf(user).filter(
      g => !PLATFORM_GROUPS.includes(g as (typeof PLATFORM_GROUPS)[number]),
    );
    const next = value === BLOCKED ? nonPlatform : [value, ...nonPlatform];
    setSaving(true);
    setNotice(null);
    try {
      await apiCall('PUT', `/${user.metadata.name}`, { memberOf: next });
      await load();
      setNotice(`Updated ${user.metadata.name}`);
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (user: Entity) => {
    setDeleteTarget(user);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setNotice(null);
    try {
      await apiCall('DELETE', `/${deleteTarget.metadata.name}`);
      await load();
      setNotice(`Deleted ${deleteTarget.metadata.name}`);
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  const createUser = async () => {
    const login = newLogin.trim().toLowerCase();
    if (!login) {
      setNotice('GitHub login is required');
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await apiCall('POST', '/', {
        login,
        displayName: newDisplayName.trim() || login,
        memberOf: [newRoleGroup],
      });
      setNewLogin('');
      setNewDisplayName('');
      setNewRoleGroup('platform-viewers');
      await load();
      setNotice(`Created user ${login}`);
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page themeId="service">
      <Header
        title="Users & Roles"
        subtitle="Manage Catalog users and their role assignment (groups)"
      />
      <Content>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 0' }}>
          {!admin ? (
            <Typography variant="body1">
              You do not have permission to manage users and roles.
            </Typography>
          ) : null}

          {admin ? (
            <>
              <section
                style={{
                  border: `1px solid ${NEXORA_GREY[200]}`,
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 32,
                }}
              >
                <Typography variant="h6" style={{ marginBottom: 16 }}>
                  Create user
                </Typography>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <TextField
                    label="GitHub login"
                    value={newLogin}
                    onChange={e => setNewLogin(e.target.value)}
                    placeholder="e.g. jdoe"
                    style={{ minWidth: 200 }}
                  />
                  <TextField
                    label="Display name"
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                    style={{ minWidth: 240 }}
                  />
                  <TextField
                    select
                    label="Role"
                    value={newRoleGroup}
                    onChange={e => setNewRoleGroup(e.target.value)}
                    style={{ minWidth: 240 }}
                  >
                    {ROLE_OPTIONS.map(option => (
                      <MenuItem key={option.group} value={option.group}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </div>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={saving}
                  onClick={createUser}
                  style={{ marginTop: 16 }}
                >
                  Create user
                </Button>
              </section>

              {notice ? (
                <Typography variant="body2" style={{ marginBottom: 16 }}>
                  {notice}
                </Typography>
              ) : null}

              <Typography variant="h6" style={{ marginBottom: 16 }}>
                Users
              </Typography>
              {loading && <Progress />}
              {!loading && users.length === 0 && (
                <Typography variant="body2" color="textSecondary">
                  No users found.
                </Typography>
              )}
              {!loading &&
                users.length > 0 &&
                users.map(user => {
                  const memberOf = userMemberOf(user);
                  const userRole = resolvePlatformRole(memberOf);
                  const roleValue = isBlocked(memberOf)
                    ? BLOCKED
                    : groupForRole(userRole);
                  return (
                    <section
                      key={user.metadata.uid ?? user.metadata.name}
                      style={{
                        border: `1px solid ${NEXORA_GREY[200]}`,
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <Typography variant="subtitle1">
                          {user.metadata.name}
                        </Typography>
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <TextField
                            select
                            label="Role"
                            value={roleValue}
                            onChange={e => setUserRole(user, e.target.value)}
                            disabled={saving}
                            style={{ minWidth: 240 }}
                          >
                            {ROLE_OPTIONS.map(option => (
                              <MenuItem key={option.group} value={option.group}>
                                {option.label}
                              </MenuItem>
                            ))}
                            <MenuItem value={BLOCKED}>Blocked (no access)</MenuItem>
                          </TextField>
                          <Button
                            variant="outlined"
                            color="secondary"
                            disabled={saving}
                            onClick={() => confirmDelete(user)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </section>
                  );
                })}

              <Typography variant="h6" style={{ margin: '24px 0 12px' }}>
                Sign-ins
              </Typography>
              {signIns.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No sign-ins recorded yet.
                </Typography>
              ) : (
                signIns.slice(0, 20).map((entry, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: 16,
                      padding: '8px 0',
                      borderBottom: `1px solid ${NEXORA_GREY[100]}`,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: NEXORA_GREY[500] }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <span style={{ fontWeight: 600 }}>{entry.actor}</span>
                    <span style={{ color: NEXORA_TONE.success.text }}>{entry.provider}</span>
                  </div>
                ))
              )}
            </>
          ) : null}

          {error ? <ErrorPanel error={error} /> : null}
        </div>
      </Content>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="sm">
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user <strong>{deleteTarget?.metadata.name}</strong>?
            This removes them from the platform catalog and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
          {/*
            Destructive and irreversible, so it carries the danger tone. It
            used to be color="secondary", which this theme renders in brand
            cyan — the same colour that signals "in progress" elsewhere, and
            unreadable under white text at 2.16:1.
          */}
          <Button
            variant="contained"
            onClick={executeDelete}
            disabled={saving}
            style={{
              backgroundColor: NEXORA_TONE.danger.bg,
              color: NEXORA_TONE.danger.fg,
            }}
          >
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
