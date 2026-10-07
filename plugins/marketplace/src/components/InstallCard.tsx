/**
 * Installing a released Data Product from the Marketplace (NXD-141, MVP1
 * step 7).
 *
 * The card shows where the artifact is installed and offers *Install* to
 * whoever holds `installation.manage`. The dialog asks for a released, built
 * version, a runtime target, a name and the manifest's `spec.config`, and
 * then for what the installations store will demand: a justification and the
 * signing PIN for a GMP-relevant artifact, a confirmation otherwise (NXD-139,
 * NXD-140). The store decides; a refusal is shown in its own words.
 *
 * Installing records desired state. Nothing runs until a runtime provider
 * picks it up (NXD-129 slices 2 and 3), and the card says so.
 */

import { useCallback, useEffect, useState } from 'react';
import { InfoCard, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import {
  LoadError,
  NEXORA_TONE,
  useLoadable,
} from '@internal/plugin-nexora-common';
import type {
  ArtifactInstallation,
  InstallableVersionView,
  RuntimeTarget,
} from '@internal/platform-common';
import {
  installationsApiRef,
  type GmpClassificationView,
} from '../installationsApi';
import { installConfigFromForm, signatureReason } from '../install';

export interface InstallCardProps {
  namespace: string;
  name: string;
  displayName: string;
  versions: readonly InstallableVersionView[];
  canInstall: boolean;
}

export function InstallCard(props: InstallCardProps) {
  const { namespace, name, displayName, versions, canInstall } = props;
  const api = useApi(installationsApiRef);
  const [open, setOpen] = useState(false);
  const [installedName, setInstalledName] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [targets, installations] = await Promise.all([
      api.listTargets(),
      api.listInstallations(),
    ]);
    return {
      targets,
      installations: installations.filter(
        entry => entry.namespace === namespace && entry.artifactName === name,
      ),
    };
  }, [api, namespace, name]);
  const { value, loading, error, retry } = useLoadable(load);

  const targetName = (id: string) =>
    value?.targets.find(target => target.id === id)?.displayName ?? id;

  return (
    <InfoCard title="Install">
      {loading && !value && <Progress />}
      {error && (
        <LoadError error={error} what="installations" onRetry={retry} />
      )}
      {value && (
        <>
          {value.installations.length === 0 ? (
            <Typography variant="body2">Not installed on any target.</Typography>
          ) : (
            value.installations.map(entry => (
              <InstallationRow
                key={entry.id}
                installation={entry}
                targetName={targetName(entry.targetId)}
              />
            ))
          )}
          {installedName && (
            <Typography variant="body2" role="status" style={{ marginTop: 12 }}>
              “{installedName}” is recorded. It runs once a runtime provider
              for its target picks it up.
            </Typography>
          )}
          <Box marginTop={2}>
            {canInstall && value.targets.length > 0 && (
              <Button
                color="primary"
                variant="contained"
                onClick={() => {
                  setInstalledName(null);
                  setOpen(true);
                }}
              >
                Install
              </Button>
            )}
            {canInstall && value.targets.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                No runtime target is registered yet. A platform administrator
                registers one before anything can be installed.
              </Typography>
            )}
            {!canInstall && (
              <Typography variant="body2" color="textSecondary">
                Installing needs the installation.manage permission (Data
                Product Owner or Platform Admin).
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="textSecondary" component="p" style={{ marginTop: 12 }}>
            Installing records what should run where. A runtime provider
            executes it and reports back.
          </Typography>
          {open && (
            <InstallDialog
              namespace={namespace}
              name={name}
              displayName={displayName}
              versions={versions}
              targets={value.targets}
              onClose={() => setOpen(false)}
              onInstalled={installation => {
                setOpen(false);
                setInstalledName(installation.name);
                retry();
              }}
            />
          )}
        </>
      )}
    </InfoCard>
  );
}

function InstallationRow(props: {
  installation: ArtifactInstallation;
  targetName: string;
}) {
  const { installation, targetName } = props;
  const observed = installation.observed
    ? installation.observed.state
    : 'no provider has reported';
  return (
    <Box marginBottom={1}>
      <Typography variant="body2">
        <strong>{installation.name}</strong> on {targetName} ·{' '}
        {installation.desired.version} · {installation.desired.state}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Running: {observed} · Qualification:{' '}
        {installation.qualificationStatus.replace(/_/g, ' ').toLowerCase()}
      </Typography>
    </Box>
  );
}

const MEANING =
  'I install this released version on this target: I have checked its configuration, and I accept that it is to run there.';

