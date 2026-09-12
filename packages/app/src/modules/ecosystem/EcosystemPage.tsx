import type { ComponentType, ReactNode } from 'react';
import {
  LandingFooter,
  LandingNav,
  LandingStyles,
} from '../identity/PublicLanding';
import {
  LandingI18nProvider,
  useLandingI18n,
} from '../identity/landingI18n';
import { ecosystemCopy, type EcosystemLocale } from '../identity/ecosystemCopy';
import {
  AcademySection,
  BuildSection,
  EcosystemFlywheelSection,
  EnterpriseSection,
  MarketplaceSection,
  PlatformSection,
  TrustSection,
} from '../identity/ecosystemSections';
import {
  C,
  PHARMA_NAVY,
  PHARMA_NAVY_DARK,
  PHARMA_TEAL_LIGHT,
  PHARMA_TEAL_ON_LIGHT,
} from '../identity/landingTokens';
import {
  ACADEMY_PATH,
  ECOSYSTEM_PATH,
  ENTERPRISE_PATH,
  TRUST_PATH,
  solutionSlugFromPathname,
  type SolutionSlug,
} from './constants';

const SOLUTION_SECTIONS: Record<SolutionSlug, ComponentType> = {
  'life-sciences': PlatformSection,
  'enterprise-it': EnterpriseSection,
  consultants: BuildSection,
  partners: MarketplaceSection,
  developers: BuildSection,
};

function useCopy() {
  const { locale } = useLandingI18n();
  return ecosystemCopy[locale as EcosystemLocale];
}

function SolutionsIndex() {
  const c = useCopy();
  return (
    <>
      <section
        aria-label="Solutions"
        style={{
          padding: '128px 24px 48px',
          background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
          color: '#F8FAFC',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <p
            className="pdf-mono"
            style={{
              color: PHARMA_TEAL_LIGHT,
              fontSize: 12,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              margin: '0 0 16px',
            }}
          >
            {c.journeys.eyebrow}
          </p>
          <h1
            className="pdf-display"
            style={{
              fontSize: 'clamp(30px, 4.5vw, 46px)',
              fontWeight: 600,
              lineHeight: 1.15,
              margin: 0,
              maxWidth: 840,
            }}
          >
            {c.journeys.title}
          </h1>
          <p
            style={{
              marginTop: 20,
              fontSize: 18,
              lineHeight: 1.7,
              color: '#CBD5E1',
              maxWidth: 720,
            }}
          >
            {c.journeys.sub}
          </p>
        </div>
      </section>
      <section style={{ padding: '48px 24px 96px', background: C.section }}>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {c.journeys.audiences.map(audience => (
            <a
              key={audience.id}
              href={`/solutions/${audience.id}`}
              className="pdf-card pdf-focus"
              style={{
                padding: 28,
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <h2
                className="pdf-display"
                style={{ fontSize: 22, fontWeight: 600, margin: 0, color: PHARMA_NAVY }}
              >
                {audience.title}
              </h2>
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 15,
                  fontWeight: 700,
                  color: PHARMA_NAVY,
                  lineHeight: 1.4,
                }}
              >
                {audience.tagline}
              </p>
              <p
                className="pdf-muted"
                style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, flex: 1 }}
              >
                {audience.body}
              </p>
              <span
                style={{
                  marginTop: 20,
                  fontSize: 14,
                  fontWeight: 600,
                  color: PHARMA_TEAL_ON_LIGHT,
                }}
              >
                {audience.cta} →
              </span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

function SolutionHero({ slug }: { slug: SolutionSlug }) {
  const c = useCopy();
  const audience = c.journeys.audiences.find(a => a.id === slug);
  if (!audience) {
    return null;
  }
  return (
    <section
      aria-label={audience.title}
      style={{
        padding: '128px 24px 56px',
        background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
        color: '#F8FAFC',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <p
          className="pdf-mono"
          style={{
            color: PHARMA_TEAL_LIGHT,
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            margin: '0 0 16px',
          }}
        >
          {c.journeys.eyebrow}
        </p>
        <h1
          className="pdf-display"
          style={{
            fontSize: 'clamp(30px, 4.5vw, 46px)',
            fontWeight: 600,
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          {audience.title}
        </h1>
        <p
          style={{
            margin: '20px 0 0',
            fontSize: 20,
            fontWeight: 600,
            color: PHARMA_TEAL_LIGHT,
            maxWidth: 760,
            lineHeight: 1.4,
          }}
        >
          {audience.tagline}
        </p>
        <p
          style={{
            margin: '16px 0 0',
            fontSize: 17,
            lineHeight: 1.7,
            color: '#CBD5E1',
            maxWidth: 720,
          }}
        >
          {audience.body}
        </p>
      </div>
    </section>
  );
}

function SolutionDetail({ slug }: { slug: SolutionSlug }) {
  const Section = SOLUTION_SECTIONS[slug];
  return (
    <>
      <SolutionHero slug={slug} />
      <Section />
    </>
  );
}

export interface EcosystemPageProps {
  pathname: string;
  onSignIn?: () => void;
}

export function EcosystemPage({ pathname, onSignIn }: EcosystemPageProps) {
  const slug = solutionSlugFromPathname(pathname);
  const normalized = pathname.replace(/\/+$/, '') || '/';

  let content: ReactNode;
  if (slug) {
    content = <SolutionDetail slug={slug} />;
  } else if (normalized === ACADEMY_PATH) {
    content = <AcademySection />;
  } else if (normalized === TRUST_PATH) {
    content = <TrustSection />;
  } else if (normalized === ECOSYSTEM_PATH) {
    content = (
      <>
        <EcosystemFlywheelSection />
        <MarketplaceSection />
      </>
    );
  } else if (normalized === ENTERPRISE_PATH) {
    content = <EnterpriseSection />;
  } else {
    content = <SolutionsIndex />;
  }

  return (
    <LandingI18nProvider>
      <main className="pdf-root">
        <LandingStyles />
        <LandingNav onSignIn={onSignIn} location="page" />
        {content}
        <LandingFooter location="page" />
      </main>
    </LandingI18nProvider>
  );
}
