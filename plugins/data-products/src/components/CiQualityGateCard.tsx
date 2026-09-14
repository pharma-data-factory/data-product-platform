import { useEffect, useState } from 'react';
import {
  InfoCard,
  Link,
  Progress,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Chip, Typography } from '@material-ui/core';

import { documentationHref } from '@internal/platform-common';
import { dataProductCiApiRef } from '../api';
import {
  DataProductCiStatus,
  unknownCiStatus,
} from '../ciStatus';
import { CiStatusChip } from './CiStatusChip';
import {
  NEXORA_CARD,
  NEXORA_TONE,
} from '@internal/plugin-nexora-common';

export function CiQualityGateCard({ entityRef }: { entityRef: string }) {
  const ciApi = useApi(dataProductCiApiRef);
  const [status, setStatus] = useState<DataProductCiStatus>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ciApi
      .getCiStatus(entityRef)
      .then(result => {
        if (!cancelled) {
          setStatus(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(unknownCiStatus());
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ciApi, entityRef]);

  return (
    <CiQualityGateView loading={loading} status={status ?? unknownCiStatus()} />
  );
}

export function CiQualityGateView({
  loading,
  status,
}: {
  loading?: boolean;
  status: DataProductCiStatus;
}) {
  return (
    <InfoCard title="CI Quality Gate">
      {loading && <Progress />}
      {!loading && (
        <>
          <Typography variant="subtitle2">Status</Typography>
          <CiStatusChip status={status.status} />
          {status.message && (
            <Typography
              variant="body2"
              color="textSecondary"
              style={{ marginTop: 8 }}
            >
              {status.message}
            </Typography>
          )}
          <div style={{ marginTop: 16 }}>
            <StructuredMetadataTable
              metadata={{
                Workflow: status.workflowName || 'Not available',
                Branch: status.branch || 'Not available',
                Commit: status.commitSha || 'Not available',
                Started: formatTimestamp(status.startedAt),
                Completed: formatTimestamp(status.completedAt),
                Conclusion: status.conclusion || 'Not available',
              }}
            />
          </div>
          {status.failedStages && status.failedStages.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Typography variant="subtitle2">Failed stages</Typography>
              {status.failedStages.map(stage => (
                <Chip
                  key={stage}
                  size="small"
                  label={stage}
                  style={{
                    marginRight: 8,
                    marginTop: 8,
                    backgroundColor: NEXORA_TONE.danger.bg,
                    color: NEXORA_CARD,
                  }}
                />
              ))}
            </div>
          )}
          {status.htmlUrl && (
            <Typography variant="body2" style={{ marginTop: 12 }}>
              <Link to={status.htmlUrl}>View in GitHub</Link>
            </Typography>
          )}
          <Typography variant="body2" style={{ marginTop: 12 }}>
            <Link to={documentationHref('howto-ci')}>
              CI troubleshooting guide
            </Link>
          </Typography>
          <Typography variant="body2" style={{ marginTop: 12 }}>
            Latest GitHub Actions quality-gate result. This is not GxP or
            regulatory validation.
          </Typography>
        </>
      )}
    </InfoCard>
  );
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return 'Not available';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }
  return date.toLocaleString();
}
