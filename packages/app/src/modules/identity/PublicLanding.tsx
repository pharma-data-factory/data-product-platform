import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '@material-ui/core';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CloseIcon from '@material-ui/icons/Close';
import CheckIcon from '@material-ui/icons/Check';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import LanguageIcon from '@material-ui/icons/Language';
import MenuIcon from '@material-ui/icons/Menu';
import { PRODUCT_EDITIONS } from '@internal/platform-common';
import { LEGAL_NAV } from '../legal/constants';
import { BrandMark } from '../nav/BrandMark';
import { KeepCoreDiagram, OeeProofDiagram } from './HomeGraphics';
import {
  LANDING_LOCALES,
  LandingI18nProvider,
  useLandingI18n,
} from './landingI18n';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL } from './landingTokens';

const NAV_ITEMS = [
  { id: 'platform', href: '/platform/architecture' },
  { id: 'goldenPaths', href: '#golden-paths' },
  { id: 'developers', href: '/platform/architecture/developer' },
  { id: 'editions', href: '#editions' },
] as const;

const animate =
  typeof process === 'undefined' || process.env.NODE_ENV !== 'test';

export const LandingStyles = () => (
  <style>{`
    html { scroll-behavior: smooth; }
    .pdf-root {
      background: ${C.base};
      color: ${C.text};
      font-family: Inter, Segoe UI, system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
      min-height: 100vh;
    }
    .pdf-display { font-family: 'Space Grotesk', Inter, system-ui, sans-serif; letter-spacing: -0.02em; }
    .pdf-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .pdf-muted { color: ${C.muted}; }
    .pdf-grid-bg {
      background-image:
        linear-gradient(rgba(20,184,166,0.10) 1px, transparent 1px),
        linear-gradient(90deg, rgba(20,184,166,0.10) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%);
      -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%);
    }
    .pdf-card {
      background: ${C.card};
      border: 1px solid ${C.border};
      border-radius: 16px;
      box-shadow: 0 1px 2px rgba(11, 31, 58, 0.06);
      transition: transform .35s cubic-bezier(.2,.8,.2,1), border-color .35s, box-shadow .35s, background .35s;
    }
    .pdf-card:hover { transform: translateY(-3px); background: #F8FAFC; border-color: rgba(11,31,58,0.16); }
    .pdf-glass {
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid ${C.border};
    }
    .pdf-btn-primary {
      background: linear-gradient(135deg, ${PHARMA_NAVY}, ${PHARMA_TEAL}) !important;
      color: #fff !important;
      text-transform: none !important;
      box-shadow: none !important;
      font-weight: 600 !important;
      border-radius: 12px !important;
    }
    .pdf-btn-primary:hover { box-shadow: 0 8px 24px rgba(11,31,58,0.18) !important; filter: brightness(1.04); }
    .pdf-btn-ghost {
      border: 1px solid ${C.border} !important;
      color: ${C.text} !important;
      text-transform: none !important;
      border-radius: 12px !important;
    }
    .pdf-btn-ghost:hover { border-color: ${PHARMA_TEAL} !important; background: rgba(13,148,136,0.08) !important; }
    .pdf-btn-hero-primary {
      background: ${PHARMA_TEAL} !important;
      color: #fff !important;
      text-transform: none !important;
      box-shadow: none !important;
      font-weight: 600 !important;
      border-radius: 12px !important;
    }
    .pdf-btn-hero-primary:hover { background: #0F766E !important; }
    .pdf-btn-hero-ghost {
      border: 1px solid rgba(255,255,255,0.35) !important;
      color: #fff !important;
      text-transform: none !important;
      border-radius: 12px !important;
    }
    .pdf-btn-hero-ghost:hover { background: rgba(255,255,255,0.08) !important; }
    .pdf-btn-disabled {
      text-transform: none !important;
      border-radius: 12px !important;
      opacity: 0.72;
    }
    .pdf-reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1); }
    .pdf-reveal.pdf-in { opacity: 1; transform: none; }
    .pdf-hero-glow {
      position: absolute; border-radius: 50%; filter: blur(90px); opacity: .28;
      animation: pdf-glowmove 16s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes pdf-glowmove {
      0% { transform: translate(-10%, -10%) scale(1); }
      50% { transform: translate(10%, 8%) scale(1.12); }
      100% { transform: translate(-10%, -10%) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .pdf-hero-glow { animation: none !important; }
      .pdf-reveal { transition: none; opacity: 1; transform: none; }
    }
    .pdf-focus:focus-visible { outline: 2px solid ${PHARMA_TEAL}; outline-offset: 3px; border-radius: 8px; }
    .pdf-home-steps {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
    }
    .pdf-home-editions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
    }
    .pdf-home-equation {
      display: grid;
      grid-template-columns: 1.5fr auto 1fr auto 1.2fr;
      gap: 16px;
      align-items: stretch;
    }
    .pdf-home-op {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 700;
      color: ${PHARMA_TEAL};
    }
    @media (max-width: 1100px) {
      .pdf-home-steps { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .pdf-home-equation { grid-template-columns: 1fr; }
      .pdf-home-op { transform: rotate(90deg); padding: 4px 0; }
    }
    @media (max-width: 800px) {
      .pdf-home-editions { grid-template-columns: 1fr; }
    }
    @media (max-width: 700px) {
      .pdf-home-steps { grid-template-columns: 1fr; }
    }
  `}</style>
);

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
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`pdf-reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ color, children }: { color: string; children: ReactNode }) {
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
    <div style={{ maxWidth: 720, marginBottom: 40 }}>
      <Eyebrow color={color}>{eyebrow}</Eyebrow>
      <h2 className="pdf-display" style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 600, lineHeight: 1.2, margin: 0 }}>
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

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'available' | 'planned' | 'future' | 'certified';
}) {
  const colors = {
    available: { bg: `${PHARMA_TEAL}14`, color: '#0F766E', border: `${PHARMA_TEAL}55` },
    certified: { bg: `${PHARMA_TEAL}14`, color: '#0F766E', border: `${PHARMA_TEAL}55` },
    planned: { bg: 'rgba(11,31,58,0.08)', color: PHARMA_NAVY, border: 'rgba(11,31,58,0.18)' },
    future: { bg: 'rgba(71,85,105,0.10)', color: '#475569', border: 'rgba(71,85,105,0.22)' },
  }[tone];

  return (
    <span
      className="pdf-mono"
      style={{
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        borderRadius: 999,
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export interface PublicLandingProps {
  onSignIn?: () => void;
  error?: string;
}

function signInButtonClass(variant: 'light' | 'hero' | 'primary'): string {
  if (variant === 'hero') {
    return 'pdf-btn-hero-ghost pdf-focus';
  }
  if (variant === 'primary') {
    return 'pdf-btn-primary pdf-focus';
  }
  return 'pdf-btn-ghost pdf-focus';
}

function SignInButton({
  onSignIn,
  size = 'medium',
  variant = 'light',
}: {
  onSignIn?: () => void;
  size?: 'small' | 'medium';
  variant?: 'light' | 'hero' | 'primary';
}) {
  const { t } = useLandingI18n();
  return (
    <Button
      className={signInButtonClass(variant)}
      variant={variant === 'primary' ? 'contained' : 'outlined'}
      size={size}
      onClick={onSignIn}
    >
      {t.signIn}
    </Button>
  );
}

function useMenuDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

function resolveNavHref(href: string, location: LandingChromeLocation): string {
  if (href.startsWith('/') || location === 'landing') {
    return href;
  }
  return `/${href}`;
}

export type LandingChromeLocation = 'landing' | 'architecture';

function menuPanelStyle(onDark: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: 'calc(100% + 12px)',
    right: 0,
    minWidth: 220,
    padding: 8,
    borderRadius: 14,
    background: onDark ? 'rgba(7,21,37,0.96)' : C.paper,
    border: `1px solid ${onDark ? 'rgba(255,255,255,0.12)' : C.border}`,
    boxShadow: '0 16px 40px rgba(11,31,58,0.16)',
    zIndex: 20,
  };
}

function chromeButtonStyle(onDark: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 0,
    padding: 0,
    fontSize: 14,
    color: onDark ? '#CBD5E1' : C.muted,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };
}

function LanguageMenu({ onDark }: { onDark: boolean }) {
  const { locale, setLocale, t } = useLandingI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useMenuDismiss(open, close);
  const current = LANDING_LOCALES.find(item => item.id === locale) ?? LANDING_LOCALES[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="pdf-focus"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.language}
        onClick={() => setOpen(value => !value)}
        style={chromeButtonStyle(onDark)}
      >
        <LanguageIcon style={{ fontSize: 18 }} />
        {current.short}
        <ExpandMoreIcon
          style={{
            fontSize: 18,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .2s ease',
          }}
        />
      </button>
      {open && (
        <div role="menu" aria-label={t.language} style={menuPanelStyle(onDark)}>
          {LANDING_LOCALES.map(item => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={item.id === locale}
              className="pdf-focus"
              onClick={() => {
                setLocale(item.id);
                close();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 12px',
                border: 0,
                borderRadius: 10,
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                color: onDark ? '#F8FAFC' : C.text,
              }}
            >
              {item.label}
              {item.id === locale && (
                <CheckIcon style={{ fontSize: 18, color: PHARMA_TEAL }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BookDemoLink({
  location,
  onDark,
  onNavigate,
}: {
  location: LandingChromeLocation;
  onDark: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useLandingI18n();
  return (
    <a
      href={resolveNavHref('#contact', location)}
      className="pdf-focus"
      onClick={onNavigate}
      style={chromeButtonStyle(onDark)}
    >
      {t.bookDemo}
    </a>
  );
}

export function LandingNav({
  onSignIn,
  location = 'landing',
}: PublicLandingProps & { location?: LandingChromeLocation }) {
  const { t, locale, setLocale } = useLandingI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const onDark = !scrolled && !open;

  return (
    <header
      className={scrolled || open ? 'pdf-glass' : undefined}
      style={{
        position: 'fixed',
        top: 0,
        insetInline: 0,
        zIndex: 50,
        background: onDark ? 'transparent' : undefined,
        borderBottom: onDark ? '1px solid transparent' : undefined,
        boxShadow: scrolled ? '0 8px 24px rgba(11,31,58,0.08)' : 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 24px',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <a
          href={location === 'architecture' ? '/' : '#top'}
          className="pdf-focus"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: onDark ? '#F8FAFC' : C.text,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <BrandMark />
          <span className="pdf-display" style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>
            pharma-data-factory
          </span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 18 }} className="pdf-desktop-nav">
          {NAV_ITEMS.map(item => (
            <a
              key={item.id}
              href={resolveNavHref(item.href, location)}
              className="pdf-focus"
              style={{
                fontSize: 14,
                textDecoration: 'none',
                color: onDark ? '#CBD5E1' : C.muted,
                whiteSpace: 'nowrap',
              }}
            >
              {t.nav[item.id]}
            </a>
          ))}
          <LanguageMenu onDark={onDark} />
          <BookDemoLink location={location} onDark={onDark} />
          <SignInButton onSignIn={onSignIn} size="small" variant="primary" />
        </nav>
        <button
          type="button"
          className="pdf-focus pdf-mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-label={open ? t.closeMenu : t.openMenu}
          style={{
            background: 'none',
            border: 0,
            color: onDark ? '#F8FAFC' : C.text,
            padding: 8,
            display: 'none',
          }}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
      {open && (
        <div style={{ padding: '8px 24px 20px', display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${C.border}` }}>
          {NAV_ITEMS.map(item => (
            <a
              key={item.id}
              href={resolveNavHref(item.href, location)}
              onClick={() => setOpen(false)}
              className="pdf-muted"
              style={{ padding: '12px 8px', textDecoration: 'none', borderRadius: 8 }}
            >
              {t.nav[item.id]}
            </a>
          ))}
          <p
            className="pdf-mono"
            style={{
              margin: '12px 8px 4px',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: PHARMA_TEAL,
            }}
          >
            {t.language}
          </p>
          {LANDING_LOCALES.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setLocale(item.id);
                setOpen(false);
              }}
              className="pdf-muted pdf-focus"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 8px',
                border: 0,
                borderRadius: 8,
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                textAlign: 'left',
              }}
            >
              {item.label}
              {item.id === locale && <CheckIcon style={{ fontSize: 18, color: PHARMA_TEAL }} />}
            </button>
          ))}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <BookDemoLink location={location} onDark={false} onNavigate={() => setOpen(false)} />
            <SignInButton onSignIn={onSignIn} variant="primary" />
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 1100px) {
          .pdf-desktop-nav { display: none !important; }
          .pdf-mobile-toggle { display: block !important; }
        }
      `}</style>
    </header>
  );
}

function Hero({ error }: Pick<PublicLandingProps, 'error'>) {
  const { t } = useLandingI18n();
  return (
    <section
      id="top"
      className="pdf-grid-bg"
      style={{
        position: 'relative',
        padding: '148px 24px 96px',
        overflow: 'hidden',
        background: `linear-gradient(165deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 55%, #123152 100%)`,
        color: '#F8FAFC',
      }}
    >
      <div className="pdf-hero-glow" style={{ width: 420, height: 420, top: 20, left: -80, background: PHARMA_TEAL }} />
      <div
        className="pdf-hero-glow"
        style={{ width: 360, height: 360, top: 180, right: -40, background: '#1E3A5F', animationDelay: '-8s' }}
      />
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 56,
          alignItems: 'center',
        }}
      >
        <div>
          <Reveal>
            <p className="pdf-mono" style={{ color: PHARMA_TEAL, fontSize: 13, fontWeight: 700, letterSpacing: 2, margin: '0 0 20px' }}>
              {t.hero.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="pdf-display"
              style={{
                fontSize: 'clamp(36px, 5.4vw, 64px)',
                fontWeight: 700,
                lineHeight: 1.08,
                margin: 0,
                maxWidth: 920,
                whiteSpace: 'pre-line',
              }}
            >
              {t.hero.title}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p style={{ marginTop: 24, fontSize: 18, lineHeight: 1.7, maxWidth: 640, color: '#CBD5E1' }}>
              {t.hero.sub}
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 36 }}>
              <Button className="pdf-btn-hero-primary pdf-focus" variant="contained" href="#how-it-works">
                {t.hero.primary} <ArrowForwardIcon style={{ fontSize: 17, marginLeft: 6 }} />
              </Button>
              <Button className="pdf-btn-hero-ghost pdf-focus" variant="outlined" href="#golden-paths">
                {t.hero.secondary}
              </Button>
            </div>
          </Reveal>
          {error && (
            <p role="alert" style={{ color: '#FECACA', marginTop: 16 }}>
              {error}
            </p>
          )}
        </div>
        <Reveal delay={200}>
          <KeepCoreDiagram
            ariaLabel={t.preview.systems}
            systems={t.preview.systems}
            governed={t.preview.governed}
            components={t.preview.components}
            goldenPaths={t.preview.goldenPaths}
            products={t.preview.products}
          />
        </Reveal>
      </div>
    </section>
  );
}

