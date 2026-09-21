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
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@material-ui/core';
import { ursComposerApiRef } from '../api/ursComposerApi';
import type { BusinessCapability } from '../api/types';
import {
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

const DOMAINS = ['make', 'quality', 'supply', 'analytics'];

export function BusinessCapabilitiesPage() {
  const api = useApi(ursComposerApiRef);

  const [capabilities, setCapabilities] = useState<BusinessCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('make');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDomain, setEditDomain] = useState('make');
  const [confirmRetireId, setConfirmRetireId] = useState<string | null>(null);
  const [confirmRetireName, setConfirmRetireName] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listCapabilities();
      setCapabilities(Array.isArray(result) ? result : result.items ?? []);
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

  const createCapability = async () => {
    if (!name.trim() || !domain.trim()) {
      setNotice('Name and domain are required');
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await api.createBusinessCapability({
        name: name.trim(),
        description: description.trim() || undefined,
        domain: domain.trim(),
      });
      setName('');
      setDescription('');
      setDomain('make');
      await load();
      setNotice('Business capability created');
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  };

  const requestRetireCapability = (capability: BusinessCapability) => {
    setConfirmRetireId(capability.id);
    setConfirmRetireName(capability.name);
  };

  const confirmRetireCapability = async () => {
    if (!confirmRetireId) {
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await api.retireBusinessCapability(confirmRetireId);
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

  const startEdit = (capability: BusinessCapability) => {
    setEditingId(capability.id);
    setEditName(capability.name);
    setEditDescription(capability.description ?? '');
    setEditDomain(capability.domain);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim() || !editDomain.trim()) {
      setNotice('Name and domain are required');
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await api.updateBusinessCapability(id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        domain: editDomain.trim(),
      });
      setEditingId(null);
      await load();
      setNotice('Business capability updated');
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page themeId="service">
      <Header
        title="Business Capabilities"
        subtitle="Define the capabilities that anchor requirements to business outcomes"
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
              Create business capability
            </Typography>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <TextField
                label="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Weighing & Dispensing"
                style={{ minWidth: 260 }}
              />
              <TextField
                label="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ minWidth: 320 }}
              />
              <TextField
                select
                label="Domain"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                style={{ minWidth: 160 }}
              >
                {DOMAINS.map(d => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </div>
            <Button
              variant="contained"
              color="primary"
              disabled={saving}
              onClick={createCapability}
              style={{ marginTop: 16 }}
            >
              Create capability
            </Button>
          </section>

          {notice ? (
            <Typography variant="body2" style={{ marginBottom: 16 }}>
              {notice}
            </Typography>
          ) : null}

          <Typography variant="h6" style={{ marginBottom: 16 }}>
            Capabilities
          </Typography>
          {loading && <Progress />}
          {!loading && capabilities.length === 0 && (
            <Typography variant="body2" color="textSecondary">
              No capabilities found.
            </Typography>
          )}
          {!loading &&
            capabilities.length > 0 &&
            capabilities.map(capability => {
              const isEditing = editingId === capability.id;
              return (
                <section
                  key={capability.id}
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
                      <TextField
                        select
                        label="Domain"
                        value={editDomain}
                        onChange={e => setEditDomain(e.target.value)}
                        style={{ maxWidth: 200 }}
                      >
                        {DOMAINS.map(d => (
                          <MenuItem key={d} value={d}>
                            {d}
                          </MenuItem>
                        ))}
                      </TextField>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          disabled={saving}
                          onClick={() => saveEdit(capability.id)}
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
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Typography variant="subtitle1">
                            {capability.name}
                          </Typography>
                          <Chip label={capability.domain} size="small" />
                          {capability.source === 'USER' ? (
                            <Chip
                              label="USER"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ) : null}
                        </div>
                        {capability.description ? (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            style={{ marginTop: 6 }}
                          >
                            {capability.description}
                          </Typography>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={saving}
                          onClick={() => startEdit(capability)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          size="small"
                          disabled={saving}
                          onClick={() => requestRetireCapability(capability)}
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
            <DialogTitle>Retire business capability?</DialogTitle>
            <DialogContent>
              <Typography variant="body2">
                Retire business capability &quot;{confirmRetireName}&quot;? It will no longer be
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
                onClick={confirmRetireCapability}
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
