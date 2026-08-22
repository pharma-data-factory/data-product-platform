import { useMemo, useState } from 'react';
import { Button, MenuItem, TextField } from '@material-ui/core';
import {
  SHOWCASE_GOLDEN_PATHS,
  filterGoldenPaths,
  type GoldenPathCategory,
} from '@internal/platform-common';
import { C, PHARMA_NAVY, PHARMA_TEAL, PHARMA_TEAL_DARK } from './landingTokens';
import { useLandingI18n } from './landingI18n';

const MARKETPLACE_HREF: Record<string, string> = {
  'mqtt-temperature': '/marketplace/mqtt-temperature-data-product',
  'rest-equipment': '/marketplace/rest-equipment-data-product',
  oee: '/marketplace/oee-data-product',
};

type LossFeatureStatus = 'in-1.0' | 'foundation' | 'planned';

function lossStatusCopy(
  status: LossFeatureStatus,
  labels: { statusIn10: string; statusFoundation: string; statusPlanned: string },
) {
  if (status === 'in-1.0') {
    return labels.statusIn10;
  }
  if (status === 'foundation') {
    return labels.statusFoundation;
  }
  return labels.statusPlanned;
}

function lossStatusStyle(status: LossFeatureStatus) {
  if (status === 'in-1.0') {
    return {
      background: `${PHARMA_TEAL}14`,
      color: PHARMA_TEAL_DARK,
      border: `1px solid ${PHARMA_TEAL}55`,
    };
  }
  if (status === 'foundation') {
    return {
      background: 'rgba(11,31,58,0.06)',
      color: PHARMA_NAVY,
      border: '1px solid rgba(11,31,58,0.18)',
    };
  }
  return {
    background: 'rgba(71,85,105,0.10)',
    color: '#475569',
    border: '1px solid rgba(71,85,105,0.22)',
  };
}

function DetailHeading({ children }: Readonly<{ children: string }>) {
  return (
    <h4
      style={{
        margin: 0,
        color: PHARMA_TEAL,
        fontSize: 12,
        letterSpacing: '0.12em',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        textTransform: 'uppercase',
      }}
    >
      {children}
    </h4>
  );
}

function GoldenPathIcon({ id }: Readonly<{ id: string }>) {
  const common = {
    fill: 'none' as const,
    stroke: PHARMA_TEAL,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="42"
        height="42"
        rx="12"
        fill="rgba(0,194,217,0.08)"
        stroke="rgba(0,194,217,0.35)"
      />
      {id === 'mqtt-temperature' ? (
        <g {...common}>
          <path d="M22 12 v12" />
          <circle cx="22" cy="28" r="5" />
          <path d="M18 16 h8 M18 20 h8" />
        </g>
      ) : null}
      {id === 'rest-equipment' ? (
        <g {...common}>
          <rect x="13" y="14" width="18" height="16" rx="2" />
          <path d="M17 14 v-3 h10 v3 M17 22 h10 M20 18 h4" />
        </g>
      ) : null}
      {id === 'oee' ? (
        <g {...common}>
          <circle cx="22" cy="22" r="10" />
          <path d="M22 22 L28 16" />
          <path d="M16 30 h12" />
        </g>
      ) : null}
      {id === 'snowflake' ? (
        <g {...common}>
          <path d="M14 18 h16 v12 H14 z" />
          <path d="M18 18 v-4 h8 v4 M16 24 h12 M16 28 h8" />
        </g>
      ) : null}
      {id === 'sap' ? (
        <g {...common}>
          <rect x="12" y="14" width="20" height="16" rx="2" />
          <path d="M16 20 h12 M16 24 h8" />
        </g>
      ) : null}
      {id === 'cold-chain' ? (
        <g {...common}>
          <path d="M18 12 v10" />
          <circle cx="18" cy="26" r="4" />
          <rect x="26" y="16" width="8" height="12" rx="1" />
          <path d="M28 20 h4 M28 24 h4" />
        </g>
      ) : null}
    </svg>
  );
}

const SHOWCASE_CATEGORIES = [
  ...new Set(SHOWCASE_GOLDEN_PATHS.map(path => path.category)),
];

