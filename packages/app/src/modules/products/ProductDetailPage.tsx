import { useEffect, useState } from 'react';
import { NEXORA_CARD, NEXORA_SECURITY_FG, NEXORA_TONE } from '@internal/plugin-nexora-common';
import { useParams } from 'react-router-dom';
import {
  Content,
  ErrorPanel,
  Header,
  InfoCard,
  Page,
  Progress,
} from '@backstage/core-components';
import { Box, Chip, MenuItem, Tab, Tabs, TextField, Typography } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import {
  ursComposerApiRef,
  type ApprovedBaselineOption,
} from '@internal/plugin-urs-composer';
import type {
  Product,
  ProductBaseline,
  ProductComponent,
  ProductRequirement,
  ProductRequirementCoverage,
  ProductVersion,
} from '@internal/platform-common';
import { useComposerClient, ProductTraceability, ReleaseGateResult } from './api';
import { OverviewTab } from './tabs/OverviewTab';
import { RequirementsTab } from './tabs/RequirementsTab';
import { ArchitectureTab } from './tabs/ArchitectureTab';
import { DevelopmentTab } from './tabs/DevelopmentTab';
import {
  ContractsTab,
  type ConsumedContract,
  type ProvidedContracts,
} from './tabs/ContractsTab';
import { TestsTab } from './tabs/TestsTab';
import { ValidationTab } from './tabs/ValidationTab';

/**
 * The Product page (NXD-056).
 *
 * Six tabs, not the seven the record names: *Development* is missing because
 * nothing on the Product joins it to a repository — that identity is created
 * by Step 2 of the URS → Product roadmap, and a tab pointing at nothing is
 * worse than a tab that is not there yet.
 *
 * The version picker sits above the tab bar rather than inside one. Every tab
 * except Overview reads version-scoped data, so a picker per tab would
 * recreate exactly the mismatch NXD-055 removed from the read path.
 */
