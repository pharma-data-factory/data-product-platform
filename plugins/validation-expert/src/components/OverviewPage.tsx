import { ReactNode, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Grid, Typography, makeStyles } from '@material-ui/core';
import { validationExpertApiRef, ValidationOverview } from '../api';
import { NX, PageShell, StatusChip } from './shared';

const useStyles = makeStyles({
  tile: {
    background: NX.card,
    border: `1px solid ${NX.border}`,
    borderRadius: 16,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 132,
    padding: '18px 20px',
    transition: 'border-color .2s ease, background .2s ease, box-shadow .2s ease, transform .2s ease',
  },
  tileInteractive: {
    color: 'inherit',
    cursor: 'pointer',
    display: 'block',
    height: '100%',
    outline: 'none',
    textDecoration: 'none',
    '&:hover $tile': {
      background: '#F8FAFC',
      borderColor: 'rgba(10, 25, 41, 0.16)',
      boxShadow: `0 0 0 1px rgba(0, 194, 217, 0.28), 0 8px 20px rgba(10, 25, 41, 0.06)`,
      transform: 'translateY(-1px)',
    },
    '&:focus-visible $tile': {
      borderColor: NX.teal,
      boxShadow: `0 0 0 2px rgba(0, 194, 217, 0.55)`,
    },
    '&:hover': {
      textDecoration: 'none',
    },
  },
  title: {
    color: NX.muted,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  value: {
    color: NX.text,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.25,
    margin: 0,
    wordBreak: 'break-word',
  },
  detail: {
    color: NX.muted,
    fontSize: 13,
    lineHeight: 1.45,
    marginTop: 'auto',
    paddingTop: 10,
  },
  statusBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 2,
  },
});

function MetricCard({
  title,
  value,
  detail,
  to,
  children,
}: {
  title: string;
  value?: string;
  detail?: string;
  to?: string;
  children?: ReactNode;
}) {
  const classes = useStyles();
  const body = (
    <div className={classes.tile}>
      <div className={classes.title}>{title}</div>
      {children ?? (
        <Typography className={classes.value} component="p">
          {value}
        </Typography>
      )}
      {detail ? <div className={classes.detail}>{detail}</div> : null}
    </div>
  );

  if (!to) {
    return body;
  }

  return (
    <RouterLink
      to={to}
      className={classes.tileInteractive}
      aria-label={`Open ${title}`}
      data-testid={`validation-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {body}
    </RouterLink>
  );
}

export const OVERVIEW_CARD_LINKS = [
  { title: 'Requirements', to: '/validation-expert/requirements' },
  { title: 'Traceability', to: '/validation-expert/traceability' },
  { title: 'IQ', to: '/validation-expert/iq' },
  { title: 'OQ', to: '/validation-expert/oq' },
  { title: 'UAT', to: '/validation-expert/uat' },
  { title: 'Open Risks', to: '/validation-expert/risks' },
  { title: 'Open Findings', to: '/validation-expert/findings' },
  { title: 'Evidence', to: '/validation-expert/evidence' },
] as const;

export function OverviewPage() {
  const classes = useStyles();
  const api = useApi(validationExpertApiRef);
  const [data, setData] = useState<ValidationOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getOverview()
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [api]);

  if (error) {
    return (
      <PageShell title="Validation Expert">
        <Typography color="error">{error}</Typography>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell title="Validation Expert">
        <Progress />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Validation Expert"
      subtitle={`${data.product} ${data.candidate} — controlled validation workbench (v0.1). Not an AI agent. Not validated.`}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricCard
            title="Candidate"
            value={data.candidate}
            detail={`Tag ${data.candidateTag} · Baseline ${data.baselineId}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricCard
            title="Validation Status"
            detail={`Part 11: ${data.part11Status} · GxP: ${data.gxpStatus}`}
          >
            <div className={classes.statusBody}>
              <StatusChip value={data.validationStatus} />
            </div>
          </MetricCard>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricCard
            title="Requirements"
            value={`${data.requirementsBaselined.active} / ${data.requirementsBaselined.total}`}
            detail="Baselined active requirements"
            to="/validation-expert/requirements"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricCard
            title="Traceability"
            value={`${data.traceabilityPlanned.covered} / ${data.traceabilityPlanned.total}`}
            detail="Planned formal coverage"
            to="/validation-expert/traceability"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricCard title="IQ" value={data.iqStatus} to="/validation-expert/iq" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricCard
            title="OQ"
            value={data.oqStatus}
            detail="Protocol ready; formal OQ not product validation"
            to="/validation-expert/oq"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricCard title="UAT" value={data.uatStatus} to="/validation-expert/uat" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricCard
            title="Open Risks"
            value={String(data.openRisks)}
            detail="Acceptance not available in v0.1"
            to="/validation-expert/risks"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricCard
            title="Open Findings"
            value={String(data.openFindings)}
            to="/validation-expert/findings"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricCard
            title="Evidence"
            value={String(data.evidenceCount)}
            detail="Indexed artifact references"
            to="/validation-expert/evidence"
          />
        </Grid>
      </Grid>
      <Typography variant="body2" color="textSecondary" style={{ marginTop: 24 }}>
        {data.notes.join(' ')}
      </Typography>
    </PageShell>
  );
}
