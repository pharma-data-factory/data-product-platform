import { Button } from '@material-ui/core';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import { useLandingI18n } from '../landingI18n';
import { HeroArchitecture } from './HeroArchitecture';
import { NX } from './icons';

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
      <div className="nx-hero-actions">
        <Button className="pdf-btn-hero-primary pdf-focus" variant="contained" href="#golden-paths">
          {t.hero.discover}
        </Button>
        <Button className="pdf-btn-hero-ghost pdf-focus" variant="outlined" href="#contact">
          <PlayArrowIcon style={{ fontSize: 18, marginRight: 6 }} />
          {t.hero.demo}
        </Button>
      </div>
      <a href="#how-it-works" className="pdf-focus nx-hero-more">
        {t.hero.primary} <ArrowForwardIcon style={{ fontSize: 16 }} />
      </a>
      {error ? (
        <p role="alert" style={{ color: '#FECACA', marginTop: 16 }}>
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