export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const client = useComposerClient();
  const ursApi = useApi(ursComposerApiRef);

  const [tab, setTab] = useState('overview');

  const [product, setProduct] = useState<Product | null>(null);
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [traceability, setTraceability] =
    useState<ProductTraceability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
  const [bindLoading, setBindLoading] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);

  /**
   * Tab-scoped data, loaded when its tab is first opened for a version.
   *
   * Contracts fan out one request per component, so they do not belong in the
   * load every version switch runs. `null` means "not loaded yet" and is what
   * triggers the fetch; `loadVersionScoped` resets them, so a version switch
   * invalidates them.
   *
   * The page still owns the fetch. A tab that loaded its own data would also
   * need its own refresh path after every mutation, and there would be six of
   * those instead of one `load()`.
   */
  const [providedContracts, setProvidedContracts] = useState<
    ProvidedContracts[] | null
  >(null);
  const [consumedContracts, setConsumedContracts] = useState<
    ConsumedContract[] | null
  >(null);
  const [tabError, setTabError] = useState<string | null>(null);

  /**
   * Baselines, loaded with the version rather than with a tab.
   *
   * They used to be lazy behind the Tests tab, on the grounds that build
   * evidence was a question no other tab asked. Overview now creates and
   * approves them, so that is no longer true — and a section that can mutate
   * the list has to be looking at a loaded one.
   */
  const [baselines, setBaselines] = useState<ProductBaseline[] | null>(null);
  const [baselineBusy, setBaselineBusy] = useState(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);

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
    setProvidedContracts(null);
    setConsumedContracts(null);
    setBaselines(null);
    setTabError(null);
    setBaselineError(null);
    if (!versionId) {
      setComponents([]);
      setRequirements([]);
      setCoverage(null);
      return;
    }
    setComponents(await client.listProductComponents(versionId));
    setRequirements(await client.listProductRequirements(versionId));
    setCoverage(await client.getRequirementCoverage(versionId));
    setBaselines(await client.listProductBaselines(versionId));
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

  useEffect(() => {
    // Lazy tab data. Guarded on `null` so reopening a tab does not refetch,
    // and cancelled on unmount so a slow response cannot write into a page
    // that has moved on to another version.
    if (!selectedVersionId) {
      return undefined;
    }
    let cancelled = false;

    const loadTabData = async () => {
      // One error slot for both lazy tabs, so it has to be cleared on the way
      // in — otherwise a failed contract fetch would still be on screen while
      // the Tests tab reports fine.
      setTabError(null);
      try {
        if (tab === 'contracts' && providedContracts === null) {
          const provided = await Promise.all(
            components.map(async component => ({
              component,
              contracts: await client.listComponentContracts(component.id),
            })),
          );
          const dependencies =
            await client.listVersionDependencies(selectedVersionId);
          // A dependency carries only a contract id. Resolve each one so the
          // list shows coordinates; an id that resolves to nothing is a
          // broken reference and is rendered as one.
          const consumed = await Promise.all(
            dependencies.map(async dependency => ({
              dependency,
              contract: await client
                .getContract(dependency.contractId)
                .catch(() => undefined),
            })),
          );
          if (!cancelled) {
            setProvidedContracts(provided);
            setConsumedContracts(consumed);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setTabError((e as Error).message);
        }
      }
    };

    loadTabData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedVersionId, components]);

  const createVersion = async () => {
    try {
      await client.createProductVersion(productId);
      await load();
    } catch (e) {
      setError(e as Error);
    }
  };

  const bindBaseline = async (ursBaselineId: string) => {
    if (!ursBaselineId || !selectedVersionId) {
      return;
    }
    setBindLoading(true);
    setBindError(null);
    try {
      await client.bindUrsBaseline(selectedVersionId, ursBaselineId);
      await load();
    } catch (e) {
      setBindError((e as Error).message);
    } finally {
      setBindLoading(false);
    }
  };

  /**
   * Saves the governance fields the release gate requires.
   *
   * Rethrows so the card can show the failure next to the form the user is
   * looking at, rather than replacing the page with an error panel over four
   * fields they can still fix.
   */
  const saveGovernance = async (input: Record<string, unknown>) => {
    const updated = await client.updateProduct(productId, input);
    setProduct(updated);
    // A governance change can clear a gate blocker, so a gate result computed
    // before it is stale rather than merely old.
    setGateResult(null);
  };

  const refreshBaselines = async (versionId: string) => {
    setBaselines(await client.listProductBaselines(versionId));
  };

  const createBaseline = async (baselineVersion?: string) => {
    if (!selectedVersionId) {
      return;
    }
    setBaselineBusy(true);
    setBaselineError(null);
    try {
      await client.createProductBaseline(
        selectedVersionId,
        baselineVersion ? { baselineVersion } : {},
      );
      await refreshBaselines(selectedVersionId);
      setGateResult(null);
    } catch (e) {
      setBaselineError((e as Error).message);
    } finally {
      setBaselineBusy(false);
    }
  };

  const approveBaseline = async (baselineId: string) => {
    if (!selectedVersionId) {
      return;
    }
    setBaselineBusy(true);
    setBaselineError(null);
    try {
      await client.approveProductBaseline(baselineId);
      await refreshBaselines(selectedVersionId);
      setGateResult(null);
    } catch (e) {
      setBaselineError((e as Error).message);
    } finally {
      setBaselineBusy(false);
    }
  };

  const addComponent = async (input: Record<string, unknown>) => {
    if (!selectedVersionId) {
      return;
    }
    try {
      await client.addProductComponent(selectedVersionId, input);
      await load();
    } catch (e) {
      setError(e as Error);
    }
  };

  const addLink = async (input: Record<string, unknown>) => {
    try {
      await client.createTraceabilityLink(input);
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
        {/*
          The tab bar stays on the app canvas; everything else sits on a
          surface.

          `public/index.html` paints `html, body, #root` in the deep navy of
          the signed-out marketing shell, and Material UI v4 injects its styles
          above that static rule, so CssBaseline's `background.default` never
          wins. A page that renders bare text therefore puts this theme's
          near-black type straight onto that navy — measured at a contrast
          ratio of roughly 1.05:1, which is invisible.

          Every readable page in this app answers that the same way: content on
          `InfoCard` surfaces, tab bar on the canvas (see
          `DataProductDetailPage`). The split matters — an inactive tab label
          uses the cyan accent, which reads at about 8:1 on the navy and 2.2:1
          on white, so pulling the tabs onto the card would trade one contrast
          failure for another.

          Fixing it here rather than in the theme is deliberate: `/compose` and
          `/model-company` are designed *for* the dark canvas, so repainting the
          canvas globally fixes this page by breaking those two.
        */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 0' }}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            style={{ marginBottom: 16 }}
          >
            <Tab value="overview" label="Overview" />
            <Tab value="requirements" label="Requirements" />
            <Tab value="architecture" label="Architecture" />
            {/*
              The seventh tab NXD-056 named and did not build, because until
              Step 2 nothing joined a Product to a repository. String keys, as
              that record required, so inserting it here moved nothing.
            */}
            <Tab value="development" label="Development" />
            <Tab value="contracts" label="Contracts" />
            <Tab value="tests" label="Tests" />
            <Tab value="validation" label="Validation" />
          </Tabs>

          <InfoCard>
          {versions.length > 0 && (
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/*
                Every field on this page carries an explicit `id`. A Material
                UI v4 TextField does not generate one, and without it the
                label is not associated with the input at all — the control is
                unlabelled for a screen reader.
              */}
              <TextField
                select
                id="product-version"
                label="Version"
                value={selectedVersionId}
                onChange={e => {
                  const nextId = e.target.value as string;
                  setSelectedVersionId(nextId);
                  setGateResult(null);
                  setActionError(null);
                  setBindError(null);
                  loadVersionScoped(nextId).catch(err => setError(err as Error));
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
                      NEXORA_TONE.neutral.text,
                    color: NEXORA_CARD,
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          )}

          {tab === 'overview' && (
            <OverviewTab
              product={product}
              versions={versions}
              selectedVersion={selectedVersion}
              gateResult={gateResult}
              gateLoading={gateLoading}
              transitionLoading={transitionLoading}
              actionError={actionError}
              baselines={baselines}
              baselineBusy={baselineBusy}
              baselineError={baselineError}
              onCreateVersion={createVersion}
              onCheckGate={checkGate}
              onTransition={doTransition}
              onSaveGovernance={saveGovernance}
              onCreateBaseline={createBaseline}
              onApproveBaseline={approveBaseline}
            />
          )}

          {tab === 'requirements' && (
            <RequirementsTab
              selectedVersion={selectedVersion}
              components={components}
              coverage={coverage}
              approvedBaselines={approvedBaselines}
              bindLoading={bindLoading}
              bindError={bindError}
              onBindBaseline={bindBaseline}
            />
          )}

          {tab === 'architecture' && (
            <ArchitectureTab
              selectedVersion={selectedVersion}
              components={components}
              requirements={requirements}
              traceability={traceability}
              onAddComponent={addComponent}
              onAddLink={addLink}
            />
          )}

          {tab === 'development' && (
            <DevelopmentTab product={product} baselines={baselines} />
          )}

          {tab === 'contracts' && (
            <ContractsTab
              providedContracts={providedContracts}
              consumedContracts={consumedContracts}
              error={tabError}
            />
          )}

          {tab === 'tests' && (
            <TestsTab
              coverage={coverage}
              baselines={baselines}
              error={tabError}
            />
          )}

          {tab === 'validation' && <ValidationTab coverage={coverage} />}
          </InfoCard>
        </div>
      </Content>
    </Page>
  );
}
