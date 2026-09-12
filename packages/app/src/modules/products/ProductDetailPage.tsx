import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Content,
  ErrorPanel,
  Header,
  Page,
  Progress,
} from '@backstage/core-components';
import {
  Button,
  MenuItem,
  TextField,
  Typography,
  Chip,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import { useApi } from '@backstage/core-plugin-api';
import { scaffolderApiRef } from '@backstage/plugin-scaffolder-react';
import {
  COMPONENT_TYPES,
  INTERFACE_TYPES,
  TRACEABILITY_RELATIONSHIP_TYPES,
} from '@internal/platform-common';
import type {
  PersistedProductManifest,
  Product,
  ProductBaseline,
  ProductComponent,
  ProductVersion,
} from '@internal/platform-common';
import { NEXORA_STATUS } from '@internal/plugin-nexora-common';
import { C } from '../theme/tokens';
import {
  buildUrsChangeRequestDeepLink,
  filterChangeRequestsByProductSoftRefs,
  ursComposerApiRef,
} from '@internal/plugin-urs-composer';
import {
  useComposerClient,
  ApprovedUrsBaselineOption,
  ProductQaReadinessResult,
  ProductTraceability,
  ProductChangeSignalItem,
  ReleaseGateResult,
  UrsBaselinePinStatus,
} from './api';

const GOLDEN_PATH_OPTIONS = [
  {
    templateRef: 'template:default/mqtt-temperature-data-product',
    label: 'MQTT Temperature',
    extraValues: {
      mqttTopic: 'pharma/temperature/+',
    },
  },
  {
    templateRef: 'template:default/rest-equipment-data-product',
    label: 'REST Equipment',
    extraValues: {},
  },
  {
    templateRef: 'template:default/oee-data-product',
    label: 'OEE',
    extraValues: {
      system: 'data-platform',
      site: '',
      area: '',
      line: '',
      equipmentId: 'filler-01',
      defaultWindow: 'HOUR',
      machineStateTopic: 'pharma/oee/+/state',
      counterTopic: 'pharma/oee/+/count',
      mqttTopic: 'pharma/oee/+/+',
      contextUrlRef: 'SOURCE_API_URL',
    },
  },
] as const;

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const client = useComposerClient();
  const scaffolderApi = useApi(scaffolderApiRef);
  const ursApi = useApi(ursComposerApiRef);

  const [product, setProduct] = useState<Product | null>(null);
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [traceability, setTraceability] =
    useState<ProductTraceability | null>(null);
  const [baselines, setBaselines] = useState<ProductBaseline[]>([]);
  const [manifest, setManifest] = useState<PersistedProductManifest | null>(
    null,
  );
  const [approvedUrsOptions, setApprovedUrsOptions] = useState<
    ApprovedUrsBaselineOption[]
  >([]);
  const [selectedUrsBaselineId, setSelectedUrsBaselineId] = useState('');
  const [scaffoldTemplateRef, setScaffoldTemplateRef] = useState<string>(
    GOLDEN_PATH_OPTIONS[0].templateRef,
  );
  const [scaffoldNotice, setScaffoldNotice] = useState<string | null>(null);
  const [scaffoldLoading, setScaffoldLoading] = useState(false);
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
  const [qaReadiness, setQaReadiness] =
    useState<ProductQaReadinessResult | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ursPinStatuses, setUrsPinStatuses] = useState<
    Record<string, UrsBaselinePinStatus>
  >({});
  const [relatedCrs, setRelatedCrs] = useState<ProductChangeSignalItem[]>([]);
  const [relatedCrTotal, setRelatedCrTotal] = useState(0);
  const [relatedCrScanned, setRelatedCrScanned] = useState(0);
  const [relatedCrHydrated, setRelatedCrHydrated] = useState(0);
  const [relatedCrLoading, setRelatedCrLoading] = useState(false);
  const [relatedCrError, setRelatedCrError] = useState<string | null>(null);

  const refreshUrsPinStatuses = async (items: ProductBaseline[]) => {
    const ids = [
      ...new Set(
        items
          .map(b => b.ursBaselineId?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (ids.length === 0) {
      setUrsPinStatuses({});
      return;
    }
    const entries = await Promise.all(
      ids.map(async id => {
        try {
          const status = await client.getUrsBaselinePinStatus(id);
          return [id, status] as const;
        } catch {
          return [
            id,
            {
              id,
              status: 'UNKNOWN',
              baselineVersion: '',
            } satisfies UrsBaselinePinStatus,
          ] as const;
        }
      }),
    );
    setUrsPinStatuses(Object.fromEntries(entries));
  };

  const refreshRelatedChangeRequests = async (
    versionId: string,
    productEntityId: string,
    productBaselines: ProductBaseline[],
  ) => {
    setRelatedCrLoading(true);
    setRelatedCrError(null);
    try {
      try {
        const signals = await client.listProductChangeSignals(versionId);
        setRelatedCrs(
          signals.items.map(item => ({
            ...item,
            id: item.changeRequestId || item.id,
            changeRequestId: item.changeRequestId || item.id,
          })),
        );
        setRelatedCrTotal(signals.ursTotal);
        setRelatedCrScanned(signals.scanned);
        setRelatedCrHydrated(signals.hydratedCount);
        return;
      } catch {
        // Fall back to client soft-match if signals API unavailable
      }

      const result = await ursApi.listChangeRequests(100, 0);
      const baselineIds = [
        ...new Set(
          productBaselines
            .map(b => b.ursBaselineId?.trim())
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const matched = filterChangeRequestsByProductSoftRefs(result.items, {
        productId: productEntityId,
        productVersionId: versionId,
        ursBaselineId: baselineIds[0],
      });
      const byId = new Map(matched.map(item => [item.id, item]));
      for (const baselineId of baselineIds.slice(1)) {
        for (const item of filterChangeRequestsByProductSoftRefs(result.items, {
          ursBaselineId: baselineId,
        })) {
          byId.set(item.id, item);
        }
      }
      setRelatedCrs(
        [...byId.values()].map(cr => ({
          id: cr.id,
          changeRequestId: cr.id,
          title: cr.title,
          status: cr.status,
        })),
      );
      setRelatedCrTotal(result.total);
      setRelatedCrScanned(result.items.length);
      setRelatedCrHydrated(0);
    } catch (e) {
      setRelatedCrs([]);
      setRelatedCrTotal(0);
      setRelatedCrScanned(0);
      setRelatedCrHydrated(0);
      setRelatedCrError((e as Error).message);
    } finally {
      setRelatedCrLoading(false);
    }
  };

  const loadVersionExtras = async (versionId: string) => {
    setComponents(await client.listProductComponents(versionId));
    const nextBaselines = await client.listProductBaselines(versionId);
    setBaselines(nextBaselines);
    await refreshUrsPinStatuses(nextBaselines);
    try {
      setManifest(await client.getProductManifest(versionId));
    } catch {
      setManifest(null);
    }
    if (productId) {
      await refreshRelatedChangeRequests(versionId, productId, nextBaselines);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const productData = await client.getProduct(productId);
      setProduct(productData);
      const versionList = await client.listProductVersions(productId);
      setVersions(versionList);
      if (versionList.length > 0) {
        const latest = versionList[versionList.length - 1];
        const versionId = selectedVersionId || latest.id;
        setSelectedVersionId(versionId);
        await loadVersionExtras(versionId);
      } else {
        setComponents([]);
        setBaselines([]);
        setManifest(null);
        setRelatedCrs([]);
        setRelatedCrTotal(0);
        setRelatedCrScanned(0);
        setRelatedCrError(null);
      }
      try {
        setApprovedUrsOptions(await client.listApprovedUrsBaselines());
      } catch {
        setApprovedUrsOptions([]);
      }
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

  const latestVersion = versions[versions.length - 1];

  const createVersion = async () => {
    try {
      await client.createProductVersion(productId);
      await load();
    } catch (e) {
      setError(e as Error);
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

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: NEXORA_STATUS.pending,
    APPROVED: NEXORA_STATUS.active,
    RELEASE_CANDIDATE: NEXORA_STATUS.warning,
    RELEASED: NEXORA_STATUS.success,
    SUPERSEDED: NEXORA_STATUS.error,
  };

  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  const selectedUrs = approvedUrsOptions.find(
    o => o.id === selectedUrsBaselineId,
  );
  const canCreateBaseline =
    !!selectedVersion &&
    (selectedVersion.status === 'DRAFT' ||
      selectedVersion.status === 'APPROVED' ||
      selectedVersion.status === 'RELEASE_CANDIDATE');

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

  const checkQa = async () => {
    if (!selectedVersionId) return;
    setQaLoading(true);
    setActionError(null);
    try {
      const result = await client.checkQaReadiness(selectedVersionId);
      setQaReadiness(result);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setQaLoading(false);
    }
  };

  const doTransition = async (targetStatus: string) => {
    if (!selectedVersionId) return;
    setTransitionLoading(true);
    setActionError(null);
    try {
      await client.transitionVersionStatus(selectedVersionId, targetStatus);
      setGateResult(null);
      setQaReadiness(null);
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setTransitionLoading(false);
    }
  };

  const createBaseline = async () => {
    if (!selectedVersionId || !selectedUrsBaselineId) {
      setActionError(
        'Select an APPROVED URS baseline before creating a product baseline',
      );
      return;
    }
    setBaselineLoading(true);
    setActionError(null);
    try {
      await client.createProductBaseline(selectedVersionId, {
        ursBaselineId: selectedUrsBaselineId,
      });
      setSelectedUrsBaselineId('');
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBaselineLoading(false);
    }
  };

  const approveBaseline = async (baselineId: string) => {
    setBaselineLoading(true);
    setActionError(null);
    try {
      await client.approveProductBaseline(baselineId);
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBaselineLoading(false);
    }
  };

  const scaffoldFromManifest = async () => {
    if (!selectedVersionId || !product) {
      return;
    }
    const path = GOLDEN_PATH_OPTIONS.find(
      o => o.templateRef === scaffoldTemplateRef,
    );
    if (!path) {
      setActionError('Select an official Golden Path template');
      return;
    }
    setScaffoldLoading(true);
    setActionError(null);
    setScaffoldNotice(null);
    try {
      const binding = await client.getScaffoldBinding(selectedVersionId);
      const response = await scaffolderApi.scaffold({
        templateRef: path.templateRef,
        values: {
          name: binding.productSlug,
          description:
            binding.description?.trim() ||
            product.description?.trim() ||
            product.name,
          owner: binding.owner || product.owner || 'group:default/platform-team',
          domain: binding.domain || product.domain || 'manufacturing',
          repoUrl: `github.com?owner=pharma-data-factory&repo=${binding.productSlug}`,
          ...path.extraValues,
          ...binding.scaffolderPinValues,
        },
      });
      setScaffoldNotice(
        `Scaffolding started (task ${response.taskId}) with Manifest hash ${binding.manifestContentHash.slice(0, 12)}… Track it in the Scaffolder.`,
      );
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setScaffoldLoading(false);
    }
  };

  const TRANSITIONS: Record<string, Array<{ label: string; target: string }>> = {
    DRAFT: [{ label: 'Approve', target: 'APPROVED' }],
    APPROVED: [
      { label: 'Mark as Release Candidate', target: 'RELEASE_CANDIDATE' },
    ],
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
                <Box
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <TextField
                    select
                    label="Version"
                    value={selectedVersionId}
                    onChange={async e => {
                      const id = e.target.value;
                      setSelectedVersionId(id);
                      setGateResult(null);
                      setActionError(null);
                      try {
                        await loadVersionExtras(id);
                      } catch (err) {
                        setActionError((err as Error).message);
                      }
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
                        backgroundColor:
                          STATUS_COLORS[selectedVersion.status] ??
                          NEXORA_STATUS.pending,
                        color: NEXORA_STATUS.onAccent,
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

                {selectedVersion && TRANSITIONS[selectedVersion.status] && (
                  <Box style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {TRANSITIONS[selectedVersion.status].map(t => (
                      <Button
                        key={t.target}
                        variant={
                          t.target === 'RELEASED' ? 'contained' : 'outlined'
                        }
                        color={t.target === 'RELEASED' ? 'primary' : 'default'}
                        disabled={transitionLoading}
                        onClick={() => doTransition(t.target)}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </Box>
                )}

                {selectedVersion &&
                  (selectedVersion.status === 'RELEASE_CANDIDATE' ||
                    selectedVersion.status === 'RELEASED') && (
                    <Card variant="outlined" style={{ marginBottom: 16 }}>
                      <CardContent>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          marginBottom={1}
                        >
                          <Typography variant="subtitle2">
                            {selectedVersion.status === 'RELEASE_CANDIDATE'
                              ? 'Release Gate'
                              : 'QA Readiness'}
                          </Typography>
                          <Box style={{ display: 'flex', gap: 8 }}>
                            {selectedVersion.status === 'RELEASE_CANDIDATE' && (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={gateLoading}
                                onClick={checkGate}
                              >
                                {gateLoading ? 'Checking...' : 'Check Gate'}
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={qaLoading}
                              onClick={checkQa}
                            >
                              {qaLoading ? 'Checking...' : 'QA Readiness'}
                            </Button>
                          </Box>
                        </Box>
                        {qaReadiness && (
                          <Box style={{ marginBottom: 12 }}>
                            <Typography variant="body2">
                              Evidence: {qaReadiness.evidenceCompleteness}
                              {selectedVersion.status !== 'RELEASE_CANDIDATE' &&
                                ' · already RELEASED'}
                              {selectedVersion.status === 'RELEASE_CANDIDATE' &&
                                (qaReadiness.releaseGatePassed
                                  ? ' · Release Gate passed'
                                  : ' · Release Gate not passed')}
                            </Typography>
                            <Typography variant="body2" style={{ marginTop: 4 }}>
                              URS pin: {qaReadiness.ursPinStatus}
                              {qaReadiness.ursSupersededBy
                                ? ` · successor ${qaReadiness.ursSupersededBy.slice(0, 8)}…`
                                : ''}
                            </Typography>
                            {qaReadiness.ursPinStatus === 'SUPERSEDED' && (
                              <Box style={{ marginTop: 8 }}>
                                <Typography
                                  variant="body2"
                                  style={{
                                    color: NEXORA_STATUS.warning,
                                  }}
                                >
                                  {qaReadiness.ursPinMessage ||
                                    'Pinned URS baseline is SUPERSEDED — re-baseline recommended.'}
                                </Typography>
                                {qaReadiness.ursBaselineId && (
                                  <Typography
                                    variant="body2"
                                    style={{ marginTop: 4 }}
                                  >
                                    <RouterLink
                                      to={buildUrsChangeRequestDeepLink({
                                        ursBaselineId: qaReadiness.ursBaselineId,
                                        productVersionId: selectedVersionId,
                                        productId: product?.id,
                                        successor: qaReadiness.ursSupersededBy,
                                      })}
                                    >
                                      Raise URS Change Request
                                    </RouterLink>
                                    {' · '}
                                    soft link only — not GxP validation
                                  </Typography>
                                )}
                              </Box>
                            )}
                            <Typography variant="body2" color="textSecondary">
                              {qaReadiness.message}
                            </Typography>
                          </Box>
                        )}
                        {selectedVersion.status === 'RELEASE_CANDIDATE' &&
                          gateResult &&
                          (gateResult.passed ? (
                            <Box
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <CheckCircleIcon
                                style={{ color: NEXORA_STATUS.success }}
                              />
                              <Typography
                                style={{
                                  color: NEXORA_STATUS.success,
                                  fontWeight: 600,
                                }}
                              >
                                All checks passed — ready to release
                              </Typography>
                            </Box>
                          ) : (
                            <List dense>
                              {gateResult.blockers.map((b, i) => (
                                <ListItem key={i}>
                                  <ErrorIcon
                                    style={{
                                      color: NEXORA_STATUS.error,
                                      marginRight: 8,
                                    }}
                                    fontSize="small"
                                  />
                                  <ListItemText
                                    primary={b.code}
                                    secondary={b.message}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          ))}
                      </CardContent>
                    </Card>
                  )}
              </>
            )}
          </section>

          <section style={{ marginTop: 24 }}>
            <Typography variant="h6" style={{ marginBottom: 12 }}>
              Controlled Product Baseline (URS-linked)
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              style={{ marginBottom: 12 }}
            >
              A controlled product baseline requires exactly one APPROVED URS
              baseline. Technical workflow control only — not a GxP / Part 11
              claim.
            </Typography>
            {Object.values(ursPinStatuses).some(
              s => s.status === 'SUPERSEDED',
            ) && (
              <Box
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border: `1px solid ${NEXORA_STATUS.warning}`,
                  borderRadius: 8,
                  background: '#FFF8E1',
                }}
              >
                <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
                  URS baseline superseded
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  At least one product baseline pins a SUPERSEDED URS baseline.
                  Create a new product baseline against the current APPROVED URS
                  before the next controlled release. Existing RELEASED versions
                  are not auto-changed. Technical advisory only — not GxP
                  validation.
                </Typography>
                {(() => {
                  const superseded = baselines.find(
                    b =>
                      b.ursBaselineId &&
                      ursPinStatuses[b.ursBaselineId]?.status === 'SUPERSEDED',
                  );
                  if (!superseded?.ursBaselineId) {
                    return null;
                  }
                  return (
                    <Typography variant="body2" style={{ marginTop: 8 }}>
                      <RouterLink
                        to={buildUrsChangeRequestDeepLink({
                          ursBaselineId: superseded.ursBaselineId,
                          productVersionId: selectedVersionId || undefined,
                          productId: product?.id,
                          successor:
                            ursPinStatuses[superseded.ursBaselineId]
                              ?.supersededBy,
                        })}
                      >
                        Raise URS Change Request
                      </RouterLink>
                      {' · '}
                      deep-link with soft product refs in CR description
                    </Typography>
                  );
                })()}
              </Box>
            )}
            {canCreateBaseline ? (
              <Box
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <TextField
                  select
                  label="APPROVED URS Baseline"
                  value={selectedUrsBaselineId}
                  onChange={e => setSelectedUrsBaselineId(e.target.value)}
                  style={{ minWidth: 360 }}
                  helperText={
                    (selectedUrs &&
                      `${selectedUrs.solutionName || 'URS'} · v${
                        selectedUrs.baselineVersion
                      } · ${selectedUrs.status}`) ||
                    (approvedUrsOptions.length === 0
                      ? 'No APPROVED URS baselines available'
                      : 'Select from URS Composer')
                  }
                >
                  <MenuItem value="">Select…</MenuItem>
                  {approvedUrsOptions.map(opt => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {`${opt.solutionName || opt.requirementSetId || 'URS'} · ${
                        opt.baselineVersion
                      } · ${opt.id.slice(0, 8)}…`}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={baselineLoading || !selectedUrsBaselineId}
                  onClick={createBaseline}
                >
                  Create product baseline
                </Button>
              </Box>
            ) : (
              <Typography
                variant="body2"
                color="textSecondary"
                style={{ marginBottom: 12 }}
              >
                Select a DRAFT / APPROVED / RELEASE_CANDIDATE version to create a
                baseline.
              </Typography>
            )}

            {baselines.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No product baselines yet.
              </Typography>
            ) : (
              baselines.map(b => (
                <Card key={b.id} variant="outlined" style={{ marginBottom: 12 }}>
                  <CardContent>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="subtitle1">
                        Baseline {b.baselineVersion}{' '}
                        <Chip
                          size="small"
                          label={b.status}
                          style={{ marginLeft: 8 }}
                        />
                        {b.ursBaselineId &&
                          ursPinStatuses[b.ursBaselineId]?.status ===
                            'SUPERSEDED' && (
                            <Chip
                              size="small"
                              label="URS SUPERSEDED"
                              style={{
                                marginLeft: 8,
                                backgroundColor: NEXORA_STATUS.warning,
                                color: '#fff',
                              }}
                            />
                          )}
                      </Typography>
                      {b.status === 'DRAFT' && (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={baselineLoading}
                          onClick={() => approveBaseline(b.id)}
                        >
                          Approve baseline
                        </Button>
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      style={{ marginTop: 8 }}
                    >
                      URS Baseline ID: {b.ursBaselineId || '—'}
                    </Typography>
                    {b.ursBaselineId ? (
                      <Typography variant="body2" style={{ marginTop: 4 }}>
                        <RouterLink to="/urs-composer">
                          Open URS Composer
                        </RouterLink>
                        {' · '}
                        <RouterLink
                          to={`/urs-composer/baselines/${b.ursBaselineId}/changes`}
                        >
                          URS baseline {b.ursBaselineId.slice(0, 8)}…
                        </RouterLink>
                        {ursPinStatuses[b.ursBaselineId]?.status
                          ? ` · live status ${ursPinStatuses[b.ursBaselineId].status}`
                          : ''}
                        {ursPinStatuses[b.ursBaselineId]?.supersededBy
                          ? ` · successor ${ursPinStatuses[b.ursBaselineId].supersededBy!.slice(0, 8)}…`
                          : ''}
                        {ursPinStatuses[b.ursBaselineId]?.status ===
                          'SUPERSEDED' && (
                          <>
                            {' · '}
                            <RouterLink
                              to={buildUrsChangeRequestDeepLink({
                                ursBaselineId: b.ursBaselineId,
                                productVersionId:
                                  selectedVersionId || undefined,
                                productId: product?.id,
                                successor:
                                  ursPinStatuses[b.ursBaselineId]?.supersededBy,
                              })}
                            >
                              Raise CR
                            </RouterLink>
                          </>
                        )}
                      </Typography>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            )}

            <Box style={{ marginTop: 16 }}>
              <Typography variant="subtitle2" style={{ marginBottom: 8 }}>
                Related URS Change Requests
              </Typography>
              <Typography
                variant="body2"
                color="textSecondary"
                style={{ marginBottom: 8 }}
              >
                Soft-matched via Composer change-signals (hydrate-on-read) with
                client soft-match fallback. Scanned latest {relatedCrScanned} of{' '}
                {relatedCrTotal} listed CRs
                {relatedCrHydrated > 0
                  ? ` · hydrated ${relatedCrHydrated}`
                  : ''}
                . Advisory only — not GxP linkage.
              </Typography>
              {relatedCrLoading && <Progress />}
              {relatedCrError && (
                <Typography variant="body2" color="error">
                  Unable to load change requests: {relatedCrError}
                </Typography>
              )}
              {!relatedCrLoading && !relatedCrError && relatedCrs.length === 0 && (
                <Typography variant="body2" color="textSecondary">
                  No soft-matched change requests in the scanned window.
                </Typography>
              )}
              {!relatedCrLoading && relatedCrs.length > 0 && (
                <List dense>
                  {relatedCrs.map(cr => (
                    <ListItem
                      key={cr.changeRequestId || cr.id}
                      disableGutters
                    >
                      <ListItemText
                        primary={
                          <RouterLink
                            to={`/urs-composer/change-requests/${
                              cr.changeRequestId || cr.id
                            }`}
                          >
                            {cr.title || cr.changeRequestId || cr.id}
                          </RouterLink>
                        }
                        secondary={`${cr.status ?? 'UNKNOWN'}${
                          cr.matchAxis ? ` · ${cr.matchAxis}` : ''
                        } · ${(cr.changeRequestId || cr.id).slice(0, 8)}…`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {manifest ? (
              <Card variant="outlined" style={{ marginTop: 16 }}>
                <CardContent>
                  <Typography variant="subtitle2">
                    Product Manifest v{manifest.manifestVersion}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    style={{ marginTop: 8 }}
                  >
                    contentHash: {manifest.contentHash}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ursBaselineId: {manifest.ursBaselineId}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    components: {manifest.document.spec.components.length} ·
                    contracts: {manifest.document.spec.dataContracts.length} ·
                    qualityGates: {manifest.document.spec.qualityGates.length}
                  </Typography>
                  <Box
                    component="pre"
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: C.cardHover,
                      borderRadius: 8,
                      overflow: 'auto',
                      fontSize: 12,
                      maxHeight: 280,
                    }}
                  >
                    {JSON.stringify(manifest.document, null, 2)}
                  </Box>
                </CardContent>
              </Card>
            ) : null}

            <Card variant="outlined" style={{ marginTop: 16 }}>
              <CardContent>
                <Typography variant="subtitle2">
                  Scaffold from Product Manifest
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  style={{ marginTop: 8, marginBottom: 12 }}
                >
                  Requires an APPROVED product baseline with verified Manifest
                  pins. Writes hash and URS baseline id into catalog-info.yaml.
                  Marketplace Create without pins remains available.
                </Typography>
                <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <TextField
                    select
                    label="Golden Path"
                    value={scaffoldTemplateRef}
                    onChange={e => setScaffoldTemplateRef(e.target.value)}
                    style={{ minWidth: 280 }}
                  >
                    {GOLDEN_PATH_OPTIONS.map(opt => (
                      <MenuItem key={opt.templateRef} value={opt.templateRef}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={
                      scaffoldLoading ||
                      !baselines.some(b => b.status === 'APPROVED') ||
                      !manifest
                    }
                    onClick={scaffoldFromManifest}
                  >
                    {scaffoldLoading ? 'Starting…' : 'Scaffold repository'}
                  </Button>
                </Box>
                {scaffoldNotice ? (
                  <Typography
                    variant="body2"
                    style={{ marginTop: 12, color: NEXORA_STATUS.success }}
                  >
                    {scaffoldNotice}
                  </Typography>
                ) : null}
              </CardContent>
            </Card>
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
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={addComponent}
                  >
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
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <Typography variant="subtitle1">
                        {component.name}{' '}
                        <span style={{ color: '#64748B' }}>
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
              <TextField
                label="Requirement ID"
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                placeholder="URS-OUT-001"
                style={{ minWidth: 200 }}
              />
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
                  <Typography
                    key={link.id}
                    variant="body2"
                    style={{ marginTop: 4 }}
                  >
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
