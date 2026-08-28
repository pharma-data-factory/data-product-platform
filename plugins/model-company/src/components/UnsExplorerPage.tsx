import { useCallback, useEffect, useState } from 'react';
import { Button, CircularProgress, Typography } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { modelCompanyApiRef, UnsMessageView } from '../api';
import { ModelCompanyChrome } from './shared';

interface UnsTree {
  root: string;
  enterpriseId: string;
  siteId: string;
  areas: Array<{ id: string; slug: string; lines: string[] }>;
  businessTopics: string[];
  equipment: Array<{
    equipmentId: string;
    lineId: string;
    areaSlug: string;
    topics: string[];
  }>;
}

export function UnsExplorerPage() {
  const api = useApi(modelCompanyApiRef);
  const [tree, setTree] = useState<UnsTree | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [selected, setSelected] = useState<UnsMessageView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [t, h] = await Promise.all([api.getUnsTree(), api.getUnsHealth()]);
      setTree(t as UnsTree);
      setHealth(h as Record<string, unknown>);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const openTopic = async (topic: string) => {
    try {
      setSelected(await api.getUnsTopic(topic));
    } catch {
      setSelected(null);
      setError(`No latest message yet for ${topic} — start simulation / run a scenario.`);
    }
  };

  if (!tree && !error) {
    return (
      <ModelCompanyChrome title="UNS Explorer">
        <CircularProgress />
      </ModelCompanyChrome>
    );
  }

  return (
    <ModelCompanyChrome title="UNS Explorer">
      <Typography variant="body2" style={{ marginBottom: 12 }}>
        Platform UNS Standard 1.0 — Model Company is a publisher, not a parallel namespace.
      </Typography>
      {health && (
        <pre style={{ fontSize: 13, marginBottom: 16 }}>
          {JSON.stringify(health, null, 2)}
        </pre>
      )}
      {error && (
        <Typography color="error" style={{ marginBottom: 12 }}>
          {error}
        </Typography>
      )}
      {tree && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Typography variant="subtitle1">
              {tree.root} / {tree.enterpriseId} / {tree.siteId}
            </Typography>
            {tree.areas.map(area => (
              <div key={area.id} style={{ marginTop: 12 }}>
                <Typography variant="subtitle2">
                  {area.slug} ({area.id})
                </Typography>
                {area.lines.map(lineId => (
                  <div key={lineId} style={{ marginLeft: 12, marginTop: 8 }}>
                    <Typography variant="body2">{lineId}</Typography>
                    {tree.equipment
                      .filter(e => e.lineId === lineId)
                      .map(eq => (
                        <div key={eq.equipmentId} style={{ marginLeft: 12, marginTop: 6 }}>
                          <Typography variant="body2" style={{ fontWeight: 600 }}>
                            {eq.equipmentId}
                          </Typography>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {eq.topics
                              .filter(t => !t.includes('/events/'))
                              .map(topic => (
                                <Button
                                  key={topic}
                                  size="small"
                                  variant="outlined"
                                  onClick={() => openTopic(topic)}
                                >
                                  {topic.split('/').pop()}
                                </Button>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            ))}
            <Typography variant="subtitle2" style={{ marginTop: 16 }}>
              Business namespaces
            </Typography>
            {tree.businessTopics.map(t => (
              <Typography key={t} variant="body2" style={{ fontFamily: 'monospace' }}>
                {t}
              </Typography>
            ))}
          </div>
          <div>
            <Typography variant="subtitle1">Topic detail</Typography>
            {!selected && (
              <Typography variant="body2" color="textSecondary">
                Select a topic to view latest message (QoS, retain, schema, data quality).
              </Typography>
            )}
            {selected && (
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
                {JSON.stringify(
                  {
                    topic: selected.topic,
                    qos: selected.qos,
                    retained: selected.retained,
                    schemaId: selected.schemaId,
                    valid: selected.valid,
                    timestamp: selected.envelope.timestamp,
                    schemaVersion: selected.envelope.schemaVersion,
                    dataQuality: selected.envelope.dataQuality,
                    payload: selected.envelope.payload,
                  },
                  null,
                  2,
                )}
              </pre>
            )}
          </div>
        </div>
      )}
    </ModelCompanyChrome>
  );
}
