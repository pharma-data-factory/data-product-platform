import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import {
  ecosystemCopy,
  type EcosystemLocale,
  type MarketplaceCard,
} from './ecosystemCopy';
import { useLandingI18n } from './landingI18n';
import { C, PHARMA_NAVY, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from './landingTokens';
import { NxIcon, type NxIconName } from './home/icons';

function useCopy() {
  const { locale } = useLandingI18n();
  return ecosystemCopy[locale as EcosystemLocale];
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return undefined;
    }
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('pdf-in');
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('pdf-in');
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className="pdf-reveal"
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div
      className="pdf-mono"
      style={{
        color,
        fontSize: 12,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ display: 'inline-block', width: 24, height: 1, background: color }} />
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  color,
  title,
  sub,
}: {
  eyebrow: string;
  color: string;
  title: string;
  sub?: string;
}) {
  return (
    <div style={{ maxWidth: 760, marginBottom: 40 }}>
      <Eyebrow color={color}>{eyebrow}</Eyebrow>
      <h2
        className="pdf-display"
        style={{
          fontSize: 'clamp(28px, 4vw, 38px)',
          fontWeight: 600,
          lineHeight: 1.2,
          margin: 0,
          color: PHARMA_NAVY,
        }}
      >
        {title}
      </h2>
      {sub && (
        <p className="pdf-muted" style={{ marginTop: 16, fontSize: 18, lineHeight: 1.7 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function sectionStyle(background: string): CSSProperties {
  return { padding: '96px 24px', background };
}

function innerStyle(): CSSProperties {
  return { maxWidth: 1280, margin: '0 auto' };
}

function statusTone(status: MarketplaceCard['status']) {
  switch (status) {
    case 'certified':
      return {
        bg: `${PHARMA_TEAL}14`,
        color: '#007E90',
        border: `${PHARMA_TEAL}55`,
      };
    case 'available':
      return {
        bg: 'rgba(11,31,58,0.06)',
        color: PHARMA_NAVY,
        border: 'rgba(11,31,58,0.18)',
      };
    case 'preview':
      return {
        bg: 'rgba(71,85,105,0.10)',
        color: '#475569',
        border: 'rgba(71,85,105,0.22)',
      };
    case 'example':
    default:
      return {
        bg: 'rgba(255,138,0,0.12)',
        color: '#B45309',
        border: 'rgba(255,138,0,0.35)',
      };
  }
}

function StatusBadge({ card }: { card: MarketplaceCard }) {
  const tone = statusTone(card.status);
  return (
    <span
      className="pdf-mono"
      style={{
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 999,
        background: tone.bg,
        color: tone.color,
        border: `1px solid ${tone.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {card.statusLabel}
    </span>
  );
}

export function ProblemSection() {
  const c = useCopy();
  return (
    <section id="problem" aria-label="The problem" style={sectionStyle(C.section)}>
      <div style={innerStyle()}>
        <SectionHeading eyebrow={c.problem.eyebrow} color={PHARMA_NAVY} title={c.problem.title} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)', gap: 48, alignItems: 'start' }}>
          <Reveal>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: C.muted, margin: 0 }}>{c.problem.body}</p>
            <p style={{ marginTop: 24, fontSize: 16, fontWeight: 600, color: PHARMA_NAVY }}>
              {c.problem.note}
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {c.problem.systems.map(system => (
                <span
                  key={system}
                  className="pdf-mono"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    background: C.paper,
                    fontSize: 13,
                    color: C.text,
                  }}
                >
                  {system}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function PlatformSection() {
  const c = useCopy();
  const aboveIcons: NxIconName[] = ['puzzle', 'events', 'trend', 'mqtt', 'apis', 'files'];
  return (
    <section id="platform" aria-label="The Nexora platform" style={sectionStyle(C.base)}>
      <div style={innerStyle()}>
        <SectionHeading eyebrow={c.platform.eyebrow} color={PHARMA_TEAL} title={c.platform.title} sub={c.platform.body} />
        <div style={{ display: 'grid', gap: 16 }}>
          <Reveal>
            <div className="pdf-card" style={{ padding: 24 }}>
              <p className="pdf-mono" style={{ margin: '0 0 12px', color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {c.platform.belowLabel}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {c.platform.below.map(item => (
                  <span key={item} className="pdf-mono" style={{ padding: '8px 12px', borderRadius: 999, border: `1px solid ${C.border}`, fontSize: 13 }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <div style={{ textAlign: 'center', color: PHARMA_TEAL, fontSize: 20, lineHeight: 1 }} aria-hidden="true">
              ↓
            </div>
            <div
              className="pdf-card"
              style={{
                padding: 28,
                borderColor: 'rgba(0,194,217,0.45)',
                background: 'linear-gradient(180deg, rgba(0,194,217,0.06), #FFFFFF)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span className="pdf-display" style={{ fontWeight: 700, fontSize: 20, color: PHARMA_NAVY }}>NEXORA</span>
                <span className="pdf-mono" style={{ color: PHARMA_TEAL, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  {c.platform.capabilitiesLabel}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {c.platform.capabilities.map(cap => (
                  <div key={cap.title} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff' }}>
                    <p className="pdf-mono" style={{ margin: 0, color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.1em', fontWeight: 700 }}>{cap.title}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5, color: C.muted }}>{cap.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div style={{ textAlign: 'center', color: PHARMA_TEAL, fontSize: 20, lineHeight: 1 }} aria-hidden="true">
              ↓
            </div>
            <div className="pdf-card" style={{ padding: 24 }}>
              <p className="pdf-mono" style={{ margin: '0 0 12px', color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {c.platform.aboveLabel}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                {c.platform.above.map((item, i) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff' }}>
                    <span style={{ color: PHARMA_TEAL, display: 'inline-flex' }}>
                      <NxIcon name={aboveIcons[i] ?? 'puzzle'} size={22} />
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: PHARMA_NAVY }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const AUDIENCE_ICONS: NxIconName[] = ['mes', 'erp', 'puzzle', 'events', 'rest'];

export function JourneySection() {
  const c = useCopy();
  return (
    <section id="journey" aria-label="Choose your journey" style={sectionStyle(C.section)}>
      <div style={innerStyle()}>
        <SectionHeading eyebrow={c.journeys.eyebrow} color={PHARMA_NAVY} title={c.journeys.title} sub={c.journeys.sub} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {c.journeys.audiences.map((audience, i) => (
            <Reveal key={audience.id} delay={i * 60}>
              <article className="pdf-card" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: PHARMA_TEAL, background: 'rgba(0,194,217,0.1)', border: '1px solid rgba(0,194,217,0.22)' }}>
                  <NxIcon name={AUDIENCE_ICONS[i] ?? 'puzzle'} size={24} />
                </span>
                <h3 className="pdf-display" style={{ fontSize: 20, fontWeight: 600, margin: '16px 0 0', color: PHARMA_NAVY }}>
                  {audience.title}
                </h3>
                <p style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 700, color: PHARMA_NAVY, lineHeight: 1.4 }}>
                  {audience.tagline}
                </p>
                <p className="pdf-muted" style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, flex: 1 }}>
                  {audience.body}
                </p>
                <a
                  href={audience.href}
                  className="pdf-focus"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, fontSize: 14, fontWeight: 600, color: PHARMA_TEAL, textDecoration: 'none' }}
                >
                  {audience.cta} <ArrowForwardIcon style={{ fontSize: 16 }} />
                </a>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketplaceCardView({ card }: { card: MarketplaceCard }) {
  return (
    <article className="pdf-card" style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
        <h4 className="pdf-display" style={{ fontSize: 16, fontWeight: 600, margin: 0, color: PHARMA_NAVY }}>
          {card.name}
        </h4>
        <StatusBadge card={card} />
      </div>
      <p className="pdf-mono" style={{ margin: '8px 0 0', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>
        {card.kind}
      </p>
      <p className="pdf-muted" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, flex: 1 }}>
        {card.description}
      </p>
    </article>
  );
}

export function MarketplaceSection() {
  const c = useCopy();
  return (
    <section id="marketplace" aria-label="Marketplace" style={sectionStyle(C.base)}>
      <div style={innerStyle()}>
        <SectionHeading eyebrow={c.marketplace.eyebrow} color={PHARMA_TEAL} title={c.marketplace.title} sub={c.marketplace.body} />
        <Reveal>
          <div
            className="pdf-card"
            style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 40 }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              {c.marketplace.steps.map((step, i) => (
                <span key={step} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="pdf-mono" style={{ fontWeight: 700, color: PHARMA_TEAL, fontSize: 14 }}>{step}</span>
                  {i < c.marketplace.steps.length - 1 && (
                    <ArrowForwardIcon style={{ fontSize: 16, color: C.muted }} />
                  )}
                </span>
              ))}
            </div>
            <a
              className="pdf-btn-primary pdf-focus"
              href="/marketplace"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 20px', textDecoration: 'none', fontWeight: 600, fontSize: 15 }}
            >
              {c.marketplace.cta}
            </a>
          </div>
        </Reveal>
        <p className="pdf-mono" style={{ color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 16px' }}>
          {c.marketplace.liveLabel}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {c.marketplace.live.map((card, i) => (
            <Reveal key={card.name} delay={i * 40}>
              <MarketplaceCardView card={card} />
            </Reveal>
          ))}
        </div>
        <p className="pdf-mono" style={{ color: '#B45309', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '40px 0 16px' }}>
          {c.marketplace.examplesLabel}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {c.marketplace.examples.map((card, i) => (
            <Reveal key={card.name} delay={i * 40}>
              <MarketplaceCardView card={card} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BuildSection() {
  const c = useCopy();
  const devIcons: NxIconName[] = ['puzzle', 'apis', 'trend', 'files', 'files'];
  return (
    <section id="build" aria-label="Build on Nexora" style={sectionStyle(C.section)}>
      <div style={innerStyle()}>
        <SectionHeading eyebrow={c.build.eyebrow} color={PHARMA_NAVY} title={c.build.title} sub={c.build.body} />
        <Reveal>
          <div className="pdf-card" style={{ padding: 28, marginBottom: 24 }}>
            <p className="pdf-mono" style={{ margin: '0 0 16px', color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {c.build.artifactsLabel}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {c.build.artifacts.map(item => (
                <div key={item} style={{ padding: '16px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff', textAlign: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: PHARMA_NAVY }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="pdf-card" style={{ padding: 28 }}>
            <p className="pdf-mono" style={{ margin: '0 0 16px', color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {c.build.developerLabel}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              {c.build.developer.map((item, i) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff' }}>
                  <span style={{ color: PHARMA_TEAL, display: 'inline-flex' }}>
                    <NxIcon name={devIcons[i] ?? 'puzzle'} size={20} />
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: PHARMA_NAVY }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <div style={{ marginTop: 28 }}>
          <a
            className="pdf-btn-primary pdf-focus"
            href="/platform/architecture/developer"
            style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 22px', textDecoration: 'none', fontWeight: 600, fontSize: 15 }}
          >
            {c.build.cta}
          </a>
        </div>
      </div>
    </section>
  );
}

const TRUST_TONES = ['#0891B2', '#00C2D9', '#0A1929', '#FF8A00'] as const;

export function TrustSection() {
  const c = useCopy();
  return (
    <section id="trust" aria-label="Trust and governance" style={sectionStyle(C.base)}>
      <div style={innerStyle()}>
        <SectionHeading eyebrow={c.trust.eyebrow} color={PHARMA_TEAL} title={c.trust.title} sub={c.trust.body} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          {c.trust.levels.map((level, i) => (
            <Reveal key={level.name} delay={i * 60}>
              <article className="pdf-card" style={{ padding: 24, height: '100%', borderTop: `3px solid ${TRUST_TONES[i] ?? PHARMA_TEAL}` }}>
                <h3 className="pdf-display" style={{ fontSize: 18, fontWeight: 600, margin: 0, color: PHARMA_NAVY }}>
                  {level.name}
                </h3>
                <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: TRUST_TONES[i] ?? PHARMA_TEAL }}>
                  {level.tagline}
                </p>
                <p className="pdf-muted" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6 }}>
                  {level.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal delay={100}>
          <div
            style={{
              marginTop: 28,
              padding: 28,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${PHARMA_NAVY}, #0E2A43)`,
              color: '#F8FAFC',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)',
              gap: 32,
              alignItems: 'start',
            }}
          >
            <div>
              <h3 className="pdf-display" style={{ fontSize: 20, fontWeight: 600, margin: 0, color: PHARMA_TEAL_LIGHT }}>
                {c.trust.aiTitle}
              </h3>
              <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.7, color: '#CBD5E1' }}>
                {c.trust.aiBody}
              </p>
            </div>
            <div>
              <p className="pdf-mono" style={{ margin: '0 0 12px', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: PHARMA_TEAL_LIGHT }}>
                {c.trust.capabilitiesLabel}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {c.trust.capabilities.map(item => (
                  <span key={item} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', fontSize: 12.5 }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function AcademySection() {
  const c = useCopy();
  return (
    <section id="academy" aria-label="Nexora Academy" style={sectionStyle(C.section)}>
      <div style={innerStyle()}>
        <SectionHeading eyebrow={c.academy.eyebrow} color={PHARMA_NAVY} title={c.academy.title} sub={c.academy.sub} />
        <p className="pdf-mono" style={{ color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 16px' }}>
          {c.academy.featuredLabel}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {c.academy.featured.map((path, i) => (
            <Reveal key={path.title} delay={i * 50}>
              <article className="pdf-card" style={{ padding: 22, height: '100%' }}>
                <div className="pdf-mono" style={{ color: PHARMA_TEAL, fontSize: 12, marginBottom: 8 }}>0{i + 1}</div>
                <h3 className="pdf-display" style={{ fontSize: 17, fontWeight: 600, margin: 0, color: PHARMA_NAVY }}>
                  {path.title}
                </h3>
                <p className="pdf-muted" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6 }}>
                  {path.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
        <p className="pdf-mono" style={{ color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '40px 0 16px' }}>
          {c.academy.rolesLabel}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {c.academy.roles.map((role, i) => (
            <Reveal key={role.title} delay={i * 40}>
              <div style={{ padding: '16px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.paper }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: PHARMA_NAVY }}>{role.title}</p>
                <p className="pdf-muted" style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.55 }}>{role.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={100}>
          <p className="pdf-muted" style={{ margin: '28px 0 0', fontSize: 14, lineHeight: 1.6, maxWidth: 820 }}>
            {c.academy.note}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function EcosystemFlywheelSection() {
  const c = useCopy();
  return (
    <section
      id="ecosystem"
      aria-label="Ecosystem"
      style={{ padding: '112px 24px', position: 'relative', overflow: 'hidden', background: `linear-gradient(165deg, ${PHARMA_NAVY} 0%, #0E2A43 100%)`, color: '#F8FAFC' }}
    >
      <div className="pdf-hero-glow" style={{ width: 320, height: 320, left: '50%', top: 40, marginLeft: -160, background: PHARMA_TEAL, opacity: 0.2 }} />
      <div style={{ maxWidth: 880, margin: '0 auto', position: 'relative' }}>
        <Reveal>
          <Eyebrow color={PHARMA_TEAL_LIGHT}>{c.flywheel.eyebrow}</Eyebrow>
          <h2 className="pdf-display" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, lineHeight: 1.2, margin: 0, textAlign: 'center' }}>
            {c.flywheel.title}
          </h2>
        </Reveal>
        <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {c.flywheel.steps.map((step, i) => (
            <Reveal key={step} delay={i * 60}>
              <div style={{ textAlign: 'center' }}>
                <div className="pdf-card" style={{ padding: '16px 28px', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{step}</span>
                </div>
                {i < c.flywheel.steps.length - 1 && (
                  <div style={{ color: PHARMA_TEAL_LIGHT, fontSize: 20, lineHeight: 1, margin: '6px 0' }} aria-hidden="true">
                    ↓
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EnterpriseSection() {
  const c = useCopy();
  return (
    <section id="enterprise" aria-label="Enterprise" style={sectionStyle(C.section)}>
      <div style={innerStyle()}>
        <SectionHeading eyebrow={c.enterprise.eyebrow} color={PHARMA_NAVY} title={c.enterprise.title} sub={c.enterprise.body} />
        <div className="pdf-card" style={{ padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {c.enterprise.services.map(service => (
              <div key={service} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: C.text }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: PHARMA_TEAL, flexShrink: 0 }} />
                {service}
              </div>
            ))}
          </div>
          <a
            className="pdf-btn-primary pdf-focus"
            href="#contact"
            style={{ display: 'inline-flex', alignItems: 'center', marginTop: 28, padding: '12px 22px', textDecoration: 'none', fontWeight: 600, fontSize: 15 }}
          >
            {c.enterprise.cta}
          </a>
        </div>
      </div>
    </section>
  );
}

