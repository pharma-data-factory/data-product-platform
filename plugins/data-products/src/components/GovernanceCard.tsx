import { useState } from 'react';
import { InfoCard } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Button, Typography } from '@material-ui/core';
import { canManageGovernance } from '@internal/platform-common';
import { dataProductCiApiRef } from '../api';
import { CERTIFICATION_STATUSES, CertificationStatus, DataProduct } from '../model';
import { usePlatformRole } from '../usePlatformRole';
import { CertificationChip } from './CertificationChip';

export function GovernanceCard({ product }: { product: DataProduct }) {
  const { role } = usePlatformRole();
  const ciApi = useApi(dataProductCiApiRef);
  const [status, setStatus] = useState<CertificationStatus>(
    product.certificationStatus,
  );
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!canManageGovernance(role)) {
    return null;
  }

  const update = async (next: CertificationStatus) => {
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await ciApi.setCertification(product.entityRef, next);
      setStatus(result.status as CertificationStatus);
      setMessage(
        'Technical certification recorded. This is not GxP or regulatory validation.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Certification update denied',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <InfoCard title="Owner governance">
      <Typography variant="body2" paragraph>
        Technical certification workflow. Backend permission checks apply.
        This does not imply GxP validation.
      </Typography>
      <CertificationChip status={status} />
      <div style={{ marginTop: 16 }}>
        {CERTIFICATION_STATUSES.map(item => (
          <Button
            key={item}
            size="small"
            color="primary"
            variant={item === status ? 'contained' : 'outlined'}
            disabled={busy}
            onClick={() => update(item)}
            style={{ marginRight: 8, marginBottom: 8 }}
          >
            {item}
          </Button>
        ))}
      </div>
      {message && (
        <Typography variant="body2" style={{ marginTop: 8 }}>
          {message}
        </Typography>
      )}
    </InfoCard>
  );
}
