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
import {
  Button,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@material-ui/core';
import { usePlatformRole } from '@internal/plugin-data-products';
import {
  canManagePlatformUsers,
  resolvePlatformRole,
  PLATFORM_GROUPS,
  GROUP_TO_ROLE,
  ROLE_LABELS,
} from '@internal/platform-common';

const USER_KIND = 'User';

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

  const [newLogin, setNewLogin] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newGroups, setNewGroups] = useState<string[]>([]);

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

  const toggleMembership = async (user: Entity, group: string) => {
    const current = userMemberOf(user);
    const next = current.includes(group)
      ? current.filter(g => g !== group)
      : [...current, group];
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
        memberOf: newGroups,
      });
      setNewLogin('');
      setNewDisplayName('');
      setNewGroups([]);
      await load();
      setNotice(`Created user ${login}`);
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  };

  const toggleNewGroup = (group: string) => {
    setNewGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group],
    );
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
                  border: '1px solid #E2E8F0',
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
                </div>
                <div style={{ margin: '16px 0' }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Roles (groups)
                  </Typography>
                  {PLATFORM_GROUPS.map(group => (
                    <FormControlLabel
                      key={group}
                      control={
                        <Checkbox
                          checked={newGroups.includes(group)}
                          onChange={() => toggleNewGroup(group)}
                        />
                      }
                      label={`${group} (${ROLE_LABELS[GROUP_TO_ROLE[group]]})`}
                    />
                  ))}
                </div>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={saving}
                  onClick={createUser}
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
              {loading ? (
                <Progress />
              ) : users.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No users found.
                </Typography>
              ) : (
                users.map(user => {
                  const memberOf = userMemberOf(user);
                  const userRole = resolvePlatformRole(memberOf);
                  return (
                    <section
                      key={user.metadata.uid ?? user.metadata.name}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <Typography variant="subtitle1">
                          {user.metadata.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Role: {ROLE_LABELS[userRole]}
                        </Typography>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        {PLATFORM_GROUPS.map(group => (
                          <FormControlLabel
                            key={group}
                            control={
                              <Checkbox
                                checked={memberOf.includes(group)}
                                disabled={saving}
                                onChange={() => toggleMembership(user, group)}
                              />
                            }
                            label={group}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })
              )}

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
                      borderBottom: '1px solid #F1F5F9',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: '#64748B' }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <span style={{ fontWeight: 600 }}>{entry.actor}</span>
                    <span style={{ color: '#0D9488' }}>{entry.provider}</span>
                  </div>
                ))
              )}
            </>
          ) : null}

          {error ? <ErrorPanel error={error} /> : null}
        </div>
      </Content>
    </Page>
  );
}
