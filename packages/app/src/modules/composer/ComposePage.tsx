import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Content,
  Link,
  Page,
  Progress,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  Checkbox,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  COMPOSER_COMPONENT_VERSION,
  COMPOSER_STANDARD_RANGE,
  LibraryPlatformComponent,
  PLATFORM_COMPONENT_CATEGORY_LABELS,
  applyComposerQuery,
  canCreateDataProduct,
  composerArchitectureFromSelection,
  composerDisabledReason,
  composerDraftToManifest,
  composerPath,
  composerPresets,
  composerSelectionKind,
  dependencyLabelsFor,
  documentationHref,
  formatJourneyError,
  groupedLibraryComponents,
  isComposerSelectable,
  isUnauthorizedError,
  officialGoldenPathForDraft,
  platformComponentPath,
  serializeCompositionYaml,
  toLibraryComponents,
  toRelatedPlatformComponents,
  validateComposerDraft,
} from '@internal/platform-common';
import { usePlatformRole } from '@internal/plugin-data-products';
import { CompositionArchitectureVisual } from './CompositionArchitectureVisual';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from '../theme/tokens';
import { BuildingBlocksVisual } from '../platform-components/BuildingBlocksVisual';

const useStyles = makeStyles(theme => ({
  hero: {
    background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
    borderRadius: 16,
    color: '#F8FAFC',
    marginBottom: 24,
    padding: '28px 28px 24px',
  },
  eyebrow: {
    color: PHARMA_TEAL_LIGHT,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.16em',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 'clamp(26px, 4vw, 36px)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    margin: 0,
  },
  principle: {
    color: PHARMA_TEAL_LIGHT,
    fontSize: 18,
    fontWeight: 600,
    marginTop: 10,
  },
  copy: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 1.65,
    marginTop: 10,
    maxWidth: 720,
  },
  note: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 12,
  },
  panel: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    minWidth: 0,
    overflowX: 'hidden',
    padding: 20,
  },
  summary: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    minWidth: 0,
    padding: 20,
    [theme.breakpoints.up('md')]: {
      position: 'sticky',
      top: 16,
    },
  },
  category: {
    border: 0,
    margin: '0 0 20px',
    minInlineSize: 0,
    padding: 0,
  },
  legend: {
    color: PHARMA_NAVY,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.08em',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  card: {
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    height: '100%',
    padding: 12,
  },
  disabledCard: {
    background: '#F8FAFC',
    opacity: 0.72,
  },
  developmentCard: {
    borderLeft: `4px solid ${C.security}`,
  },
  meta: {
    color: C.muted,
    fontSize: 12,
    margin: '4px 0',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  action: {
    background: PHARMA_NAVY,
    border: 0,
    borderRadius: 10,
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.45,
    },
  },
  ghost: {
    background: 'transparent',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: PHARMA_NAVY,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 12px',
  },
  pre: {
    background: PHARMA_NAVY,
    borderRadius: 12,
    color: '#E2E8F0',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    lineHeight: 1.55,
    overflowX: 'auto',
    padding: 16,
    whiteSpace: 'pre-wrap',
  },
  banner: {
    background: '#F8FAFC',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    fontSize: 14,
    marginBottom: 16,
    padding: '10px 14px',
  },
  error: {
    color: '#9A3412',
    fontSize: 14,
    margin: '6px 0',
  },
  check: {
    color: C.muted,
    fontSize: 13,
    margin: '4px 0',
  },
  ok: {
    color: PHARMA_TEAL,
  },
}));

function shortPurpose(component: LibraryPlatformComponent): string {
  const text = component.profile.purpose || component.description;
  return text.length <= 110 ? text : `${text.slice(0, 107).trim()}…`;
}

function checklistLabel(ok: boolean, text: string): string {
  return `${ok ? '✓' : '✗'} ${text}`;
}

