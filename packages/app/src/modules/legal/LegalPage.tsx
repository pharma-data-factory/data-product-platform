import {
  Content,
  Header,
  Page,
} from '@backstage/core-components';
import { Link, Typography } from '@material-ui/core';
import { LEGAL_NAV, LEGAL_PATHS, legalPageId } from './constants';
import { LandingFooter, LandingNav, LandingStyles } from '../identity/PublicLanding';
import {
  LandingI18nProvider,
  useLandingI18n,
} from '../identity/landingI18n';
import { C, PHARMA_NAVY, PHARMA_TEAL } from '../identity/landingTokens';
import { legalNavCopy, legalPages, type LegalPageCopy } from './legalCopy';
import { openCookieSettings } from './cookieConsent';

export interface LegalPageProps {
  pathname?: string;
  onSignIn?: () => void;
  standalone?: boolean;
}

function LegalBody({
  copy,
}: Readonly<{
  copy: LegalPageCopy;
}>) {
  const { locale } = useLandingI18n();
  const nav = legalNavCopy[locale];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
      {copy.placeholder ? (
        <Typography variant="overline" style={{ color: PHARMA_TEAL }}>
          REVIEW PLACEHOLDER
        </Typography>
      ) : (
        <Typography
          variant="overline"
          style={{ color: PHARMA_TEAL, letterSpacing: '0.14em' }}
        >
          Nexora Digital
        </Typography>
      )}
      <Typography
        variant="h3"
        paragraph
        style={{
          color: PHARMA_NAVY,
          fontWeight: 700,
          marginTop: 8,
          fontFamily: "'Space Grotesk', Inter, system-ui, sans-serif",
        }}
      >
        {copy.title}
      </Typography>

      {copy.intro ? (
        <Typography
          variant="body1"
          paragraph
          style={{ color: C.muted, lineHeight: 1.7, fontWeight: 500 }}
        >
          {copy.intro}
        </Typography>
      ) : null}

      {copy.body?.map(paragraph => (
        <Typography
          key={paragraph}
          variant="body1"
          paragraph
          style={{ color: C.muted, lineHeight: 1.7 }}
        >
          {paragraph}
        </Typography>
      ))}

      {copy.sections?.map(section => (
        <section key={section.heading} style={{ marginTop: 28 }}>
          <Typography
            variant="h6"
            style={{ color: PHARMA_NAVY, fontWeight: 700, marginBottom: 10 }}
          >
            {section.heading}
          </Typography>
          {section.paragraphs
            .slice(0, section.bullets ? 1 : undefined)
            .map(paragraph => (
              <Typography
                key={paragraph}
                variant="body1"
                paragraph
                style={{ color: C.muted, lineHeight: 1.7 }}
              >
                {paragraph}
              </Typography>
            ))}
          {section.bullets ? (
            <ul style={{ margin: '0 0 16px', paddingLeft: 22, color: C.muted }}>
              {section.bullets.map(item => (
                <li key={item} style={{ marginBottom: 6, lineHeight: 1.6 }}>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          {section.bullets
            ? section.paragraphs.slice(1).map(paragraph => (
                <Typography
                  key={paragraph}
                  variant="body1"
                  paragraph
                  style={{ color: C.muted, lineHeight: 1.7 }}
                >
                  {paragraph}
                </Typography>
              ))
            : null}
        </section>
      ))}

      {copy.updated ? (
        <Typography
          variant="body2"
          style={{ marginTop: 32, color: C.muted, fontStyle: 'italic' }}
        >
          {copy.updated}
        </Typography>
      ) : null}

      <Typography variant="body2" style={{ marginTop: 40 }}>
        {LEGAL_NAV.map(item => (
          <Link
            key={item.id}
            href={item.path}
            style={{ marginRight: 16, color: PHARMA_TEAL }}
          >
            {nav[item.id === 'open-source' ? 'openSource' : item.id]}
          </Link>
        ))}
        <Link
          component="button"
          type="button"
          onClick={() => openCookieSettings()}
          style={{
            marginRight: 16,
            color: PHARMA_TEAL,
            background: 'none',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          {nav.cookieSettings}
        </Link>
      </Typography>
    </div>
  );
}

function LegalPageContent({
  pathname,
  onSignIn,
  standalone,
}: LegalPageProps) {
  const { locale } = useLandingI18n();
  const id = legalPageId(
    pathname ??
      (typeof window !== 'undefined' ? window.location.pathname : LEGAL_PATHS.legal),
  );
  const copy = legalPages[locale][id];

  if (standalone) {
    return (
      <main className="pdf-root">
        <LandingStyles />
        <LandingNav onSignIn={onSignIn ?? (() => undefined)} />
        <LegalBody copy={copy} />
        <LandingFooter />
      </main>
    );
  }

  return (
    <Page themeId="tool">
      <Header
        title={copy.title}
        subtitle={
          copy.placeholder
            ? copy.placeholderSubtitle ?? 'Review placeholder'
            : copy.updated ?? 'Nexora Digital'
        }
      />
      <Content>
        <LegalBody copy={copy} />
      </Content>
    </Page>
  );
}

export function LegalPage(props: LegalPageProps) {
  return (
    <LandingI18nProvider>
      <LegalPageContent {...props} />
    </LandingI18nProvider>
  );
}
