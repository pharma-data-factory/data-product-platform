import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CloseIcon from '@material-ui/icons/Close';
import CheckIcon from '@material-ui/icons/Check';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import LanguageIcon from '@material-ui/icons/Language';
import MenuIcon from '@material-ui/icons/Menu';
import { PRODUCT_EDITIONS } from '@internal/platform-common';
import { LEGAL_NAV } from '../legal/constants';
import { BrandMark } from '../nav/BrandMark';
import { GoldenPathShowcase } from './GoldenPathShowcase';
import { HeroSection } from './home/HeroSection';
import { HomeStyles } from './home/HomeStyles';
import {
  AcademySection,
  BuildSection,
  EcosystemFlywheelSection,
  EnterpriseSection,
  JourneySection,
  MarketplaceSection,
  PlatformSection,
  ProblemSection,
  TrustSection,
} from './ecosystemSections';
import {
  LANDING_LOCALES,
  LandingI18nProvider,
  useLandingI18n,
} from './landingI18n';
import { C, BRAND_NAME, BRAND_WORDMARK, LANDING, PHARMA_NAVY, PHARMA_TEAL, PHARMA_TEAL_DARK } from './landingTokens';
import { CookieConsentBanner } from '../legal/CookieConsentBanner';
import { legalNavCopy } from '../legal/legalCopy';
import { openCookieSettings } from '../legal/cookieConsent';
import {
  NEXORA_CARD,
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

const NAV_ITEMS = [
  { id: 'platform', href: '/platform/architecture' },
  { id: 'solutions', href: '/solutions' },
  { id: 'ecosystem', href: '/ecosystem' },
  { id: 'academy', href: '/academy' },
  { id: 'trust', href: '/trust' },
  { id: 'enterprise', href: '/enterprise' },
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
        linear-gradient(rgba(0,194,217,0.10) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,194,217,0.10) 1px, transparent 1px);
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
    .pdf-card:hover { transform: translateY(-3px); background: ${NEXORA_GREY[50]}; border-color: rgba(11,31,58,0.16); }
    .pdf-glass {
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid ${C.border};
    }
    .pdf-btn-primary {
      background: linear-gradient(135deg, ${PHARMA_NAVY}, ${PHARMA_TEAL}) !important;
      color: ${NEXORA_CARD} !important;
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
    .pdf-btn-ghost:hover { border-color: ${PHARMA_TEAL} !important; background: rgba(0,194,217,0.08) !important; }
    .pdf-btn-hero-primary {
      background: ${LANDING.teal} !important;
      color: ${NEXORA_CARD} !important;
      text-transform: none !important;
      box-shadow: none !important;
      font-weight: 600 !important;
      border-radius: 12px !important;
    }
    .pdf-btn-hero-primary:hover { background: ${PHARMA_TEAL_DARK} !important; }
    .pdf-btn-hero-ghost {
      border: 1px solid rgba(255,255,255,0.35) !important;
      color: ${NEXORA_CARD} !important;
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
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
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
      .pdf-home-equation { grid-template-columns: 1fr; }
      .pdf-home-op { transform: rotate(90deg); padding: 4px 0; }
    }
    @media (max-width: 800px) {
      .pdf-home-editions { grid-template-columns: 1fr; }
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

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'available' | 'planned' | 'future' | 'certified';
}) {
  const colors = {
    available: { bg: `${PHARMA_TEAL}14`, color: PHARMA_TEAL_DARK, border: `${PHARMA_TEAL}55` },
    certified: { bg: `${PHARMA_TEAL}14`, color: PHARMA_TEAL_DARK, border: `${PHARMA_TEAL}55` },
    planned: { bg: 'rgba(11,31,58,0.08)', color: PHARMA_NAVY, border: 'rgba(11,31,58,0.18)' },
    future: { bg: 'rgba(71,85,105,0.10)', color: NEXORA_GREY[600], border: 'rgba(71,85,105,0.22)' },
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

export type LandingChromeLocation = 'landing' | 'architecture' | 'page';

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
    color: onDark ? NEXORA_GREY[300] : C.muted,
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
                color: onDark ? NEXORA_GREY[50] : C.text,
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
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <a
          href={location === 'landing' ? '#top' : '/'}
          className="pdf-focus"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            color: onDark ? NEXORA_GREY[50] : C.text,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <BrandMark size={48} />
          <span className="pdf-display" style={{ fontWeight: 700, fontSize: 22, letterSpacing: '0.08em', lineHeight: 1.2 }}>
            {BRAND_WORDMARK}
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
                color: onDark ? NEXORA_GREY[300] : C.muted,
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
            color: onDark ? NEXORA_GREY[50] : C.text,
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
          borderColor: available ? 'rgba(0,194,217,0.45)' : C.border,
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
    <section id="sign-in" style={{ padding: '112px 24px', position: 'relative', overflow: 'hidden', textAlign: 'center', background: PHARMA_NAVY, color: NEXORA_GREY[50] }}>
      <div className="pdf-hero-glow" style={{ width: 320, height: 320, left: '50%', top: 40, marginLeft: -160, background: PHARMA_TEAL, opacity: 0.22 }} />
      <div style={{ maxWidth: 880, margin: '0 auto', position: 'relative' }}>
        <Reveal>
          <h2 className="pdf-display" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
            {t.finalCta.title}
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p style={{ marginTop: 20, fontSize: 18, lineHeight: 1.7, color: NEXORA_GREY[300] }}>
            {t.finalCta.sub}
          </p>
        </Reveal>
        <Reveal delay={220}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 36 }}>
            {t.finalCta.paths.map(path => (
              <Button key={path.label} className="pdf-btn-hero-primary pdf-focus" variant="contained" href={path.href} style={{ whiteSpace: 'nowrap' }}>
                {path.label}
              </Button>
            ))}
          </div>
        </Reveal>
        <Reveal delay={300}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 28 }}>
            <Button className="pdf-btn-hero-ghost pdf-focus" variant="outlined" href="#contact">
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
  const { t, locale } = useLandingI18n();
  const legalNav = legalNavCopy[locale];
  return (
    <footer style={{ padding: '56px 24px 40px', borderTop: `1px solid ${C.border}`, background: C.section }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 40 }}>
          <div style={{ maxWidth: 360 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <BrandMark size={40} />
              <span className="pdf-display" style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.08em' }}>
                {BRAND_WORDMARK}
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
                {legalNav[item.id === 'open-source' ? 'openSource' : item.id]}
              </a>
            ))}
            <button
              type="button"
              className="pdf-muted pdf-focus"
              onClick={() => openCookieSettings()}
              style={{
                background: 'none',
                border: 0,
                padding: 0,
                font: 'inherit',
                cursor: 'pointer',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {legalNav.cookieSettings}
            </button>
          </nav>
          <p className="pdf-mono pdf-muted" style={{ fontSize: 12, margin: 0 }}>
            © 2026 {BRAND_NAME}
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
        <HomeStyles />
        <LandingNav onSignIn={startCreate} />
        <HeroSection error={props.error} />
        <ProblemSection />
        <PlatformSection />
        <JourneySection />
        <MarketplaceSection />
        <BuildSection />
        <GoldenPathShowcase />
        <TrustSection />
        <AcademySection />
        <EcosystemFlywheelSection />
        <EnterpriseSection />
        <ProductEditions />
        <FinalCta {...props} onSignIn={startCreate} />
        <LandingFooter />
        <CookieConsentBanner />
      </main>
    </LandingI18nProvider>
  );
}
