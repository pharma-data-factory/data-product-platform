import { useEffect, useState } from 'react';
import { NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';
import {
  Box,
  Button,
  Chip,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import {
  DATA_CLASSIFICATIONS,
  GXP_RELEVANCE_LEVELS,
  PRODUCT_CRITICALITIES,
  PRODUCT_LIFECYCLES,
} from '@internal/platform-common';
import type { Product } from '@internal/platform-common';

/**
 * The four fields the release gate asks every product for.
 *
 * `platform-policy.document.json` makes owner, data classification and GxP
 * relevance obligations on *all* products, and criticality an obligation on
 * GxP-relevant ones. The create form collects none of them and there was no
 * edit screen, so every product created through the UI arrived at the gate
 * with three `POLICY_OBLIGATION_UNMET` blockers and no way to clear them.
 *
 * Deliberately not in the create form. Ownership and classification are
 * decisions, and a product may legitimately be created before they are made —
 * the gate is where they become mandatory, which is the same rule the URS
 * binding follows: free to create, answered to release.
 */

interface GovernanceCardProps {
  product: Product;
  onSave: (input: Record<string, unknown>) => Promise<void>;
}

/** What the gate will say about a field that is still unanswered. */
function unmetLabel(value: string | undefined): boolean {
  return !value || !value.trim();
}

export function GovernanceCard({ product, onSave }: GovernanceCardProps) {
  const [owner, setOwner] = useState(product.owner ?? '');
  const [gxpRelevance, setGxpRelevance] = useState(product.gxpRelevance ?? '');
  const [dataClassification, setDataClassification] = useState<string>(
    product.dataClassification ?? '',
  );
  const [criticality, setCriticality] = useState(product.criticality ?? '');
  const [lifecycle, setLifecycle] = useState<string>(product.lifecycle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A save reloads the page's product, and a version switch does not touch
  // these fields — but `load()` replaces the object either way, so the form
  // follows what was actually stored rather than what was typed.
  useEffect(() => {
    setOwner(product.owner ?? '');
    setGxpRelevance(product.gxpRelevance ?? '');
    setDataClassification(product.dataClassification ?? '');
    setCriticality(product.criticality ?? '');
    setLifecycle(product.lifecycle);
  }, [product]);

  const isGxp = Boolean(gxpRelevance) && gxpRelevance !== 'NONE';

  const dirty =
    owner !== (product.owner ?? '') ||
    gxpRelevance !== (product.gxpRelevance ?? '') ||
    dataClassification !== (product.dataClassification ?? '') ||
    criticality !== (product.criticality ?? '') ||
    lifecycle !== product.lifecycle;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // Only what this form owns. A PUT carrying the whole product would let a
      // stale copy of a field nobody edited overwrite a concurrent change, and
      // the service already treats an absent key as "leave it alone".
      await onSave({
        owner: owner.trim() || undefined,
        gxpRelevance: gxpRelevance || undefined,
        dataClassification: dataClassification || undefined,
        criticality: criticality || undefined,
        lifecycle,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const outstanding = [
    unmetLabel(product.owner) && 'owner',
    unmetLabel(product.dataClassification) && 'data classification',
    unmetLabel(product.gxpRelevance) && 'GxP relevance',
    Boolean(product.gxpRelevance) &&
      product.gxpRelevance !== 'NONE' &&
      unmetLabel(product.criticality) &&
      'criticality',
  ].filter((v): v is string => typeof v === 'string');

  return (
    <section style={{ marginTop: 24 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={1}
      >
        <Typography variant="h6">Governance</Typography>
        {outstanding.length > 0 ? (
          <Chip
            size="small"
            label={`${outstanding.length} unanswered`}
            style={{
              backgroundColor: NEXORA_TONE.danger.bg,
              color: NEXORA_GREY[50],
              fontWeight: 600,
            }}
          />
        ) : (
          <Chip
            size="small"
            label="Complete"
            style={{
              backgroundColor: NEXORA_TONE.success.bg,
              color: NEXORA_GREY[50],
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      <Typography
        variant="body2"
        color="textSecondary"
        style={{ marginBottom: 12 }}
      >
        {outstanding.length > 0
          ? `The release gate will refuse this product until it states its ${outstanding.join(
              ', ',
            )}.`
          : 'Every obligation the platform policy places on a released product is answered.'}
      </Typography>

      {error && (
        <Box marginBottom={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {/*
          Every field carries an explicit `id`: Material UI v4 generates none,
          and without one the label is not associated with the input at all.
        */}
        <TextField
          id="product-owner"
          label="Owner"
          placeholder="group:default/platform-team"
          helperText="Who is answerable for this product"
          value={owner}
          onChange={e => setOwner(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <TextField
          select
          id="product-gxp-relevance"
          label="GxP relevance"
          helperText="NONE is an answer, not a blank"
          value={gxpRelevance}
          onChange={e => setGxpRelevance(e.target.value as string)}
          style={{ minWidth: 180 }}
        >
          {GXP_RELEVANCE_LEVELS.map(level => (
            <MenuItem key={level} value={level}>
              {level}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          id="product-data-classification"
          label="Data classification"
          value={dataClassification}
          onChange={e => setDataClassification(e.target.value as string)}
          style={{ minWidth: 200 }}
        >
          {DATA_CLASSIFICATIONS.map(level => (
            <MenuItem key={level} value={level}>
              {level}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          id="product-criticality"
          label="Criticality"
          helperText={isGxp ? 'Required for a GxP product' : 'Optional'}
          value={criticality}
          onChange={e => setCriticality(e.target.value as string)}
          style={{ minWidth: 180 }}
        >
          {PRODUCT_CRITICALITIES.map(level => (
            <MenuItem key={level} value={level}>
              {level}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          id="product-lifecycle"
          label="Lifecycle"
          value={lifecycle}
          onChange={e => setLifecycle(e.target.value as string)}
          style={{ minWidth: 180 }}
        >
          {PRODUCT_LIFECYCLES.map(level => (
            <MenuItem key={level} value={level}>
              {level}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          color="primary"
          disabled={!dirty || saving}
          onClick={save}
          style={{ marginTop: 8 }}
        >
          {saving ? 'Saving…' : 'Save governance'}
        </Button>
      </div>
    </section>
  );
}
