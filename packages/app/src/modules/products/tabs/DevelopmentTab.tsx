import { Box, Chip, Typography } from '@material-ui/core';
import { Link } from '@backstage/core-components';
import { NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';
import type { Product, ProductBaseline } from '@internal/platform-common';

/**
 * Where the code lives, and what the last build of it produced.
 *
 * The tab NXD-056 specified and did not build. It was left out because nothing
 * on the Product joined it to a repository, so the tab would have held a
 * heading and an explanation of what was missing — and a tab that resolves to
 * an apology is worse than a tab that is not there. Step 2 created that join:
 * `repositoryUrl` and `catalogEntityRef` are written by the
 * `nexora:product:create` scaffolder action from the repository the task
 * published and the entity it registered.
 *
 * The build evidence shown here is not new either. `ProductBaseline.provenance`
 * has carried `releaseCommitSha` and `artifactDigest` since closure Slice 3,
 * written by CI, and until now it was visible only on the Tests tab — where it
 * reads as test metadata rather than as what it is: a statement about a commit
 * in *this* repository. Same data, the place it answers a question.
 *
 * A product with no repository gets a plain statement of the fact and the way
 * to get one, rather than an empty panel. That is the "other doors stay open"
 * decision made visible: a product may be created by the API, by applying an AI
 * spec draft or by the platform bootstrap, and none of those has a repository.
 */

interface DevelopmentTabProps {
  product: Product;
  /** `null` while loading; the page owns the fetch. */
  baselines: ProductBaseline[] | null;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box style={{ marginBottom: 12 }}>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="body2" component="div" style={{ wordBreak: 'break-all' }}>
        {children}
      </Typography>
    </Box>
  );
}

/** `component:default/oee` → `/catalog/default/component/oee`. */
export function catalogPathOf(entityRef: string): string | undefined {
  const [kind, rest] = entityRef.split(':', 2);
  if (!rest) {
    return undefined;
  }
  const [namespace, name] = rest.split('/');
  if (!kind || !namespace || !name) {
    return undefined;
  }
  return `/catalog/${namespace}/${kind.toLowerCase()}/${name}`;
}

export function DevelopmentTab({ product, baselines }: DevelopmentTabProps) {
  const catalogPath = product.catalogEntityRef
    ? catalogPathOf(product.catalogEntityRef)
    : undefined;

  // The most recent baseline that carries build evidence. Baselines come back
  // newest-last from the API, so the last one with provenance is the current
  // answer; one without it has simply never been built by CI.
  const withProvenance = (baselines ?? []).filter(b => b.provenance);
  const latest = withProvenance[withProvenance.length - 1];

  if (!product.repositoryUrl && !product.catalogEntityRef) {
    return (
      <Box style={{ marginTop: 24 }}>
        <Typography variant="h6" gutterBottom>
          Development
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          This product has no repository. It was not created from a template —
          the API, an applied AI spec draft and the platform bootstrap all create
          a product record on its own, and none of them writes code.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          A product created from a Golden Path template is born with all three:
          a repository, a Catalog entity and this record, joined to each other.
          Start one from <Link to="/create">Create</Link>.
        </Typography>
      </Box>
    );
  }

  return (
    <Box style={{ marginTop: 24 }}>
      <Typography variant="h6" gutterBottom>
        Development
      </Typography>

      {product.repositoryUrl && (
        <Field label="Repository">
          <a
            href={product.repositoryUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {product.repositoryUrl}
          </a>
        </Field>
      )}

      {product.catalogEntityRef && (
        <Field label="Catalog entity">
          {catalogPath ? (
            <Link to={catalogPath}>{product.catalogEntityRef}</Link>
          ) : (
            product.catalogEntityRef
          )}
        </Field>
      )}

      <Box
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: `1px solid ${NEXORA_GREY[200]}`,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Last release build
        </Typography>
        {latest?.provenance ? (
          <>
            <Field label="Baseline">
              {latest.baselineVersion} · {latest.status}
            </Field>
            <Field label="Commit">
              <code>{latest.provenance.releaseCommitSha}</code>
            </Field>
            <Field label="Image digest">
              <code>{latest.provenance.artifactDigest}</code>
            </Field>
            <Chip
              size="small"
              label="Recorded by CI"
              style={{
                backgroundColor: NEXORA_TONE.success.bg,
                color: NEXORA_TONE.success.text,
              }}
            />
          </>
        ) : (
          <Typography variant="body2" color="textSecondary">
            {baselines === null
              ? 'Loading…'
              : 'No release build has written provenance to a baseline of this ' +
                'product yet. CI records the commit and the image digest when ' +
                'it publishes from the default branch.'}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
