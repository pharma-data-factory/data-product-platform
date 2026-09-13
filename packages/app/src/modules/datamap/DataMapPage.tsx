import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Content,
  ErrorPanel,
  Header,
  Page,
  Progress,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { MenuItem, TextField, Typography } from '@material-ui/core';
import {
  NexoraGraphMap,
  type NexoraGraphEdge,
  type NexoraGraphNode,
  type NexoraNodeKind,
} from '@internal/plugin-nexora-common';
import { ursComposerApiRef } from '@internal/plugin-urs-composer';
import { validationExpertApiRef } from '@internal/plugin-validation-expert';
import { useComposerClient } from '../products/api';
import { buildDataMapGraph, ursSetIdFromNodeId } from './buildDataMapGraph';

const KIND_OPTIONS: NexoraNodeKind[] = [
  'capability',
  'requirement-set',
  'baseline',
  'requirement',
  'product',
  'product-component',
  'validation-context',
];

export function DataMapPage() {
  const navigate = useNavigate();
  const composer = useComposerClient();
  const urs = useApi(ursComposerApiRef);
  const validation = useApi(validationExpertApiRef);

  const [graph, setGraph] = useState<{
    nodes: NexoraGraphNode[];
    edges: NexoraGraphEdge[];
  } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    buildDataMapGraph({ composer, urs, validation })
      .then(result => {
        if (mounted) {
          setGraph(result);
        }
      })
      .catch(e => {
        if (mounted) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composer, urs, validation]);

  const visible = useMemo(() => {
    if (!graph) {
      return graph;
    }
    const query = search.trim().toLowerCase();
    const nodes = graph.nodes.filter(node => {
      if (kindFilter && node.kind !== kindFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [node.label, node.subtitle, ...(node.meta ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = graph.edges.filter(
      edge => nodeIds.has(edge.source) && nodeIds.has(edge.target),
    );
    return { nodes, edges };
  }, [graph, search, kindFilter]);

  return (
    <Page themeId="service">
      <Header
        title="Data Map"
        subtitle="Explore how data flows through your organization."
      />
      <Content>
        {loading ? (
          <Progress />
        ) : error ? (
          <ErrorPanel error={error} />
        ) : visible ? (
          <>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <TextField
                label="Search"
                placeholder="Capability, URS, product, component…"
                variant="outlined"
                size="small"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 260 }}
              />
              <TextField
                select
                label="Type"
                variant="outlined"
                size="small"
                value={kindFilter}
                onChange={e => setKindFilter(e.target.value)}
                style={{ minWidth: 180 }}
              >
                <MenuItem value="">All</MenuItem>
                {KIND_OPTIONS.map(kind => (
                  <MenuItem key={kind} value={kind}>
                    {kind}
                  </MenuItem>
                ))}
              </TextField>
              <Typography
                variant="body2"
                color="textSecondary"
                style={{ alignSelf: 'center' }}
              >
                {visible.nodes.length} nodes · {visible.edges.length} links
              </Typography>
            </div>
            <NexoraGraphMap
              nodes={visible.nodes}
              edges={visible.edges}
              layoutDirection="LR"
              height={640}
              onNodeClick={node => {
                const ursSetId = ursSetIdFromNodeId(node.id);
                if (ursSetId) {
                  navigate(`/urs-composer/${encodeURIComponent(ursSetId)}`);
                }
              }}
            />
          </>
        ) : null}
      </Content>
    </Page>
  );
}
