import { Box, Button, Typography } from '@material-ui/core';
import type {
  Product,
  ProductBaseline,
  ProductRequirementCoverage,
  ProductVersion,
} from '@internal/platform-common';
import type { ProductSignatureRecord, ReleaseGateResult } from '../api';

const SIGNATURE_LABEL: Record<ProductSignatureRecord['meaning'], string> = {
  VERSION_APPROVED: 'Version approved',
  VERSION_RELEASED: 'Version released',
  BASELINE_APPROVED: 'Baseline approved',
};
import { GovernanceCard } from './GovernanceCard';
import { ReleaseReadinessCard } from './ReleaseReadinessCard';
import { BaselinesSection } from './BaselinesSection';

/**
 * Which transitions a version in each status offers.
 *
 * The server decides; this only stops the UI from offering a transition that
 * would come back as an error.
 */
const TRANSITIONS: Record<string, Array<{ label: string; target: string }>> = {
  DRAFT: [{ label: 'Approve', target: 'APPROVED' }],
  APPROVED: [{ label: 'Mark as Release Candidate', target: 'RELEASE_CANDIDATE' }],
  RELEASE_CANDIDATE: [
    { label: 'Release', target: 'RELEASED' },
    { label: 'Revert to Draft', target: 'DRAFT' },
  ],
  RELEASED: [{ label: 'Supersede', target: 'SUPERSEDED' }],
};

/**
 * NXD-165. Who may not release this version: its author, its approver and
 * the approver of its product baseline. The server enforces it; this names
 * them before anyone presses Release.
 */
export function releaseExclusionText(
  version: ProductVersion,
  baselines: ProductBaseline[],
): string {
  const excluded = new Map<string, string[]>();
  const add = (who: string | undefined, role: string) => {
    if (!who) return;
    excluded.set(who, [...(excluded.get(who) ?? []), role]);
  };
  add(version.createdBy, 'author');
  add(version.approvedBy, 'approver of this version');
  for (const b of baselines) {
    if (b.status === 'APPROVED') add(b.approvedBy, 'approver of the product baseline');
  }
  const names = [...excluded].map(([who, roles]) => `${who} (${roles.join(', ')})`);
  return `Release needs a further person: anyone with release rights except ${names.join(
    ', ',
  )}.`;
}

interface OverviewTabProps {
  product: Product;
  versions: ProductVersion[];
  selectedVersion?: ProductVersion;
  /** Loads the release gate for the selected version. */
  loadGate: () => Promise<ReleaseGateResult>;
  coverage: ProductRequirementCoverage | null;
  transitionLoading: boolean;
  actionError: string | null;
  baselines: ProductBaseline[] | null;
  baselineBusy: boolean;
  baselineError: string | null;
  onCreateVersion: () => void;
  onTransition: (targetStatus: string) => void;
  onSaveGovernance: (input: Record<string, unknown>) => Promise<void>;
  onCreateBaseline: (baselineVersion?: string) => Promise<void>;
  onApproveBaseline: (baselineId: string) => Promise<void>;
  /** NXD-128: approvals and releases of this product, as attested. */
  signatures?: ProductSignatureRecord[];
}

export function OverviewTab({
  product,
  versions,
  selectedVersion,
  loadGate,
  coverage,
  transitionLoading,
  actionError,
  baselines,
  baselineBusy,
  baselineError,
  onCreateVersion,
  onTransition,
  onSaveGovernance,
  onCreateBaseline,
  onApproveBaseline,
  signatures = [],
}: OverviewTabProps) {
  return (
    <>
      <Typography variant="body2" color="textSecondary">
        {product.description || 'No description'} ·{' '}
        {product.domain || 'no domain'} · {product.lifecycle}
      </Typography>

      {/*
        Product-scoped, so it sits above the version picker's concerns and does
        not move when the selected version changes.
      */}
      <GovernanceCard product={product} onSave={onSaveGovernance} />

      <section style={{ marginTop: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Typography variant="h6">Release Management</Typography>
          <Button variant="contained" color="primary" onClick={onCreateVersion}>
            New version
          </Button>
        </div>

        {versions.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No versions yet. Create a version to add components.
          </Typography>
        ) : (
          <>
            {actionError && (
              <Box marginBottom={2}>
                <Typography color="error">{actionError}</Typography>
              </Box>
            )}

            {/*
              NXD-100. For every version, not only RELEASE_CANDIDATE: the gate
              answers read-only at any status so blockers can be cleared while
              the version is still being built.
            */}
            {selectedVersion && (
              <ReleaseReadinessCard
                versionLabel={selectedVersion.version}
                versionStatus={selectedVersion.status}
                releasedAt={selectedVersion.releasedAt}
                releasedBy={selectedVersion.releasedBy}
                loadGate={loadGate}
                coverage={coverage}
                refreshKey={[
                  selectedVersion.id,
                  selectedVersion.status,
                  selectedVersion.revision,
                  selectedVersion.ursBaselineId,
                  // The gate's policy obligations read these (NXD-159 item 3).
                  product.owner,
                  product.gxpRelevance,
                  product.dataClassification,
                  product.criticality,
                  product.lifecycle,
                  (baselines ?? []).map(b => `${b.id}:${b.status}`).join(','),
                  coverage
                    ? `${coverage.mapped}/${coverage.verified}/${coverage.validated}`
                    : '',
                ].join('|')}
              />
            )}

            {selectedVersion && TRANSITIONS[selectedVersion.status] && (
              <Box style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {TRANSITIONS[selectedVersion.status].map(t => (
                  <Button
                    key={t.target}
                    variant={t.target === 'RELEASED' ? 'contained' : 'outlined'}
                    color={t.target === 'RELEASED' ? 'primary' : 'default'}
                    disabled={transitionLoading}
                    onClick={() => onTransition(t.target)}
                  >
                    {t.label}
                  </Button>
                ))}
              </Box>
            )}
            {/* NXD-164/165. Said before the click, not only in the refusal. */}
            {selectedVersion?.status === 'RELEASE_CANDIDATE' ? (
              <Typography
                variant="body2"
                color="textSecondary"
                style={{ marginTop: -8, marginBottom: 16 }}
              >
                {releaseExclusionText(selectedVersion, baselines ?? [])}
              </Typography>
            ) : null}

            {/*
              Before the gate, not only when it is reachable: a baseline is
              created and approved while the version is still DRAFT, and the
              gate only reads the result.
            */}
            <BaselinesSection
              selectedVersion={selectedVersion}
              baselines={baselines}
              busy={baselineBusy}
              error={baselineError}
              onCreate={onCreateBaseline}
              onApprove={onApproveBaseline}
            />

            {signatures.length > 0 ? (
              <section aria-label="Approvals and releases" style={{ marginTop: 16 }}>
                <Typography variant="subtitle1">Approvals and releases</Typography>
                {signatures.map(sig => (
                  <Typography key={sig.id} variant="body2" color="textSecondary">
                    {SIGNATURE_LABEL[sig.meaning]}
                    {sig.entityType === 'PRODUCT_VERSION'
                      ? ` ${versions.find(v => v.id === sig.entityId)?.version ?? ''}`
                      : ''}{' '}
                    by {sig.signedBy}, {new Date(sig.signedAt).toLocaleString()} ·{' '}
                    {sig.reauthMethod ? 'signed with PIN' : 'confirmed'}
                    {sig.justification ? ` — “${sig.justification}”` : ''}
                  </Typography>
                ))}
              </section>
            ) : null}

          </>
        )}
      </section>
    </>
  );
}