function ShowcaseBody({
  compact,
  marketplaceLinks,
}: Readonly<{ compact?: boolean; marketplaceLinks?: boolean }>) {
  const { t } = useLandingI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GoldenPathCategory | 'All'>('All');
  const [openId, setOpenId] = useState<string | null>('mqtt-temperature');
  const extraText = useMemo(() => {
    const haystack: Record<string, string> = {};
    for (const path of SHOWCASE_GOLDEN_PATHS) {
      haystack[path.id] = t.goldenPaths.items[path.id]?.description ?? '';
    }
    return haystack;
  }, [t]);
  const visible = useMemo(
    () => filterGoldenPaths(SHOWCASE_GOLDEN_PATHS, query, category, extraText),
    [category, extraText, query],
  );
  const resolvedOpenId = visible.some(path => path.id === openId)
    ? openId
    : (visible[0]?.id ?? null);
  const openItem = resolvedOpenId ? t.goldenPaths.items[resolvedOpenId] : undefined;
  const openPath = SHOWCASE_GOLDEN_PATHS.find(path => path.id === resolvedOpenId);
  const marketplaceHref =
    resolvedOpenId && openPath?.availability === 'current'
      ? MARKETPLACE_HREF[resolvedOpenId]
      : undefined;

  return (
    <section
      id="golden-paths"
      aria-label="Golden Path showcase"
      style={{ padding: compact ? 0 : '96px 24px', background: compact ? 'transparent' : C.section }}
    >
      <div style={{ maxWidth: compact ? 'none' : 1280, margin: compact ? 0 : '0 auto' }}>
        {!compact ? (
          <>
            <p
              className="pdf-mono"
              style={{
                color: PHARMA_TEAL,
                fontSize: 12,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                margin: '0 0 16px',
              }}
            >
              {t.proof.eyebrow}
            </p>
            <h2
              className="pdf-display"
              style={{
                fontSize: 'clamp(28px, 4vw, 36px)',
                fontWeight: 600,
                lineHeight: 1.2,
                margin: 0,
                color: PHARMA_NAVY,
              }}
            >
              {t.proof.title}
            </h2>
            <p className="pdf-muted" style={{ marginTop: 16, fontSize: 18, lineHeight: 1.7, maxWidth: 720 }}>
              {t.goldenPaths.sub}
            </p>
          </>
        ) : null}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: compact ? 0 : 32,
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
              fontWeight: 600,
              letterSpacing: compact ? '0.04em' : '0.02em',
              textTransform: compact ? 'uppercase' : 'none',
              fontSize: compact ? 14 : 22,
              margin: 0,
            }}
          >
            {t.goldenPaths.heading} ({visible.length})
          </h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              minWidth: 0,
              flex: '1 1 360px',
              justifyContent: 'flex-end',
            }}
          >
            <TextField
              size="small"
              variant="outlined"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={t.goldenPaths.searchPlaceholder}
              inputProps={{ 'aria-label': t.goldenPaths.searchPlaceholder }}
              style={{ minWidth: 220, maxWidth: 320, flex: '1 1 220px' }}
            />
            <div data-testid="golden-path-category-filter">
            <TextField
              select
              size="small"
              variant="outlined"
              id="golden-path-category-filter"
              label={t.goldenPaths.categoryFilter}
              value={category}
              onChange={event =>
                setCategory(event.target.value as GoldenPathCategory | 'All')
              }
              SelectProps={{
                SelectDisplayProps: {
                  'aria-label': t.goldenPaths.categoryFilter,
                },
                MenuProps: { disablePortal: true },
              }}
              style={{ minWidth: 200 }}
            >
              <MenuItem value="All">{t.goldenPaths.categoryAll}</MenuItem>
              {SHOWCASE_CATEGORIES.map(item => (
                <MenuItem key={item} value={item}>
                  {t.goldenPaths.categoryLabels[item] ?? item}
                </MenuItem>
              ))}
            </TextField>
            </div>
          </div>
        </div>
        {visible.length === 0 ? (
          <p style={{ margin: '8px 0 0', fontSize: 15, color: C.muted }}>{t.goldenPaths.empty}</p>
        ) : null}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {visible.map(path => {
            const copy = t.goldenPaths.items[path.id];
            const expanded = resolvedOpenId === path.id;
            const certified = path.availability === 'current';
            const statusLabel = certified ? 'CERTIFIED' : 'PLANNED';
            const statusStyle = certified
              ? {
                  background: `${PHARMA_TEAL}14`,
                  color: PHARMA_TEAL_DARK,
                  border: `1px solid ${PHARMA_TEAL}55`,
                }
              : {
                  background: 'rgba(11,31,58,0.06)',
                  color: PHARMA_NAVY,
                  border: '1px solid rgba(11,31,58,0.18)',
                };
            const categoryLabel =
              t.goldenPaths.categoryLabels[path.category] ?? path.category;
            return (
              <article
                key={path.id}
                style={{
                  background: C.card,
                  border: `1px solid ${expanded ? 'rgba(0,194,217,0.45)' : C.border}`,
                  borderRadius: 16,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <GoldenPathIcon id={path.id} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3
                      className="pdf-display"
                      style={{
                        margin: 0,
                        fontSize: 18,
                        lineHeight: 1.3,
                        fontFamily: "'Space Grotesk', Inter, sans-serif",
                      }}
                    >
                      {path.name}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
                      {t.goldenPaths.byProvider}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      <span
                        className="pdf-mono"
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '4px 10px',
                          borderRadius: 999,
                          ...statusStyle,
                        }}
                      >
                        {statusLabel}
                      </span>
                      {path.version ? (
                        <span
                          className="pdf-mono"
                          aria-label={`Version ${path.version}`}
                          style={{
                            fontSize: 11,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: 'rgba(11,31,58,0.06)',
                            color: PHARMA_NAVY,
                            border: '1px solid rgba(11,31,58,0.18)',
                          }}
                        >
                          {path.version}
                        </span>
                      ) : null}
                      <span
                        className="pdf-mono"
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: `1px solid ${C.border}`,
                          color: C.muted,
                        }}
                      >
                        {categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>
                <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.65, color: C.muted, flex: 1 }}>
                  {copy?.description}
                </p>
                <Button
                  variant="outlined"
                  aria-expanded={expanded}
                  aria-controls="golden-path-detail"
                  onClick={() => setOpenId(path.id)}
                  style={{
                    marginTop: 20,
                    width: '100%',
                    textTransform: 'none',
                    borderColor: PHARMA_TEAL,
                    color: PHARMA_NAVY,
                    fontWeight: 600,
                  }}
                >
                  {t.goldenPaths.explore} {path.name.replace(' Data Product', '')}
                </Button>
              </article>
            );
          })}
        </div>
        {openPath && openItem?.problem ? (
          <article
            id="golden-path-detail"
            aria-label={`${openPath.name} details`}
            style={{
              marginTop: 20,
              padding: 28,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontFamily: "'Space Grotesk', Inter, sans-serif",
                }}
              >
                {openPath.name}
              </h3>
              {openPath.version ? (
                <span
                  className="pdf-mono"
                  aria-label={`Version ${openPath.version}`}
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(11,31,58,0.06)',
                    color: PHARMA_NAVY,
                    border: '1px solid rgba(11,31,58,0.18)',
                  }}
                >
                  {openPath.version}
                </span>
              ) : null}
            </div>
            {openPath.availability === 'future' ? (
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: C.muted,
                  maxWidth: 920,
                }}
              >
                {t.goldenPaths.plannedNote}
              </p>
            ) : null}
            {openItem.definition ? (
              <div style={{ marginTop: 20 }}>
                <DetailHeading>{t.goldenPaths.definitionLabel}</DetailHeading>
                <p style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.7, maxWidth: 920 }}>
                  {openItem.definition}
                </p>
              </div>
            ) : null}
            {openItem.factors?.length ? (
              <div style={{ marginTop: 24 }}>
                <DetailHeading>{t.goldenPaths.factorsLabel}</DetailHeading>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                    marginTop: 12,
                  }}
                >
                  {openItem.factors.map(factor => (
                    <div
                      key={factor.name}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: `1px solid ${C.border}`,
                        background: C.section,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 600,
                          fontSize: 15,
                          fontFamily: "'Space Grotesk', Inter, sans-serif",
                        }}
                      >
                        {factor.name}
                      </p>
                      <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.65, color: C.muted }}>
                        {factor.meaning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {openItem.lossFeatures?.length ? (
              <div style={{ marginTop: 24 }} aria-label={t.goldenPaths.lossLabel}>
                <DetailHeading>{t.goldenPaths.lossLabel}</DetailHeading>
                {openItem.lossIntro ? (
                  <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.65, maxWidth: 920 }}>
                    {openItem.lossIntro}
                  </p>
                ) : null}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  {openItem.lossFeatures.map(feature => {
                    const statusLabel = lossStatusCopy(feature.status, t.goldenPaths);
                    const statusStyle = lossStatusStyle(feature.status);
                    return (
                      <div
                        key={feature.name}
                        style={{
                          padding: 14,
                          borderRadius: 12,
                          border: `1px solid ${C.border}`,
                          background: C.paper,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 8,
                            alignItems: 'flex-start',
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 600,
                              fontSize: 14,
                              fontFamily: "'Space Grotesk', Inter, sans-serif",
                            }}
                          >
                            {feature.name}
                          </p>
                          <span
                            className="pdf-mono"
                            style={{
                              flexShrink: 0,
                              fontSize: 10,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              padding: '3px 8px',
                              borderRadius: 999,
                              ...statusStyle,
                            }}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: C.muted }}>
                          {feature.meaning}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 24,
                marginTop: 24,
              }}
            >
              <div>
                <DetailHeading>{t.goldenPaths.problemLabel}</DetailHeading>
                <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.65 }}>{openItem.problem}</p>
              </div>
              <div>
                <DetailHeading>{t.goldenPaths.logicLabel}</DetailHeading>
                <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.65 }}>{openItem.logic}</p>
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <DetailHeading>{t.goldenPaths.useCasesLabel}</DetailHeading>
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 15, lineHeight: 1.7 }}>
                {openItem.useCases?.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            {marketplaceLinks && marketplaceHref ? (
              <a
                href={marketplaceHref}
                style={{
                  display: 'inline-flex',
                  marginTop: 20,
                  color: PHARMA_NAVY,
                  fontWeight: 600,
                }}
              >
                {t.goldenPaths.explore} · Marketplace
              </a>
            ) : null}
          </article>
        ) : null}
        <p style={{ margin: '24px 0 0', fontSize: 13, lineHeight: 1.6, maxWidth: 720, color: C.muted }}>
          {t.proof.footnote}
        </p>
      </div>
    </section>
  );
}

export function GoldenPathShowcase(
  props: Readonly<{ compact?: boolean; marketplaceLinks?: boolean }>,
) {
  return <ShowcaseBody {...props} />;
}
