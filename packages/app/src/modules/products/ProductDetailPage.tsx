import { useEffect, useState } from 'react';
import { NEXORA_CARD, NEXORA_GREY, NEXORA_SECURITY_FG, NEXORA_TONE } from '@internal/plugin-nexora-common';
import { useParams } from 'react-router-dom';
import {
  Content,
  ErrorPanel,
  Header,
  Page,
  Progress,
} from '@backstage/core-components';
import { Button, MenuItem, TextField, Typography, Chip, Box, Card, CardContent, List, ListItem, ListItemText } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import { useApi } from '@backstage/core-plugin-api';
import {
  ursComposerApiRef,
  type ApprovedBaselineOption,
} from '@internal/plugin-urs-composer';
import {
  COMPONENT_TYPES,
  INTERFACE_TYPES,
  TRACEABILITY_RELATIONSHIP_TYPES,
} from '@internal/platform-common';
import type {
  Product,
  ProductComponent,
  ProductRequirement,
  ProductRequirementCoverage,
  ProductVersion,
} from '@internal/platform-common';
import { useComposerClient, ProductTraceability, ReleaseGateResult } from './api';

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const client = useComposerClient();
  const ursApi = useApi(ursComposerApiRef);

  const [product, setProduct] = useState<Product | null>(null);
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [traceability, setTraceability] =
    useState<ProductTraceability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [componentName, setComponentName] = useState('');
  const [componentType, setComponentType] = useState<string>(COMPONENT_TYPES[0]);
  const [componentRef, setComponentRef] = useState('');
  const [interfaceType, setInterfaceType] = useState('');

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relationshipType, setRelationshipType] = useState('IMPLEMENTS');

  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [gateResult, setGateResult] = useState<ReleaseGateResult | null>(null);
  const [gateLoading, setGateLoading] = useState(false);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Requirements (Slice 1a / 1b)
  const [requirements, setRequirements] = useState<ProductRequirement[]>([]);
  const [coverage, setCoverage] = useState<ProductRequirementCoverage | null>(
    null,
  );
  const [approvedBaselines, setApprovedBaselines] = useState<
    ApprovedBaselineOption[]
  >([]);
  const [baselineToBind, setBaselineToBind] = useState('');
  const [bindLoading, setBindLoading] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);

  /**
   * Everything scoped to one version: components, requirements, coverage.
   *
   * Previously components were loaded once for the *latest* version while the
   * Release Management picker selected any version, so choosing an older one
   * left the component list describing a different version than the header
   * said. Requirements are per-version by definition, so the mismatch had to
   * be resolved rather than inherited.
   */
  const loadVersionScoped = async (versionId: string) => {
    if (!versionId) {
      setComponents([]);
      setRequirements([]);
      setCoverage(null);
      return;
    }
    setComponents(await client.listProductComponents(versionId));
    setRequirements(await client.listProductRequirements(versionId));
    setCoverage(await client.getRequirementCoverage(versionId));
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const productData = await client.getProduct(productId);
      setProduct(productData);
      const versionList = await client.listProductVersions(productId);
      setVersions(versionList);

      // Keep the user's selection across a reload — binding a baseline or
      // adding a link should not silently jump them to the latest version.
      const stillExists = versionList.some(v => v.id === selectedVersionId);
      const nextSelectedId = stillExists
        ? selectedVersionId
        : versionList[versionList.length - 1]?.id ?? '';
      setSelectedVersionId(nextSelectedId);
      await loadVersionScoped(nextSelectedId);

      setGateResult(null);
      setActionError(null);
      setTraceability(await client.getProductTraceability(productId));
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    // Approved baselines are product-independent and only needed to offer a
    // binding. A failure here must not break the page: the rest of it works
    // without the URS Composer, and the helper text says what is missing.
    let mounted = true;
    ursApi
      .listApprovedBaselines()
      .then(items => {
        if (mounted) {
          setApprovedBaselines(items);
        }
      })
      .catch(() => {
        if (mounted) {
          setApprovedBaselines([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [ursApi]);

  const latestVersion = versions[versions.length - 1];

  const createVersion = async () => {
    try {
      await client.createProductVersion(productId);
      await load();
    } catch (e) {
      setError(e as Error);
    }
  };

  /**
   * Why the baseline picker is disabled, when it is.
   *
   * Both reasons are refusals the server also enforces, so saying which one
   * applies here saves a round trip that would come back as an error message
   * the user could have been shown up front.
   */
  const bindHelperText = (version: ProductVersion): string => {
    if (version.status !== 'DRAFT') {
      return `Version is ${version.status}. A baseline can only be bound while the version is DRAFT.`;
    }
    if (approvedBaselines.length === 0) {
      return 'No approved URS baseline is available. Approve one in the URS Composer first.';
    }
    return 'Only approved baselines are listed.';
  };

  const bindBaseline = async () => {
    if (!baselineToBind || !selectedVersionId) {
      return;
    }
    setBindLoading(true);
    setBindError(null);
    try {
      await client.bindUrsBaseline(selectedVersionId, baselineToBind);
      setBaselineToBind('');
      await load();
    } catch (e) {
      setBindError((e as Error).message);
    } finally {
      setBindLoading(false);
    }
  };

  const addComponent = async () => {
    if (!componentName.trim() || !latestVersion) {
      return;
    }
    try {
      await client.addProductComponent(latestVersion.id, {
        componentType,
        name: componentName.trim(),
        ref: componentRef.trim() || undefined,
        interfaceType: interfaceType || undefined,
      });
      setComponentName('');
      setComponentRef('');
      setInterfaceType('');
      await load();
    } catch (e) {
      setError(e as Error);
    }
  };

  const addLink = async () => {
    if (!sourceId.trim() || !targetId) {
      return;
    }
    try {
      await client.createTraceabilityLink({
        sourceType: 'URS_REQUIREMENT_VERSION',
        sourceId: sourceId.trim(),
        relationshipType,
        targetType: 'PRODUCT_COMPONENT',
        targetId,
      });
      setSourceId('');
      await load();
    } catch (e) {
      setError(e as Error);
    }
  };

  // Version lifecycle, drawn from the shared semantic ramp so it matches the
  // status colours used everywhere else and follows the theme.
  const STATUS_COLORS: Record<string, string> = {
    DRAFT: NEXORA_TONE.neutral.text,
    APPROVED: NEXORA_TONE.active.bg,
    RELEASE_CANDIDATE: NEXORA_SECURITY_FG,
    RELEASED: NEXORA_TONE.success.bg,
    SUPERSEDED: NEXORA_TONE.danger.bg,
  };

  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  const checkGate = async () => {
    if (!selectedVersionId) return;
    setGateLoading(true);
    setActionError(null);
    try {
      const result = await client.checkReleaseGate(selectedVersionId);
      setGateResult(result);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setGateLoading(false);
    }
  };

  const doTransition = async (targetStatus: string) => {
    if (!selectedVersionId) return;
    setTransitionLoading(true);
    setActionError(null);
    try {
      await client.transitionVersionStatus(selectedVersionId, targetStatus);
      setGateResult(null);
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setTransitionLoading(false);
    }
  };

  const TRANSITIONS: Record<string, Array<{ label: string; target: string }>> = {
    DRAFT: [{ label: 'Approve', target: 'APPROVED' }],
    APPROVED: [{ label: 'Mark as Release Candidate', target: 'RELEASE_CANDIDATE' }],
    RELEASE_CANDIDATE: [
      { label: 'Release', target: 'RELEASED' },
      { label: 'Revert to Draft', target: 'DRAFT' },
    ],
    RELEASED: [{ label: 'Supersede', target: 'SUPERSEDED' }],
  };

  if (loading) {
    return (
      <Page themeId="service">
        <Header title="Product" />
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  if (error || !product) {
    return (
      <Page themeId="service">
        <Header title="Product" />
        <Content>
          {error ? (
            <ErrorPanel error={error} />
          ) : (
            <Typography>Product not found.</Typography>
          )}
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="service">
      <Header title={product.name} subtitle={product.productType} />
      <Content>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 0' }}>
          <Typography variant="body2" color="textSecondary">
            {product.description || 'No description'} ·{' '}
            {product.domain || 'no domain'} · {product.lifecycle}
          </Typography>

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
              <Button variant="contained" color="primary" onClick={createVersion}>
                New version
              </Button>
            </div>

            {versions.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No versions yet. Create a version to add components.
              </Typography>
            ) : (
              <>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <TextField
                    select
                    label="Version"
                    value={selectedVersionId}
                    onChange={e => {
                      const nextId = e.target.value as string;
                      setSelectedVersionId(nextId);
                      setGateResult(null);
                      setActionError(null);
                      setBindError(null);
                      loadVersionScoped(nextId).catch(err =>
                        setError(err as Error),
                      );
                    }}
                    style={{ minWidth: 200 }}
                  >
                    {versions.map(v => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.version} ({v.status})
                      </MenuItem>
                    ))}
                  </TextField>
                  {selectedVersion && (
                    <Chip
                      label={selectedVersion.status}
                      style={{
                        backgroundColor: STATUS_COLORS[selectedVersion.status] ?? NEXORA_TONE.neutral.text,
                        color: NEXORA_CARD,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>

                {actionError && (
                  <Box marginBottom={2}>
                    <Typography color="error">{actionError}</Typography>
                  </Box>
                )}

                {/* Transition Buttons */}
                {selectedVersion && TRANSITIONS[selectedVersion.status] && (
                  <Box style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {TRANSITIONS[selectedVersion.status].map(t => (
                      <Button
                        key={t.target}
                        variant={t.target === 'RELEASED' ? 'contained' : 'outlined'}
                        color={t.target === 'RELEASED' ? 'primary' : 'default'}
                        disabled={transitionLoading}
                        onClick={() => doTransition(t.target)}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </Box>
                )}

                {/* Release Gate */}
                {selectedVersion && selectedVersion.status === 'RELEASE_CANDIDATE' && (
                  <Card variant="outlined" style={{ marginBottom: 16 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                        <Typography variant="subtitle2">Release Gate</Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={gateLoading}
                          onClick={checkGate}
                        >
                          {gateLoading ? 'Checking...' : 'Check Gate'}
                        </Button>
                      </Box>
                      {gateResult && (
                        gateResult.passed ? (
                          <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircleIcon style={{ color: NEXORA_TONE.success.text }} />
                            <Typography style={{ color: NEXORA_TONE.success.text, fontWeight: 600 }}>
                              All checks passed — ready to release
                            </Typography>
                          </Box>
                        ) : (
                          <List dense>
                            {gateResult.blockers.map((b, i) => (
                              <ListItem key={i}>
                                <ErrorIcon style={{ color: NEXORA_TONE.danger.text, marginRight: 8 }} fontSize="small" />
                                <ListItemText
                                  primary={b.code}
                                  secondary={b.message}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </section>

          {/*
            Requirements — the joint between an approved URS baseline and this
            product. Placed above Components and Traceability because it is the
            input to both: a component implements a requirement, and a
            traceability link is only meaningful once the requirement it names
            exists here.
          */}
          <section style={{ marginTop: 24 }}>
            <Typography variant="h6" style={{ marginBottom: 12 }}>
              Requirements
            </Typography>

            {!selectedVersion && (
              <Typography variant="body2" color="textSecondary">
                Create a version first. Requirements are bound to a version,
                not to the product, so the version records which requirements
                it was built against.
              </Typography>
            )}

            {selectedVersion && !selectedVersion.ursBaselineId && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Version {selectedVersion.version} is not bound to a URS
                    baseline. Binding copies the approved requirements onto
                    this version, so it keeps the wording it was built against
                    even after the URS is revised.
                  </Typography>
                  <Box style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                      select
                      label="Approved URS baseline"
                      value={baselineToBind}
                      onChange={e => setBaselineToBind(e.target.value)}
                      disabled={
                        selectedVersion.status !== 'DRAFT' ||
                        approvedBaselines.length === 0
                      }
                      style={{ minWidth: 360 }}
                      helperText={bindHelperText(selectedVersion)}
                    >
                      <MenuItem value="">Select…</MenuItem>
                      {approvedBaselines.map(option => (
                        <MenuItem
                          key={option.baselineId}
                          value={option.baselineId}
                        >
                          {option.requirementSetKey} v{option.baselineVersion}
                          {option.solutionName ? ` — ${option.solutionName}` : ''}
                          {` (${option.requirementCount} requirement${
                            option.requirementCount === 1 ? '' : 's'
                          })`}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={
                        !baselineToBind ||
                        bindLoading ||
                        selectedVersion.status !== 'DRAFT'
                      }
                      onClick={bindBaseline}
                    >
                      {bindLoading ? 'Binding…' : 'Bind baseline'}
                    </Button>
                  </Box>
                  {bindError && (
                    <Box marginTop={2}>
                      <Typography color="error" variant="body2">
                        {bindError}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedVersion && selectedVersion.ursBaselineId && (
              <>
                <Box
                  style={{
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    marginBottom: 12,
                  }}
                >
                  <Typography variant="body2">
                    Approved baseline:{' '}
                    <strong>
                      {approvedBaselines.find(
                        option =>
                          option.baselineId === selectedVersion.ursBaselineId,
                      )?.baselineVersion ?? selectedVersion.ursBaselineId}
                    </strong>
                  </Typography>
                  {coverage && (
                    <>
                      <Typography variant="body2">
                        {coverage.total} requirement
                        {coverage.total === 1 ? '' : 's'}
                      </Typography>
                      <Chip
                        size="small"
                        label={`Mapped ${coverage.mapped}`}
                        style={{
                          backgroundColor: NEXORA_TONE.success.bg,
                          color: NEXORA_CARD,
                        }}
                      />
                      <Chip
                        size="small"
                        label={`Unmapped ${coverage.unmapped}`}
                        style={{
                          backgroundColor:
                            coverage.unmapped > 0
                              ? NEXORA_TONE.danger.bg
                              : NEXORA_TONE.neutral.text,
                          color: NEXORA_CARD,
                        }}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Verified ${coverage.verified}`}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          coverage.validationContextId
                            ? `Validated ${coverage.validated}`
                            : 'Validated — unknown'
                        }
                      />
                    </>
                  )}
                </Box>

                {/*
                  "unknown" rather than zero when no ValidationContext resolves.
                  Rendering an unreachable validation-expert as "nothing is
                  validated" states something about the product that was never
                  checked.
                */}
                {coverage && !coverage.validationContextId && (
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    style={{ display: 'block', marginBottom: 8 }}
                  >
                    No validation context resolved for this baseline, so
                    validation status is unknown rather than negative. Create
                    one in the Validation Expert to populate it.
                  </Typography>
                )}

                {coverage?.byRequirement.map(row => {
                  const names = row.componentIds
                    .map(
                      id =>
                        components.find(component => component.id === id)
                          ?.name ?? id,
                    )
                    .join(', ');
                  return (
                    <section
                      key={row.ursRequirementVersionId}
                      style={{
                        border: `1px solid ${NEXORA_GREY[200]}`,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="subtitle1">
                          {row.requirementRef}{' '}
                          <span style={{ color: NEXORA_GREY[500] }}>
                            {row.title}
                          </span>
                        </Typography>
                        <Box style={{ display: 'flex', gap: 8 }}>
                          {row.gxpRelevance && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`GxP ${row.gxpRelevance}`}
                            />
                          )}
                          <Chip
                            size="small"
                            label={row.mapping}
                            style={{
                              backgroundColor:
                                row.mapping === 'MAPPED'
                                  ? NEXORA_TONE.success.bg
                                  : NEXORA_TONE.danger.bg,
                              color: NEXORA_CARD,
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {names ? `Implemented by: ${names}` : 'Not implemented by any component'}
                        {row.testIds.length > 0
                          ? ` · Verified by ${row.testIds.length} test${
                              row.testIds.length === 1 ? '' : 's'
                            }`
                          : ''}
                      </Typography>
                    </section>
                  );
                })}
              </>
            )}
          </section>

          <section style={{ marginTop: 24 }}>
            <Typography variant="h6" style={{ marginBottom: 12 }}>
              Components
            </Typography>
            {latestVersion ? (
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
                    label="Name"
                    value={componentName}
                    onChange={e => setComponentName(e.target.value)}
                    style={{ minWidth: 200 }}
                  />
                  <TextField
                    select
                    label="Type"
                    value={componentType}
                    onChange={e => setComponentType(e.target.value)}
                    style={{ minWidth: 200 }}
                  >
                    {COMPONENT_TYPES.map(type => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Ref"
                    value={componentRef}
                    onChange={e => setComponentRef(e.target.value)}
                    style={{ minWidth: 240 }}
                  />
                  <TextField
                    select
                    label="Interface"
                    value={interfaceType}
                    onChange={e => setInterfaceType(e.target.value)}
                    style={{ minWidth: 160 }}
                  >
                    <MenuItem value="">—</MenuItem>
                    {INTERFACE_TYPES.map(type => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button variant="outlined" color="primary" onClick={addComponent}>
                    Add component
                  </Button>
                </div>
                {components.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No components.
                  </Typography>
                ) : (
                  components.map(component => (
                    <section
                      key={component.id}
                      style={{
                        border: `1px solid ${NEXORA_GREY[200]}`,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <Typography variant="subtitle1">
                        {component.name}{' '}
                        <span style={{ color: NEXORA_GREY[500] }}>
                          {component.componentType}
                        </span>
                      </Typography>
                      {component.ref ? (
                        <Typography variant="body2" color="textSecondary">
                          ref: {component.ref}
                        </Typography>
                      ) : null}
                    </section>
                  ))
                )}
              </>
            ) : (
              <Typography variant="body2" color="textSecondary">
                Create a version first.
              </Typography>
            )}
          </section>

          <section style={{ marginTop: 24 }}>
            <Typography variant="h6" style={{ marginBottom: 12 }}>
              Traceability
            </Typography>
            {traceability ? (
              <Typography variant="body2">
                Coverage: {traceability.coveredComponentCount}/
                {traceability.componentCount} components linked (
                {Math.round(traceability.coverage * 100)}%)
              </Typography>
            ) : null}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                marginTop: 12,
              }}
            >
              {/*
                Was a free-text box with placeholder "URS-OUT-001". A typed id
                matched nothing and nobody found out: the link stored fine,
                reported as coverage, and pointed at a requirement that did not
                exist. Selecting from the bound baseline makes the id a
                reference instead of a string.
              */}
              <TextField
                select
                label="Requirement"
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                disabled={requirements.length === 0}
                style={{ minWidth: 280 }}
                helperText={
                  requirements.length === 0
                    ? 'Bind a URS baseline to this version first.'
                    : undefined
                }
              >
                <MenuItem value="">Select…</MenuItem>
                {requirements.map(requirement => (
                  <MenuItem
                    key={requirement.id}
                    value={requirement.requirementRef}
                  >
                    {requirement.requirementRef} — {requirement.title}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Component"
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                style={{ minWidth: 240 }}
              >
                <MenuItem value="">Select…</MenuItem>
                {components.map(component => (
                  <MenuItem key={component.id} value={component.id}>
                    {component.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Relationship"
                value={relationshipType}
                onChange={e => setRelationshipType(e.target.value)}
                style={{ minWidth: 180 }}
              >
                {TRACEABILITY_RELATIONSHIP_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" color="primary" onClick={addLink}>
                Link requirement
              </Button>
            </div>
            {traceability && traceability.links.length > 0
              ? traceability.links.map(link => (
                  <Typography key={link.id} variant="body2" style={{ marginTop: 4 }}>
                    {link.sourceId} —{link.relationshipType}→ {link.targetId}
                  </Typography>
                ))
              : null}
          </section>
        </div>
      </Content>
    </Page>
  );
}
