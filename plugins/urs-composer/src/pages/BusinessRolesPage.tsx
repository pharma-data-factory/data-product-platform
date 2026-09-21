import { useEffect, useState } from 'react';
import {
  Content,
  Header,
  Page,
  Progress,
  ErrorPanel,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Button,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@material-ui/core';
import { ursComposerApiRef } from '../api/ursComposerApi';
import type { BusinessRole } from '../api/types';
import {
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

export function BusinessRolesPage() {
  const api = useApi(ursComposerApiRef);

  const [roles, setRoles] = useState<BusinessRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [confirmRetireId, setConfirmRetireId] = useState<string | null>(null);
  const [confirmRetireName, setConfirmRetireName] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listBusinessRoles();
      setRoles(Array.isArray(result) ? result : result.items ?? []);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const createRole = async () => {
    if (!name.trim()) {
      setNotice('Name is required');
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await api.createBusinessRole({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      await load();
      setNotice('Business role created');
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  };

  const requestRetireRole = (role: BusinessRole) => {
    setConfirmRetireId(role.id);
    setConfirmRetireName(role.name);
  };

  const confirmRetireRole = async () => {
    if (!confirmRetireId) {
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await api.retireBusinessRole(confirmRetireId);
      await load();
      setNotice(`Retired ${confirmRetireName}`);
      setConfirmRetireId(null);
      setConfirmRetireName('');
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (role: BusinessRole) => {
    setEditingId(role.id);
    setEditName(role.name);
    setEditDescription(role.description ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      setNotice('Name is required');
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await api.updateBusinessRole(id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setEditingId(null);
      await load();
      setNotice('Business role updated');
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page themeId="service">
      <Header
        title="Business Roles"
        subtitle="Define the roles that execute a business capability"
      />
      <Content>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 0' }}>
          <section
            style={{
              border: `1px solid ${NEXORA_GREY[200]}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 32,
            }}
          >
            <Typography variant="h6" style={{ marginBottom: 16 }}>
              Create business role
            </Typography>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <TextField
                label="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Weighing Operator"
                style={{ minWidth: 260 }}
              />
              <TextField
                label="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ minWidth: 320 }}
              />
            </div>
            <Button
              variant="contained"
              color="primary"
              disabled={saving}
              onClick={createRole}
              style={{ marginTop: 16 }}
            >
              Create role
            </Button>
          </section>

          {notice ? (
            <Typography variant="body2" style={{ marginBottom: 16 }}>
              {notice}
            </Typography>
          ) : null}

          <Typography variant="h6" style={{ marginBottom: 16 }}>
            Roles
          </Typography>
          {loading && <Progress />}
          {!loading && roles.length === 0 && (
            <Typography variant="body2" color="textSecondary">
              No roles found.
            </Typography>
          )}
          {!loading &&
            roles.length > 0 &&
            roles.map(role => {
              const isEditing = editingId === role.id;
              return (
                <section
                  key={role.id}
                  style={{
                    border: `1px solid ${NEXORA_GREY[200]}`,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  {isEditing ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <TextField
                        label="Name"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ minWidth: 260 }}
                      />
                      <TextField
                        label="Description"
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          disabled={saving}
                          onClick={() => saveEdit(role.id)}
                        >
                          Save
                        </Button>
                        <Button size="small" disabled={saving} onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div>
                        <Typography variant="subtitle1">{role.name}</Typography>
                        {role.description ? (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            style={{ marginTop: 6 }}
                          >
                            {role.description}
                          </Typography>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={saving}
                          onClick={() => startEdit(role)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          size="small"
                          disabled={saving}
                          onClick={() => requestRetireRole(role)}
                        >
                          Retire
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}

          <Dialog
            open={confirmRetireId !== null}
            onClose={() => {
              setConfirmRetireId(null);
              setConfirmRetireName('');
            }}
          >
            <DialogTitle>Retire business role?</DialogTitle>
            <DialogContent>
              <Typography variant="body2">
                Retire business role &quot;{confirmRetireName}&quot;? It will no longer be
                selectable.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setConfirmRetireId(null);
                  setConfirmRetireName('');
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                color="secondary"
                variant="contained"
                onClick={confirmRetireRole}
                disabled={saving}
              >
                Retire
              </Button>
            </DialogActions>
          </Dialog>

          {error ? <ErrorPanel error={error} /> : null}
        </div>
      </Content>
    </Page>
  );
}
