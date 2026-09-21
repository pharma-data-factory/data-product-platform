import { Button } from '@material-ui/core';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import { useLandingI18n } from '../landingI18n';
import { HeroArchitecture } from './HeroArchitecture';
import { NX } from './icons';
import {
  NEXORA_ACCENT,
} from '@internal/plugin-nexora-common';

export function HeroContent({ error }: Readonly<{ error?: string }>) {
  const { t } = useLandingI18n();

  return (
    <div className="nx-hero-copy">
      <p className="pdf-mono nx-eyebrow">{t.hero.eyebrow}</p>
      <h1 className="pdf-display nx-hero-title">
        {t.hero.headlinePrimary}
        <br />
        <span className="nx-hero-accent">{t.hero.headlineAccent}</span>
      </h1>
      <p className="nx-hero-body">{t.hero.sub}</p>
      <p
        className="pdf-mono"
        style={{
          margin: '14px 0 0',
          fontSize: 12.5,
          letterSpacing: '0.02em',
          lineHeight: 1.6,
          color: 'rgba(182,195,210,0.92)',
          maxWidth: 560,
        }}
      >
        {t.hero.clarification}
      </p>
      <div className="nx-hero-actions">
        <Button className="pdf-btn-hero-primary pdf-focus" variant="contained" href="#platform">
          {t.hero.discover}
        </Button>
        <Button className="pdf-btn-hero-ghost pdf-focus" variant="outlined" href="#marketplace">
          {t.hero.demo}
        </Button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 20 }}>
        <a href="#build" className="pdf-focus nx-hero-more" style={{ marginTop: 0 }}>
          {t.hero.primary} <ArrowForwardIcon style={{ fontSize: 16 }} />
        </a>
        <a href="#enterprise" className="pdf-focus nx-hero-more" style={{ marginTop: 0 }}>
          {t.hero.secondary} <ArrowForwardIcon style={{ fontSize: 16 }} />
        </a>
      </div>
      {error ? (
        <p role="alert" style={{ color: NEXORA_ACCENT.dangerBorder, marginTop: 16 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function HeroSection({ error }: Readonly<{ error?: string }>) {
  return (
    <section
      id="top"
      className="nx-hero"
      style={{
        background: `linear-gradient(165deg, ${NX.bgDeep} 0%, ${NX.bg} 52%, ${NX.surface2} 100%)`,
      }}
    >
      <div className="pdf-grid-bg nx-hero-grid" />
      <div className="nx-hero-glow nx-hero-glow-a" />
      <div className="nx-hero-glow nx-hero-glow-b" />
      <div className="nx-hero-layout">
        <HeroContent error={error} />
        <HeroArchitecture />
      </div>
    </section>
  );
}