export function InstallDialog(props: {
  namespace: string;
  name: string;
  displayName: string;
  versions: readonly InstallableVersionView[];
  targets: readonly RuntimeTarget[];
  onClose: () => void;
  onInstalled: (installation: ArtifactInstallation) => void;
}) {
  const { namespace, name, displayName, versions, targets, onClose, onInstalled } =
    props;
  const api = useApi(installationsApiRef);
  const [version, setVersion] = useState(versions[0]?.version ?? '');
  const [targetId, setTargetId] = useState(targets[0]?.id ?? '');
  const [installationName, setInstallationName] = useState(name);
  const [values, setValues] = useState<Record<string, string>>({});
  const [justification, setJustification] = useState('');
  const [pin, setPin] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [classification, setClassification] = useState<
    GmpClassificationView | undefined
  >();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.gmpClassification(namespace, name).then(
      result => active && setClassification(result),
      // Fail closed, as the store does: unreadable means signed.
      () => active && setClassification({ gmpRelevant: true, source: 'UNAVAILABLE' }),
    );
    return () => {
      active = false;
    };
  }, [api, namespace, name]);

  const selected = versions.find(entry => entry.version === version);
  const schema = selected?.config ?? [];
  const { config, issues } = installConfigFromForm(schema, values);
  const signed = classification?.gmpRelevant ?? true;
  const attested = signed
    ? justification.trim().length > 0 && pin.length > 0
    : confirmed;
  const canInstall =
    !busy &&
    classification !== undefined &&
    Boolean(selected && targetId && installationName.trim()) &&
    issues.length === 0 &&
    attested;

  const install = async () => {
    setBusy(true);
    setError(null);
    try {
      const installation = await api.install({
        targetId,
        artifactRef: `${namespace}/${name}@${version}`,
        name: installationName.trim(),
        config,
        signature: signed
          ? { justification: justification.trim(), pin }
          : { confirmed: true, justification: justification.trim() || undefined },
      });
      onInstalled(installation);
    } catch (e) {
      // The store's reason, verbatim (cf. NXD-104).
      setError(e instanceof Error ? e.message : String(e));
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Install {displayName}</DialogTitle>
      <DialogContent>
        <TextField
          id="install-version"
          select
          label="Version"
          fullWidth
          margin="normal"
          value={version}
          onChange={e => setVersion(e.target.value)}
          helperText={selected ? `Runs at ${selected.imageDigest}` : undefined}
        >
          {versions.map(entry => (
            <MenuItem key={entry.version} value={entry.version}>
              {entry.version}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="install-target"
          select
          label="Runtime target"
          fullWidth
          margin="normal"
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
        >
          {targets.map(target => (
            <MenuItem key={target.id} value={target.id}>
              {target.displayName} ({target.providerKind})
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="install-name"
          label="Installation name"
          required
          fullWidth
          margin="normal"
          value={installationName}
          onChange={e => setInstallationName(e.target.value)}
          helperText="Unique on the target."
        />

        {schema.length > 0 && (
          <Typography variant="subtitle2" style={{ marginTop: 16 }}>
            Configuration
          </Typography>
        )}
        {schema.map(entry => (
          <TextField
            key={entry.key}
            id={`install-config-${entry.key}`}
            label={entry.type === 'secret' ? `${entry.key} (secret reference)` : entry.key}
            required={entry.required && entry.defaultValue === undefined}
            fullWidth
            margin="dense"
            value={values[entry.key] ?? ''}
            placeholder={entry.type === 'secret' ? undefined : entry.defaultValue ?? entry.example}
            onChange={e =>
              setValues(previous => ({ ...previous, [entry.key]: e.target.value }))
            }
            helperText={
              entry.type === 'secret'
                ? 'The name of a secret in the target’s secret store, never the value.'
                : [
                    entry.description,
                    entry.defaultValue !== undefined
                      ? `Default: ${entry.defaultValue || '(empty)'}`
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join(' · ') || undefined
            }
          />
        ))}
        {issues.length > 0 && (
          <Box marginTop={1}>
            {issues.map(issue => (
              <Typography key={issue} variant="body2" style={{ color: NEXORA_TONE.danger.text }}>
                {issue}
              </Typography>
            ))}
          </Box>
        )}

        <Typography variant="body2" paragraph style={{ marginTop: 16 }}>
          {MEANING}
        </Typography>
        {classification === undefined ? (
          <Progress />
        ) : (
          <>
            <Typography variant="body2" color="textSecondary" paragraph>
              {signed
                ? `${signatureReason(classification.source)} Installing is an electronic signature: a justification and your signing PIN. An installation qualification (IQ) record is opened; the installation counts as qualified only once QA signs it.`
                : 'This product is not GMP-relevant: confirm, and add a justification if you like.'}
            </Typography>
            <TextField
              id="install-justification"
              label="Justification"
              required={signed}
              fullWidth
              multiline
              minRows={2}
              margin="normal"
              value={justification}
              onChange={e => setJustification(e.target.value)}
            />
            {signed ? (
              <>
                <TextField
                  id="install-pin"
                  label="Signing PIN"
                  type="password"
                  required
                  fullWidth
                  margin="normal"
                  autoComplete="off"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                />
                <Typography variant="caption" color="textSecondary">
                  No PIN yet? Set it with “Set signing PIN” on any requirement
                  set in the <Link href="/urs-composer">URS Composer</Link>; it
                  is one PIN for every signature.
                </Typography>
              </>
            ) : (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                    color="primary"
                  />
                }
                label="I confirm this installation."
              />
            )}
          </>
        )}
        {error ? (
          <Typography role="alert" style={{ color: NEXORA_TONE.danger.text, marginTop: 8 }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button color="primary" variant="contained" disabled={!canInstall} onClick={install}>
          {signed ? 'Sign and install' : 'Install'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
