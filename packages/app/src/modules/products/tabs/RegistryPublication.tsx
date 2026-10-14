import { useEffect, useRef, useState } from 'react';
import { NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';
import { Box, Button, Chip, Link, Typography } from '@material-ui/core';
import type { ArtifactVersion } from '@internal/platform-common';
import type { RegistryAction } from '../api';

const CARD_STYLE = {
  border: `1px solid ${NEXORA_GREY[200]}`,
  borderRadius: 12,
  padding: 12,
  marginBottom: 16,
};

/**
 * The next producer act for a version, or none once it is published. The
 * registry is a ratchet (DRAFT → TESTING → reviewed → CERTIFIED → RELEASED),
 * so there is exactly one; offering only that one keeps the page from
 * suggesting an act the registry would refuse.
 */
export function nextRegistryAction(
  version: Pick<ArtifactVersion, 'lifecycle' | 'certificationStatus'>,
): { action: RegistryAction; label: string } | undefined {
  switch (version.lifecycle) {
    case 'DRAFT':
      return { action: 'submit', label: 'Submit for testing' };
    case 'TESTING':
      return version.certificationStatus === 'TESTED'
        ? { action: 'certify', label: 'Certify' }
        : { action: 'review', label: 'Record review' };
    case 'CERTIFIED':
      return { action: 'publish', label: 'Publish' };
    default:
      return undefined;
  }
}

interface RegistryPublicationProps {
  artifactRef: string;
  loadVersion: (artifactRef: string) => Promise<ArtifactVersion>;
  transition: (
    versionId: string,
    action: RegistryAction,
  ) => Promise<ArtifactVersion>;
}

/**
 * NXD-137. Where the release build stands in the Artifact Registry, and the
 * one act that moves it on. Certify and publish need a recorded release
 * build (R8); the registry says so itself when it refuses.
 */
export function RegistryPublication(props: RegistryPublicationProps) {
  const { artifactRef, loadVersion, transition } = props;
  const [version, setVersion] = useState<ArtifactVersion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The clients are rebuilt on every render; reading the latest through a ref
  // keeps the load tied to the coordinate alone, not to each new function.
  const load = useRef(loadVersion);
  load.current = loadVersion;

  useEffect(() => {
    let live = true;
    setError(null);
    load
      .current(artifactRef)
      .then(found => live && setVersion(found))
      .catch(e => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [artifactRef]);

  const next = version ? nextRegistryAction(version) : undefined;
  const act = async () => {
    if (!version || !next) return;
    setBusy(true);
    setError(null);
    try {
      setVersion(await transition(version.id, next.action));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Artifact Registry" style={CARD_STYLE}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        style={{ gap: 12 }}
      >
        <Typography variant="subtitle1">
          Artifact Registry · <code>{artifactRef}</code>
        </Typography>
        {version ? (
          <Chip
            size="small"
            variant="outlined"
            label={
              version.certificationStatus && version.lifecycle === 'TESTING'
                ? `${version.lifecycle} · ${version.certificationStatus}`
                : version.lifecycle
            }
          />
        ) : null}
      </Box>
      {version?.releaseBuild ? (
        <Typography variant="body2" color="textSecondary">
          {version.releaseBuild.imageRepository}@
          {version.releaseBuild.imageDigest} · commit{' '}
          {version.releaseBuild.commitSha.slice(0, 7)}
          {version.releaseBuild.releaseUrl ? (
            <>
              {' '}
              ·{' '}
              <Link
                href={version.releaseBuild.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                release
              </Link>
            </>
          ) : null}
        </Typography>
      ) : null}
      {version && !version.releaseBuild ? (
        <Typography variant="body2" color="textSecondary">
          No release build recorded: this version cannot be certified or
          published.
        </Typography>
      ) : null}
      {next ? (
        <Box mt={1}>
          <Button variant="outlined" disabled={busy} onClick={act}>
            {busy ? 'Working…' : next.label}
          </Button>
        </Box>
      ) : null}
      {version && !next && version.lifecycle === 'RELEASED' ? (
        <Typography variant="body2" style={{ marginTop: 8 }}>
          Published: available to consumers of the registry.
        </Typography>
      ) : null}
      {error ? (
        <Typography
          role="alert"
          variant="body2"
          style={{ color: NEXORA_TONE.danger.text, marginTop: 8 }}
        >
          {error}
        </Typography>
      ) : null}
    </section>
  );
}