function Why() {
  const { t } = useLandingI18n();
  const cards = [
    { title: t.why.systemOfRecord, body: 'ERP · MES · LIMS · EWM' },
    { title: t.why.dataProduct, body: t.preview.products },
    { title: t.why.controlPlane, body: 'Pharma Data Factory' },
  ];
  return (
    <section aria-label={t.why.eyebrow} style={{ padding: '96px 24px', background: C.section }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeading eyebrow={t.why.eyebrow} color={PHARMA_TEAL} title={t.why.title} sub={t.why.body} />
        <p className="pdf-muted" style={{ margin: '-24px 0 32px', fontSize: 16, lineHeight: 1.7, maxWidth: 720 }}>
          {t.why.forWhom}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {cards.map(card => (
            <article key={card.title} className="pdf-card" style={{ padding: 24 }}>
              <h3 className="pdf-mono" style={{ margin: 0, color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em' }}>
                {card.title}
              </h3>
              <p style={{ margin: '12px 0 0', fontSize: 16, fontWeight: 600 }}>{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useLandingI18n();
  return (
    <section id="how-it-works" aria-label="How it works" style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeading
          eyebrow={t.howItWorks.eyebrow}
          color={PHARMA_NAVY}
          title={t.howItWorks.title}
          sub={t.howItWorks.sub}
        />
        <div className="pdf-home-steps" aria-label={t.howItWorks.journey}>
          {t.howItWorks.steps.map((step, i) => (
            <Reveal key={step} delay={i * 50}>
              <article className="pdf-card" style={{ padding: 20, height: '100%' }}>
                <div className="pdf-mono" style={{ color: PHARMA_TEAL, fontSize: 12, marginBottom: 8 }}>
                  0{i + 1}
                </div>
                <h3 className="pdf-display" style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>
                  {step}
                </h3>
                <p className="pdf-muted" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.5 }}>
                  {t.howItWorks.sentences[i]}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Proof() {
  const { t } = useLandingI18n();
  return (
    <section
      id="golden-paths"
      aria-label="Golden Path showcase"
      style={{ padding: '96px 24px', background: C.section }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeading eyebrow={t.proof.eyebrow} color={PHARMA_TEAL} title={t.proof.title} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h3 className="pdf-display" style={{ margin: 0, fontSize: 22 }}>
            OEE Data Product
          </h3>
          <StatusPill label="CERTIFIED" tone="certified" />
        </div>
        <figure
          style={{
            margin: 0,
            borderRadius: 16,
            overflow: 'hidden',
            border: `1px solid ${C.border}`,
            background: '#071525',
          }}
        >
          <OeeProofDiagram
            ariaLabel={t.proof.oeeCaption}
            mes={t.proof.mes}
            machine={t.proof.machine}
            rest={t.proof.rest}
            mqtt={t.proof.mqtt}
            product={t.proof.oee}
            formula={t.proof.formula}
            api={t.proof.api}
          />
        </figure>
        <p style={{ margin: '16px 0 0', fontSize: 16, fontWeight: 600, maxWidth: 640 }}>
          {t.proof.oeeCaption}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginTop: 28,
          }}
        >
          <article className="pdf-card" style={{ padding: 24 }}>
            <h3 className="pdf-display" style={{ margin: 0, fontSize: 18 }}>
              MQTT Temperature Data Product
            </h3>
            <div style={{ marginTop: 10 }}>
              <StatusPill label="CERTIFIED" tone="certified" />
            </div>
            <p className="pdf-muted" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6 }}>
              {t.proof.mqttCard}
            </p>
          </article>
          <article className="pdf-card" style={{ padding: 24 }}>
            <h3 className="pdf-display" style={{ margin: 0, fontSize: 18 }}>
              REST Equipment Data Product
            </h3>
            <div style={{ marginTop: 10 }}>
              <StatusPill label="CERTIFIED" tone="certified" />
            </div>
            <p className="pdf-muted" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6 }}>
              {t.proof.restCard}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function DeveloperValue() {
  const { t } = useLandingI18n();
  return (
    <section aria-label={t.developer.eyebrow} style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeading
          eyebrow={t.developer.eyebrow}
          color={PHARMA_NAVY}
          title={t.developer.headline}
        />
        <div className="pdf-home-equation" aria-label={t.developer.headline}>
          <article className="pdf-card" style={{ padding: 24 }}>
            <h3 className="pdf-mono" style={{ margin: 0, color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em' }}>
              {t.developer.platformLabel}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {t.developer.platformItems.map(item => (
                <span
                  key={item}
                  className="pdf-mono"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: `1px solid ${C.border}`,
                    fontSize: 12,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </article>
          <div className="pdf-home-op" aria-hidden="true">
            +
          </div>
          <article className="pdf-card" style={{ padding: 24 }}>
            <h3 className="pdf-mono" style={{ margin: 0, color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em' }}>
              {t.developer.developerLabel}
            </h3>
            <p style={{ margin: '16px 0 0', fontSize: 20, fontWeight: 700 }}>{t.developer.domainItem}</p>
          </article>
          <div className="pdf-home-op" aria-hidden="true">
            =
          </div>
          <article
            className="pdf-card"
            style={{ padding: 24, borderColor: 'rgba(13,148,136,0.45)', background: 'rgba(13,148,136,0.06)' }}
          >
            <h3 className="pdf-mono" style={{ margin: 0, color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em' }}>
              {t.developer.resultLabel}
            </h3>
            <p style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 1.5 }}>
              MQTT · REST · OEE
            </p>
          </article>
        </div>
        <a
          className="pdf-btn-ghost pdf-focus"
          href="/platform/architecture/developer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            marginTop: 28,
            padding: '10px 18px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          {t.developer.cta}
        </a>
      </div>
    </section>
  );
}

function ArchitecturePreview() {
  const { t } = useLandingI18n();
  return (
    <section aria-label="Architecture overview" style={{ padding: '96px 24px', background: C.section }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeading eyebrow={t.preview.eyebrow} color={PHARMA_TEAL} title={t.preview.title} sub={t.preview.body} />
        <a
          className="pdf-btn-primary pdf-focus"
          href="/platform/architecture"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 20px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          {t.preview.cta}
        </a>
      </div>
    </section>
  );
}

function EditionCard({
  edition,
  delay,
}: {
  edition: (typeof PRODUCT_EDITIONS)[number];
  delay: number;
}) {
  const { t } = useLandingI18n();
  const copy = t.pricing.editions[edition.id];
  const items = copy?.includes ?? (
    edition.availability === 'future'
      ? edition.futureCapabilities ?? []
      : edition.includes
  );
  const available = edition.availability === 'available';

  return (
    <Reveal delay={delay}>
      <article
        className="pdf-card"
        aria-label={edition.name}
        style={{
          padding: 28,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderColor: available ? 'rgba(13,148,136,0.45)' : C.border,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
          <h3 className="pdf-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
            {edition.name}
          </h3>
          <StatusPill label={edition.statusLabel} tone={edition.availability} />
        </div>
        <p className="pdf-muted" style={{ margin: '8px 0 0', fontSize: 14 }}>
          {copy?.bestFor ?? edition.bestFor}
        </p>
        <p
          className="pdf-display"
          style={{ margin: '24px 0 0', fontSize: 28, fontWeight: 700, color: PHARMA_NAVY }}
        >
          {copy?.priceLabel ?? edition.priceLabel}
        </p>
        <p className="pdf-muted" style={{ margin: '8px 0 0', fontSize: 14 }}>
          {copy?.priceHint ?? edition.priceHint}
        </p>
        {edition.ctaDisabled ? (
          <Button className="pdf-btn-disabled pdf-focus" variant="outlined" disabled style={{ marginTop: 24 }}>
            {copy?.cta ?? edition.cta}
          </Button>
        ) : (
          <Button
            className={available ? 'pdf-btn-primary pdf-focus' : 'pdf-btn-ghost pdf-focus'}
            variant={available ? 'contained' : 'outlined'}
            href={edition.ctaHref}
            style={{ marginTop: 24 }}
          >
            {copy?.cta ?? edition.cta}
          </Button>
        )}
        <ul style={{ margin: '24px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {items.slice(0, 4).map(item => (
            <li key={item} style={{ fontSize: 14, display: 'flex', gap: 10, lineHeight: 1.5 }}>
              <CheckCircleIcon style={{ color: PHARMA_TEAL, fontSize: 18, marginTop: 1, flexShrink: 0 }} />
              {item}
            </li>
          ))}
        </ul>
      </article>
    </Reveal>
  );
}

function ProductEditions() {
  const { t } = useLandingI18n();
  return (
    <section id="editions" aria-label="Product editions" style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 40px' }}>
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
            {t.pricing.eyebrow}
          </p>
          <h2 className="pdf-display" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, lineHeight: 1.2, margin: 0 }}>
            {t.pricing.title}
          </h2>
          <p className="pdf-muted" style={{ marginTop: 16, fontSize: 18, lineHeight: 1.7 }}>
            {t.pricing.sub}
          </p>
        </div>
        <div className="pdf-home-editions" id="pricing" aria-label="Pricing model">
          {PRODUCT_EDITIONS.map((edition, i) => (
            <EditionCard key={edition.id} edition={edition} delay={i * 80} />
          ))}
        </div>
        <div
          id="contact"
          className="pdf-card"
          style={{
            marginTop: 28,
            padding: 24,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t.pricing.contact}</p>
          <p className="pdf-muted" style={{ margin: 0, fontSize: 14 }}>
            {t.pricing.contactNote}
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCta(props: PublicLandingProps) {
  const { t } = useLandingI18n();
  return (
    <section id="sign-in" style={{ padding: '112px 24px', position: 'relative', overflow: 'hidden', textAlign: 'center', background: PHARMA_NAVY, color: '#F8FAFC' }}>
      <div className="pdf-hero-glow" style={{ width: 320, height: 320, left: '50%', top: 40, marginLeft: -160, background: PHARMA_TEAL, opacity: 0.22 }} />
      <div style={{ maxWidth: 768, margin: '0 auto', position: 'relative' }}>
        <Reveal>
          <h2 className="pdf-display" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
            {t.finalCta.title}
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p style={{ marginTop: 20, fontSize: 18, lineHeight: 1.7, color: '#CBD5E1' }}>
            {t.finalCta.sub}
          </p>
        </Reveal>
        <Reveal delay={220}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 36 }}>
            <Button className="pdf-btn-hero-primary pdf-focus" variant="contained" href="#contact">
              {t.bookDemo}
            </Button>
            <SignInButton onSignIn={props.onSignIn} variant="hero" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingFooter({
  location = 'landing',
}: {
  location?: LandingChromeLocation;
}) {
  const { t } = useLandingI18n();
  return (
    <footer style={{ padding: '56px 24px 40px', borderTop: `1px solid ${C.border}`, background: C.section }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 40 }}>
          <div style={{ maxWidth: 360 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <BrandMark size={30} />
              <span className="pdf-display" style={{ fontWeight: 600, fontSize: 14 }}>
                pharma-data-factory
              </span>
            </div>
            <p className="pdf-muted" style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              {t.footer.tagline}
            </p>
          </div>
          <nav aria-label="Footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 48px', fontSize: 14 }}>
            {NAV_ITEMS.map(item => (
              <a key={item.id} href={resolveNavHref(item.href, location)} className="pdf-muted pdf-focus" style={{ textDecoration: 'none' }}>
                {t.nav[item.id]}
              </a>
            ))}
          </nav>
        </div>
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.border}`, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          <p className="pdf-mono pdf-muted" style={{ fontSize: 12, margin: 0 }}>
            {t.footer.note}
          </p>
          <nav aria-label="Legal" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
            {LEGAL_NAV.map(item => (
              <a key={item.id} href={item.path} className="pdf-muted pdf-focus" style={{ textDecoration: 'none' }}>
                {item.title}
              </a>
            ))}
          </nav>
          <p className="pdf-mono pdf-muted" style={{ fontSize: 12, margin: 0 }}>
            © 2026 Pharma Data Factory
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLanding(props: PublicLandingProps) {
  const scrollToSignIn = useCallback(() => {
    document.getElementById('sign-in')?.scrollIntoView({ behavior: animate ? 'smooth' : 'auto' });
  }, []);
  const startCreate = props.onSignIn ?? scrollToSignIn;

  return (
    <LandingI18nProvider>
      <main className="pdf-root">
        <LandingStyles />
        <LandingNav onSignIn={startCreate} />
        <Hero error={props.error} />
        <Why />
        <HowItWorks />
        <Proof />
        <DeveloperValue />
        <ArchitecturePreview />
        <ProductEditions />
        <FinalCta {...props} onSignIn={startCreate} />
        <LandingFooter />
      </main>
    </LandingI18nProvider>
  );
}
