import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Content,
  Link,
  Page,
  Progress,
} from '@backstage/core-components';
import { useApi, discoveryApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { scaffolderApiRef } from '@backstage/plugin-scaffolder-react';
import {
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from '@material-ui/core';
import BuildIcon from '@material-ui/icons/Build';
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
  compositionConfigSummary,
  dependencyLabelsFor,
  documentationHref,
  formatJourneyError,
  groupedLibraryComponents,
  isComposerSelectable,
  isUnauthorizedError,
  officialGoldenPathForDraft,
  platformComponentPath,
  serializeCompositionYaml,
  slugifyCompositionName,
  toLibraryComponents,
  toRelatedPlatformComponents,
  validateComposerDraft,
} from '@internal/platform-common';
import { useGoldenPathCompositions } from '@internal/plugin-marketplace';
import { usePlatformRole } from '@internal/plugin-data-products';
import { CompositionArchitectureVisual } from './CompositionArchitectureVisual';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from '../theme/tokens';
import { BuildingBlocksVisual } from '../platform-components/BuildingBlocksVisual';
import {
  NEXORA_CARD,
  NEXORA_GREY,
  NEXORA_TONE,
} from '@internal/plugin-nexora-common';
import {
  suggestComponents,
  SuggestedComponent,
  generateProductSpec,
  applySpecDraft,
  rejectSpecDraft,
  AISpecDraft,
} from './composerApi';

const useStyles = makeStyles(theme => ({
  hero: {
    background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
    borderRadius: 16,
    color: NEXORA_GREY[50],
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
    color: NEXORA_GREY[300],
    fontSize: 15,
    lineHeight: 1.65,
    marginTop: 10,
    maxWidth: 720,
  },
  note: {
    color: NEXORA_GREY[400],
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
    background: NEXORA_GREY[50],
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
    color: NEXORA_CARD,
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
    color: NEXORA_GREY[200],
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    lineHeight: 1.55,
    overflowX: 'auto',
    padding: 16,
    whiteSpace: 'pre-wrap',
  },
  banner: {
    background: NEXORA_GREY[50],
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    fontSize: 14,
    marginBottom: 16,
    padding: '10px 14px',
  },
  error: {
    color: NEXORA_TONE.warning.fg,
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
  aiSection: {
    border: `2px dashed ${NEXORA_GREY[300]}`,
    borderRadius: 12,
    marginBottom: 20,
    padding: 16,
  },
  aiButton: {
    background: PHARMA_NAVY,
    border: 0,
    borderRadius: 10,
    color: NEXORA_CARD,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    gap: 6,
    padding: '8px 14px',
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.45,
    },
  },
  suggestionCard: {
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    marginTop: 8,
    padding: 10,
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
  const scaffolderApi = useApi(scaffolderApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const [backendBaseUrl, setBackendBaseUrl] = useState('');

  useEffect(() => {
    discoveryApi.getBaseUrl('composer').then(url => setBackendBaseUrl(url));
  }, [discoveryApi]);
  const { role } = usePlatformRole();
  const canEdit = canCreateDataProduct(role);
  const [params] = useSearchParams();
  const [components, setComponents] = useState<LibraryPlatformComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [notice, setNotice] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [presetId, setPresetId] = useState<string>();
  const [draft, setDraft] = useState({
    name: 'new-data-product',
    description: '',
    owner: '',
    domain: '',
    selectedNames: [] as string[],
  });
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedComponent[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | undefined>();
  const [selectedSuggestionNames, setSelectedSuggestionNames] = useState<string[]>([]);
  const [specBaselineId, setSpecBaselineId] = useState('');
  const [specDraft, setSpecDraft] = useState<AISpecDraft | null>(null);
  const [specLoading, setSpecLoading] = useState(false);
  const [specError, setSpecError] = useState<string | undefined>();
  const [specApplying, setSpecApplying] = useState(false);
  // Presets, the canonical component order and the Golden Path check all read
  // their component lists from the compositions in the registry. See NXD-029,
  // NXD-031. GP-2 and GP-3 are closed: presets derive from the 'official' and
  // 'examples' maps; the Golden Path check matches against all official
  // compositions rather than OEE alone.
  const { compositions, loading: compositionsLoading } =
    useGoldenPathCompositions();
  const presets = useMemo(
    () => composerPresets(compositions.official, compositions.examples),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compositions],
  );
  // Map of composition name → required refs, used to detect which official
  // Golden Path the user's selection matches.
  const officialRefsMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [name, comp] of compositions.official) {
      m.set(
        name,
        comp.spec.components.filter(c => !c.optional).map(c => c.ref),
      );
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositions]);

  useEffect(() => {
    if (compositionsLoading) {
      return undefined;
    }
    let active = true;
    catalogApi
      .getEntities({ filter: { kind: ['Component', 'API'] } })
      .then(response => {
        if (!active) {
          return;
        }
        const library = toLibraryComponents(
          toRelatedPlatformComponents(response.items),
          compositions.usage,
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
  }, [catalogApi, params, compositions.usage, compositionsLoading]);

  const catalog = components;
  const groups = useMemo(() => groupedLibraryComponents(components), [components]);
  const validation = useMemo(
    () => validateComposerDraft(draft, catalog, components),
    [catalog, components, draft],
  );
  // Composition name that matches the current selection (e.g.
  // 'oee-data-product-direct'), or undefined for a custom composition.
  const goldenPath = officialGoldenPathForDraft(draft, officialRefsMap);
  // The DATA_PRODUCT whose spec.builtFrom points to the matched composition.
  // Used for the Marketplace link and scaffold template — those target the
  // DATA_PRODUCT, not the GOLDEN_PATH composition blueprint.
  const productTarget = goldenPath
    ? (compositions.builtFromIndex.get(goldenPath) ?? goldenPath)
    : undefined;
  // Preferred component order comes from whichever official composition
  // matched; falls back to declaration order for custom compositions.
  const preferredRefs = useMemo(() => {
    if (!goldenPath) {
      return [];
    }
    const comp = compositions.official.get(goldenPath);
    return comp?.spec.components.filter(c => !c.optional).map(c => c.ref) ?? [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goldenPath, compositions]);
  const manifest = useMemo(
    () => composerDraftToManifest(draft, preferredRefs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, preferredRefs],
  );
  const yaml = useMemo(
    () => serializeCompositionYaml(manifest, preferredRefs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manifest, preferredRefs],
  );
  const selected = draft.selectedNames
    .map(name => components.find(item => item.name === name))
    .filter((item): item is LibraryPlatformComponent => Boolean(item));
  const architecture = composerArchitectureFromSelection(selected);
  const configSummary = useMemo(
    () => compositionConfigSummary(selected),
    [selected],
  );
  const activePreset = presets.find(preset => preset.id === presetId);
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
    const preset = presets.find(item => item.id === id);
    if (!preset) {
      return;
    }
    // Official and example presets name themselves after the composition; the
    // description comes from the manifest rather than a hardcoded string.
    const nextName =
      preset.kind === 'official' || preset.kind === 'example'
        ? preset.id
        : undefined;
    const nextDescription =
      preset.kind === 'official' || preset.kind === 'example'
        ? preset.description
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
      preset.kind === 'example'
        ? `${preset.title} is a DESIGN EXAMPLE. It is not a Golden Path.`
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

  const generate = async () => {
    if (!canEdit || !productTarget || !validation.validated) {
      return;
    }
    setGenerating(true);
    setError(undefined);
    try {
      const name = slugifyCompositionName(draft.name);
      const response = await scaffolderApi.scaffold({
        templateRef: `template:default/${productTarget}`,
        values: {
          name,
          description: draft.description.trim() || draft.name,
          owner: draft.owner.trim() || 'group:default/platform-team',
          domain: draft.domain.trim() || 'manufacturing',
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
          repoUrl: `github.com?owner=pharma-data-factory&repo=${name}`,
        },
      });
      setNotice(
        `Scaffolding started (task ${response.taskId}). Track it in the Scaffolder.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!canEdit) {
      return;
    }
    setAiLoading(true);
    setAiError(undefined);
    setAiSuggestions([]);
    setSelectedSuggestionNames([]);
    try {
      const available = components.map(c => ({
        name: c.name,
        title: c.title,
        category: c.category,
        purpose: c.profile.purpose || c.description || '',
        certificationStatus: c.certificationStatus,
      }));
      const results = await suggestComponents(backendBaseUrl, {
        productName: draft.name,
        description: draft.description || draft.name,
        domain: draft.domain || 'manufacturing',
        existingSelections: draft.selectedNames,
        availableComponents: available,
      });
      setAiSuggestions(results);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleSuggestion = (name: string) => {
    setSelectedSuggestionNames(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name],
    );
  };

  const handleAcceptSuggestions = () => {
    if (!canEdit || selectedSuggestionNames.length === 0) {
      return;
    }
    setDraft(current => {
      const newNames = current.selectedNames.slice();
      for (const name of selectedSuggestionNames) {
        if (!newNames.includes(name)) {
          newNames.push(name);
        }
      }
      return { ...current, selectedNames: newNames };
    });
    setAiSuggestions([]);
    setSelectedSuggestionNames([]);
    setCopied(false);
  };

  const handleGenerateSpec = async () => {
    if (!canEdit || !specBaselineId.trim()) return;
    setSpecLoading(true);
    setSpecError(undefined);
    setSpecDraft(null);
    try {
      const productSpec = await generateProductSpec(backendBaseUrl, specBaselineId.trim());
      setSpecDraft(productSpec);
    } catch (err) {
      setSpecError(err instanceof Error ? err.message : String(err));
    } finally {
      setSpecLoading(false);
    }
  };

  const handleApplySpec = async () => {
    if (!specDraft || !canEdit) return;
    setSpecApplying(true);
    setSpecError(undefined);
    try {
      await applySpecDraft(backendBaseUrl, specDraft.id);
      setNotice(`Product "${specDraft.productName}" created from AI spec draft.`);
      setSpecDraft(prev => prev ? { ...prev, status: 'APPLIED' } : null);
    } catch (err) {
      setSpecError(err instanceof Error ? err.message : String(err));
    } finally {
      setSpecApplying(false);
    }
  };

  const handleRejectSpec = async () => {
    if (!specDraft || !canEdit) return;
    setSpecError(undefined);
    try {
      await rejectSpecDraft(backendBaseUrl, specDraft.id);
      setSpecDraft(prev => prev ? { ...prev, status: 'REJECTED' } : null);
    } catch (err) {
      setSpecError(err instanceof Error ? err.message : String(err));
    }
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
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className={classes.ghost}
                    disabled={!canEdit}
                    onClick={() => applyPreset(preset.id)}
                    data-testid={`preset-${preset.id}`}
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
              {activePreset?.kind === 'official' && (
                <p className={classes.meta}>
                  REFERENCE COMPOSITION — {activePreset.title} · {selected.length} /{' '}
                  {selected.filter(item => item.certificationStatus === 'CERTIFIED').length}{' '}
                  technically CERTIFIED. Loading this does not alter the official composition.
                </p>
              )}
              {activePreset?.kind === 'example' && (
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

              <div className={classes.aiSection}>
                <Typography variant="subtitle2">AI Component Suggestions</Typography>
                <p className={classes.meta}>
                  Describe your data product above, then let AI suggest platform components.
                </p>
                <button
                  type="button"
                  className={classes.aiButton}
                  disabled={!canEdit || aiLoading}
                  onClick={handleGenerateSuggestions}
                  data-testid="ai-suggest-components"
                >
                  <BuildIcon style={{ fontSize: 16 }} />
                  {aiLoading ? 'Generating…' : 'Suggest Components'}
                </button>
                {aiError && (
                  <p className={classes.error} style={{ marginTop: 8 }}>
                    {aiError}
                  </p>
                )}
                {aiSuggestions.length > 0 && (
                  <>
                    {aiSuggestions.map(suggestion => {
                      const isSelected = selectedSuggestionNames.includes(suggestion.name);
                      return (
                        <div key={suggestion.name} className={classes.suggestionCard}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                color="primary"
                                checked={isSelected}
                                onChange={() => handleToggleSuggestion(suggestion.name)}
                              />
                            }
                            label={
                              <span>
                                <strong>{suggestion.name}</strong>{' '}
                                <Chip
                                  label={suggestion.priority}
                                  size="small"
                                  color={suggestion.priority === 'required' ? 'secondary' : 'default'}
                                  style={{ marginLeft: 4 }}
                                />
                              </span>
                            }
                          />
                          <p className={classes.meta}>{suggestion.reason}</p>
                        </div>
                      );
                    })}
                    {selectedSuggestionNames.length > 0 && (
                      <button
                        type="button"
                        className={classes.action}
                        style={{ marginTop: 12 }}
                        onClick={handleAcceptSuggestions}
                        data-testid="ai-accept-suggestions"
                      >
                        Accept {selectedSuggestionNames.length} Selected
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className={classes.aiSection}>
                <Typography variant="subtitle2">AI Product Spec Generator</Typography>
                <p className={classes.meta}>
                  Generate a complete product specification from an approved URS baseline.
                  The AI analyzes requirements and suggests components with full traceability.
                  Human review is mandatory before applying.
                </p>
                <TextField
                  fullWidth
                  label="URS Baseline ID"
                  value={specBaselineId}
                  disabled={!canEdit || specLoading}
                  onChange={event => setSpecBaselineId(event.target.value)}
                  margin="normal"
                  placeholder="Paste an approved URS baseline ID"
                />
                <button
                  type="button"
                  className={classes.aiButton}
                  disabled={!canEdit || specLoading || !specBaselineId.trim()}
                  onClick={handleGenerateSpec}
                  data-testid="ai-generate-spec"
                >
                  <BuildIcon style={{ fontSize: 16 }} />
                  {specLoading ? 'Generating…' : 'Generate from URS'}
                </button>
                {specError && (
                  <p className={classes.error} style={{ marginTop: 8 }}>
                    {specError}
                  </p>
                )}
                {specDraft && specDraft.status === 'PENDING_REVIEW' && (
                  <div style={{ marginTop: 16 }}>
                    <Typography variant="subtitle2">Review AI Specification</Typography>
                    <TextField
                      fullWidth
                      label="Product Name"
                      value={specDraft.productName}
                      disabled={!canEdit}
                      onChange={event =>
                        setSpecDraft(prev => prev ? { ...prev, productName: event.target.value } : null)
                      }
                      margin="dense"
                    />
                    <TextField
                      fullWidth
                      label="Description"
                      value={specDraft.description}
                      disabled={!canEdit}
                      onChange={event =>
                        setSpecDraft(prev => prev ? { ...prev, description: event.target.value } : null)
                      }
                      margin="dense"
                      multiline
                    />
                    <TextField
                      fullWidth
                      label="Domain"
                      value={specDraft.domain}
                      disabled={!canEdit}
                      onChange={event =>
                        setSpecDraft(prev => prev ? { ...prev, domain: event.target.value } : null)
                      }
                      margin="dense"
                    />
                    <Typography variant="subtitle2" style={{ marginTop: 12 }}>
                      Suggested Components ({specDraft.suggestedComponents.length})
                    </Typography>
                    {specDraft.suggestedComponents.map((comp, idx) => (
                      <div key={`${comp.name}-${idx}`} className={classes.suggestionCard}>
                        <strong>{comp.name}</strong>
                        <Chip
                          label={comp.priority}
                          size="small"
                          color={comp.priority === 'required' ? 'secondary' : 'default'}
                          style={{ marginLeft: 4 }}
                        />
                        <p className={classes.meta}>{comp.reason}</p>
                        {comp.traceabilityRefs.length > 0 && (
                          <p className={classes.meta}>
                            Traceability: {comp.traceabilityRefs.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                    {specDraft.suggestedContracts.length > 0 && (
                      <>
                        <Typography variant="subtitle2" style={{ marginTop: 12 }}>
                          Suggested Contracts ({specDraft.suggestedContracts.length})
                        </Typography>
                        {specDraft.suggestedContracts.map((contract, idx) => (
                          <div key={`${contract.name}-${idx}`} className={classes.suggestionCard}>
                            <strong>{contract.name}</strong>
                            <Chip label={contract.type} size="small" style={{ marginLeft: 4 }} />
                            <p className={classes.meta}>{contract.description}</p>
                          </div>
                        ))}
                      </>
                    )}
                    <div className={classes.actions} style={{ marginTop: 16 }}>
                      <button
                        type="button"
                        className={classes.action}
                        disabled={!canEdit || specApplying}
                        onClick={handleApplySpec}
                        data-testid="ai-apply-spec"
                      >
                        {specApplying ? 'Applying…' : 'Apply AI Spec'}
                      </button>
                      <button
                        type="button"
                        className={classes.ghost}
                        disabled={!canEdit}
                        onClick={handleRejectSpec}
                        data-testid="ai-reject-spec"
                      >
                        Reject
                      </button>
                    </div>
                    <p className={classes.meta} style={{ marginTop: 8 }}>
                      Generated by {specDraft.generatedBy} at {new Date(specDraft.generatedAt).toLocaleString()}.
                      Applying creates a new Product with version and components. This action is audited.
                    </p>
                  </div>
                )}
                {specDraft && specDraft.status === 'APPLIED' && (
                  <p className={classes.banner} style={{ marginTop: 12 }}>
                    Spec applied successfully. Product &quot;{specDraft.productName}&quot; has been created.
                  </p>
                )}
                {specDraft && specDraft.status === 'REJECTED' && (
                  <p className={classes.meta} style={{ marginTop: 12 }}>
                    Spec draft rejected.
                  </p>
                )}
              </div>

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
                Component status {validation.certifiedCount} CERTIFIED
                (technical certification — not GMP validation).
                Composition status {validation.validated ? 'VALIDATED' : 'NOT VALIDATED'}
                (technical composition check — not GMP validation).
                A validated composition is not a CERTIFIED Golden Path.
                Platform validation status remains NOT_VALIDATED.
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
                    {activePreset?.kind === 'example'
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
                {productTarget ? (
                  <>
                    <button
                      type="button"
                      className={classes.action}
                      disabled={!canEdit || generating || !validation.validated}
                      onClick={generate}
                      data-testid="generate-data-product"
                    >
                      {generating ? 'Starting scaffold…' : 'Generate Data Product'}
                    </button>
                    <Link
                      className={classes.ghost}
                      to={`/marketplace/${productTarget}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                      }}
                    >
                      Continue to Golden Path
                    </Link>
                  </>
                ) : (
                  <p className={classes.meta} data-testid="custom-composition">
                    CUSTOM COMPOSITION. No official Golden Path currently exists.
                  </p>
                )}
              </div>
              {configSummary.totalCount > 0 && (
                <div data-testid="config-summary">
                  <Typography variant="subtitle2" style={{ marginTop: 16 }}>
                    Configuration checklist ({configSummary.totalCount} keys)
                  </Typography>
                  <p className={classes.meta}>
                    Environment variables your Data Product must supply at
                    runtime. Set them in your .env file or deployment secrets.
                  </p>
                  {configSummary.keys.map(({ key, componentTitle, secret, description }) => (
                    <p key={key} className={classes.meta}>
                      <code>{key}</code>
                      {secret && (
                        <span
                          title="Secret — store in deployment secrets, never in .env committed to source control"
                          style={{
                            marginLeft: 4,
                            fontSize: '0.75em',
                            background: NEXORA_TONE.danger.bg,
                            color: NEXORA_TONE.danger.fg,
                            borderRadius: 3,
                            padding: '1px 4px',
                          }}
                        >
                          SECRET
                        </span>
                      )}{' '}
                      <span style={{ color: 'inherit', opacity: 0.6 }}>
                        — {componentTitle}{description ? `: ${description}` : ''}
                      </span>
                    </p>
                  ))}
                  {configSummary.notes.map(({ componentTitle, note }) => (
                    <p key={componentTitle} className={classes.meta}>
                      <em>{componentTitle}:</em> {note}
                    </p>
                  ))}
                </div>
              )}
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