export function ComposePage() {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const { role } = usePlatformRole();
  const canEdit = canCreateDataProduct(role);
  const [params] = useSearchParams();
  const [components, setComponents] = useState<LibraryPlatformComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [notice, setNotice] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [presetId, setPresetId] = useState<string>();
  const [draft, setDraft] = useState({
    name: 'new-data-product',
    description: '',
    owner: '',
    domain: '',
    selectedNames: [] as string[],
  });

  useEffect(() => {
    let active = true;
    catalogApi
      .getEntities({ filter: { kind: ['Component', 'API'] } })
      .then(response => {
        if (!active) {
          return;
        }
        const library = toLibraryComponents(
          toRelatedPlatformComponents(response.items),
        );
        setComponents(library);
        const applied = applyComposerQuery(params.get('component'), library);
        if (applied.selectedNames.length > 0 || applied.notice) {
          setDraft(current => ({
            ...current,
            selectedNames: applied.selectedNames,
          }));
          setNotice(applied.notice);
        }
        setLoading(false);
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalogApi, params]);

  const catalog = components;
  const groups = useMemo(() => groupedLibraryComponents(components), [components]);
  const validation = useMemo(
    () => validateComposerDraft(draft, catalog, components),
    [catalog, components, draft],
  );
  const manifest = useMemo(() => composerDraftToManifest(draft), [draft]);
  const yaml = useMemo(() => serializeCompositionYaml(manifest), [manifest]);
  const goldenPath = officialGoldenPathForDraft(draft);
  const selected = draft.selectedNames
    .map(name => components.find(item => item.name === name))
    .filter((item): item is LibraryPlatformComponent => Boolean(item));
  const architecture = composerArchitectureFromSelection(selected);
  const activePreset = composerPresets().find(preset => preset.id === presetId);
  const optionalNames = activePreset?.optionalNames || [];

  const toggle = (name: string, allowed: boolean) => {
    if (!canEdit || !allowed) {
      return;
    }
    setDraft(current => ({
      ...current,
      selectedNames: current.selectedNames.includes(name)
        ? current.selectedNames.filter(item => item !== name)
        : [...current.selectedNames, name],
    }));
    setPresetId(undefined);
    setCopied(false);
  };

  const applyPreset = (id: string) => {
    if (!canEdit) {
      return;
    }
    const preset = composerPresets().find(item => item.id === id);
    if (!preset) {
      return;
    }
    const nextName =
      preset.kind === 'design-example'
        ? 'equipment-use-log'
        : preset.kind === 'oee-reference'
          ? 'oee-data-product-direct'
          : undefined;
    const nextDescription =
      preset.kind === 'design-example'
        ? 'DESIGN EXAMPLE ONLY. Not a Golden Path. Not AVAILABLE. Not CERTIFIED. The developer still owns usage sessions, duration, reason codes, and operator/equipment relationships.'
        : preset.kind === 'oee-reference'
          ? 'Reference composition loaded from OEE Mode A. Loading this example does not alter OEE.'
          : undefined;
    setDraft(current => ({
      ...current,
      name: nextName || current.name,
      description: nextDescription || current.description,
      selectedNames: preset.names.filter(name =>
        components.some(item => item.name === name && isComposerSelectable(item)),
      ),
    }));
    setNotice(
      preset.kind === 'design-example'
        ? 'Equipment Use Log is a DESIGN EXAMPLE. It is not a Golden Path.'
        : undefined,
    );
    setPresetId(preset.id);
    setCopied(false);
  };

  const copyYaml = async () => {
    if (!canEdit) {
      return;
    }
    await navigator.clipboard?.writeText(yaml);
    setCopied(true);
  };

  return (
    <Page themeId="tool">
      <Content>
        <section className={classes.hero} aria-label="Compose Data Product">
          <p className={classes.eyebrow}>Compose Data Product</p>
          <h1 className={classes.title}>Compose Data Product</h1>
          <p className={classes.principle}>
            Build the domain logic. Reuse the platform.
          </p>
          <p className={classes.copy}>
            Select approved Platform Components and create a validated,
            version-controlled Data Product composition.
          </p>
          <p className={classes.note}>
            Composition ≠ Deployment. Composition defines dependencies. It does
            not start infrastructure. The YAML manifest remains canonical.
          </p>
        </section>
        <BuildingBlocksVisual />

        {!canEdit && (
          <p className={classes.banner}>
            Creating or editing a composition requires Developer or above.
            Viewers can inspect this page and read{' '}
            <Link to={documentationHref('platform-component-composition')}>
              composition documentation
            </Link>
            .
          </p>
        )}
        {notice && <p className={classes.banner}>{notice}</p>}
        {loading && <Progress />}
        {error && (
          <Typography variant="body2">
            {isUnauthorizedError(error)
              ? 'Unauthorized'
              : formatJourneyError(error)}
          </Typography>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <div className={classes.panel}>
              <Typography variant="subtitle2">Presets</Typography>
              <div className={classes.actions}>
                {composerPresets().map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className={classes.ghost}
                    disabled={!canEdit}
                    onClick={() => applyPreset(preset.id)}
                    data-testid={`preset-${preset.id}`}
                  >
                    {preset.kind === 'oee-reference'
                      ? 'Load OEE as Example'
                      : preset.title}
                  </button>
                ))}
              </div>
              {activePreset?.kind === 'oee-reference' && (
                <p className={classes.meta}>
                  REFERENCE COMPOSITION — OEE 1.0 · {selected.length} /{' '}
                  {selected.filter(item => item.certificationStatus === 'CERTIFIED').length}{' '}
                  technically CERTIFIED. Loading this example does not alter OEE.
                </p>
              )}
              {activePreset?.kind === 'design-example' && (
                <div data-testid="equipment-use-log-example">
                  <p className={classes.meta}>
                    DESIGN EXAMPLE — not AVAILABLE, not CERTIFIED, not a Golden
                    Path. Required: MQTT Consumer, REST API, Health,
                    Observability. Optional: REST Source, Time-Series Storage.
                    Not currently required: Kafka, PostgreSQL, AAS, UNS, Audit,
                    intelligence.
                  </p>
                  <p className={classes.meta}>
                    Domain logic stays in the Data Product: EquipmentUseEvent,
                    EquipmentStatus, UsageSession, ProductionOrderReference,
                    CleaningReference, MaintenanceReference.
                  </p>
                </div>
              )}

              {groups.map(group => (
                <fieldset
                  key={group.category}
                  className={classes.category}
                  aria-label={PLATFORM_COMPONENT_CATEGORY_LABELS[group.category]}
                >
                  <legend className={classes.legend}>
                    {PLATFORM_COMPONENT_CATEGORY_LABELS[group.category]}
                  </legend>
                  <Grid container spacing={1}>
                    {group.items.map(component => {
                      const kind = composerSelectionKind(component);
                      const allowed = isComposerSelectable(component) && canEdit;
                      const checked = draft.selectedNames.includes(component.name);
                      return (
                        <Grid item xs={12} sm={6} key={component.name}>
                          <div
                            className={`${classes.card} ${
                              kind.startsWith('disabled') ? classes.disabledCard : ''
                            } ${
                              kind === 'selectable-development'
                                ? classes.developmentCard
                                : ''
                            }`}
                            data-testid={`compose-card-${component.name}`}
                            data-kind={kind}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  color="primary"
                                  checked={checked}
                                  disabled={!allowed}
                                  onChange={() =>
                                    toggle(component.name, allowed)
                                  }
                                  inputProps={{
                                    'aria-label': `Select ${component.title}`,
                                  }}
                                />
                              }
                              label={component.title}
                            />
                            <p className={classes.meta}>
                              {PLATFORM_COMPONENT_CATEGORY_LABELS[component.category]}
                              {' · '}v{component.version}
                              {' · '}
                              {component.certificationStatus}
                              {' · '}
                              {component.runtimeAvailability === 'runtime'
                                ? 'Runtime available'
                                : 'Catalog only · No runtime'}
                            </p>
                            <p className={classes.meta}>
                              Compatible Data Product Standard{' '}
                              {component.compatibleStandardVersions.join(', ') ||
                                COMPOSER_STANDARD_RANGE}
                            </p>
                            <p className={classes.meta}>{shortPurpose(component)}</p>
                            {kind === 'selectable-development' && (
                              <p className={classes.meta}>
                                DEVELOPMENT — do not silently promote.
                              </p>
                            )}
                            {kind === 'selectable-warning' && (
                              <p className={classes.meta}>
                                TESTED — not certified.
                              </p>
                            )}
                            {!allowed && (
                              <p className={classes.meta}>
                                {composerDisabledReason(component)}
                              </p>
                            )}
                            {optionalNames.includes(component.name) &&
                              !checked && (
                              <p className={classes.meta}>
                                OPTIONAL for this design — not preselected.
                              </p>
                            )}
                            {dependencyLabelsFor(component, components).length >
                              0 && (
                              <p className={classes.meta}>
                                Requires / works with{' '}
                                {dependencyLabelsFor(component, components).join(
                                  ', ',
                                )}
                              </p>
                            )}
                            <Link to={platformComponentPath(component.name)}>
                              View Component
                            </Link>
                          </div>
                        </Grid>
                      );
                    })}
                  </Grid>
                </fieldset>
              ))}
            </div>
          </Grid>

          <Grid item xs={12} md={4}>
            <aside className={classes.summary} aria-label="Your composition">
              <Typography variant="subtitle1">Your composition</Typography>
              <Typography variant="body2">
                {validation.selectedCount} components selected
              </Typography>
              {selected.map(item => (
                <p key={item.name} className={classes.meta}>
                  {item.title} {COMPOSER_COMPONENT_VERSION} → currently resolves
                  to {item.version} · {item.certificationStatus}
                </p>
              ))}
              <p className={classes.meta}>
                Data Product Standard: {COMPOSER_STANDARD_RANGE}
              </p>
              <div aria-live="polite">
                <p className={`${classes.check} ${validation.checklist.componentsExist ? classes.ok : ''}`}>
                  {checklistLabel(validation.checklist.componentsExist, 'Components exist')}
                </p>
                <p className={`${classes.check} ${validation.checklist.runtimeAvailable ? classes.ok : ''}`}>
                  {checklistLabel(validation.checklist.runtimeAvailable, 'Runtime available')}
                </p>
                <p className={`${classes.check} ${validation.checklist.versionsCompatible ? classes.ok : ''}`}>
                  {checklistLabel(validation.checklist.versionsCompatible, 'Versions compatible')}
                </p>
                <p className={`${classes.check} ${validation.checklist.standardCompatible ? classes.ok : ''}`}>
                  {checklistLabel(validation.checklist.standardCompatible, 'Standard compatible')}
                </p>
                <p className={`${classes.check} ${validation.checklist.dependenciesSatisfied ? classes.ok : ''}`}>
                  {checklistLabel(
                    validation.checklist.dependenciesSatisfied,
                    'Required dependencies satisfied',
                  )}
                </p>
                <p className={`${classes.check} ${validation.checklist.noConflicts ? classes.ok : ''}`}>
                  {checklistLabel(validation.checklist.noConflicts, 'No conflicts')}
                </p>
                {validation.issues.map(issue => (
                  <p key={`${issue.code}-${issue.message}`} className={classes.error}>
                    ERROR {issue.message}
                  </p>
                ))}
              </div>
              <p className={classes.meta} data-testid="certification-summary">
                Component status {validation.certifiedCount} CERTIFIED.
                Composition status {validation.validated ? 'VALIDATED' : 'NOT VALIDATED'}.
                A validated composition is not a CERTIFIED Golden Path.
              </p>
              {selected.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <CompositionArchitectureVisual
                    layers={architecture}
                    productLabel="Data Product"
                  />
                </div>
              )}
              {selected.length > 0 && (
                <div className={classes.banner}>
                  <strong>What will you build?</strong>
                  <p className={classes.meta}>
                    {activePreset?.kind === 'design-example'
                      ? 'Platform provides MQTT ingest, REST API, health and observability. REST Source and Time-Series are optional. You provide EquipmentUseEvent, UsageSession, production-order/cleaning/maintenance references, and business rules. No runtime is generated from this page.'
                      : 'Platform provides integration, storage, API, health and observability. You provide domain models, business rules, domain contracts and application-specific logic.'}
                  </p>
                </div>
              )}
              <TextField
                fullWidth
                label="Composition Name"
                value={draft.name}
                disabled={!canEdit}
                onChange={event =>
                  setDraft(current => ({ ...current, name: event.target.value }))
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Description"
                value={draft.description}
                disabled={!canEdit}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                margin="normal"
                multiline
              />
              <TextField
                fullWidth
                label="Owner"
                value={draft.owner}
                disabled={!canEdit}
                onChange={event =>
                  setDraft(current => ({ ...current, owner: event.target.value }))
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Domain"
                value={draft.domain}
                disabled={!canEdit}
                onChange={event =>
                  setDraft(current => ({ ...current, domain: event.target.value }))
                }
                margin="normal"
              />
              <Typography variant="subtitle2">Manifest preview</Typography>
              <pre className={classes.pre} data-testid="composition-yaml">
                {yaml}
              </pre>
              <div className={classes.actions}>
                <button
                  type="button"
                  className={classes.action}
                  disabled={!canEdit}
                  onClick={copyYaml}
                >
                  {copied ? 'Copied YAML' : 'Copy YAML'}
                </button>
                <a
                  className={classes.ghost}
                  href={`data:text/yaml;charset=utf-8,${encodeURIComponent(yaml)}`}
                  download={`${manifest.metadata.name}.yaml`}
                  aria-disabled={!canEdit}
                  onClick={event => {
                    if (!canEdit) {
                      event.preventDefault();
                    }
                  }}
                  style={{ textDecoration: 'none' }}
                >
                  Download Composition
                </a>
                {goldenPath ? (
                  <Link
                    className={classes.action}
                    to={`/marketplace/${goldenPath}`}
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                  >
                    Continue to Golden Path
                  </Link>
                ) : (
                  <p className={classes.meta} data-testid="custom-composition">
                    CUSTOM COMPOSITION. No official Golden Path currently exists.
                  </p>
                )}
              </div>
              <p className={classes.meta}>
                Client-side draft only. Catalog is not a draft store. YAML is
                the version-controlled source of truth.
              </p>
              <p className={classes.meta}>
                <Link to={documentationHref('platform-component-composer')}>
                  Composer documentation
                </Link>
                {' · '}
                <Link to={composerPath()}>Reset</Link>
              </p>
            </aside>
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
}
