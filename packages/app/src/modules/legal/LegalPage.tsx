import {
  Content,
  Header,
  Page,
} from '@backstage/core-components';
import { Link, Typography } from '@material-ui/core';
import { LEGAL_NAV, legalPageId } from './constants';
import { LandingFooter, LandingNav, LandingStyles } from '../identity/PublicLanding';
import { LandingI18nProvider } from '../identity/landingI18n';

export interface LegalPageProps {
  pathname?: string;
  onSignIn?: () => void;
  standalone?: boolean;
}

const COPY: Record<
  ReturnType<typeof legalPageId>,
  { title: string; body: string[] }
> = {
  legal: {
    title: 'Legal',
    body: [
      'REVIEW PLACEHOLDER — this page is prepared for counsel. It is not final legal terms.',
      'Counsel gates in LEGAL-READINESS-PHASE-0.md remain OPEN. Template Edition is available for a controlled pilot and is not commercially distributable until those gates are APPROVED.',
      'CERTIFIED means technical conformance to the Pharma Data Factory standard. It is not GxP, CSV, or regulatory validation.',
    ],
  },
  privacy: {
    title: 'Privacy',
    body: [
      'REVIEW PLACEHOLDER — no counsel-approved privacy policy is published yet.',
      'Do not treat this page as a privacy statement, processing record, or GDPR/DSGVO notice.',
    ],
  },
  terms: {
    title: 'Terms',
    body: [
      'REVIEW PLACEHOLDER — no counsel-approved terms of use are published yet.',
      'Do not treat this page as a binding customer agreement.',
    ],
  },
  openSource: {
    title: 'Open source',
    body: [
      'REVIEW PLACEHOLDER — NOTICE and THIRD_PARTY_NOTICES text is not counsel-approved yet.',
      'Pharma Data Factory is a commercial product. Backstage is the open-source framework (Apache-2.0). Apache-2.0 does not grant trademark rights in Backstage®.',
      'Required OSS attribution will be published here after counsel completes the Phase 0 gates. This page does not replace LICENSE or NOTICE files.',
    ],
  },
};

export function LegalPage({
  pathname,
  onSignIn,
  standalone = false,
}: LegalPageProps) {
  const id = legalPageId(pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/legal'));
  const copy = COPY[id];
  const body = (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: standalone ? '48px 24px 80px' : 0 }}>
      <Typography variant="overline">REVIEW PLACEHOLDER</Typography>
      <Typography variant="h3" paragraph>
        {copy.title}
      </Typography>
      {copy.body.map(paragraph => (
        <Typography key={paragraph} variant="body1" paragraph>
          {paragraph}
        </Typography>
      ))}
      <Typography variant="body2">
        {LEGAL_NAV.map(item => (
          <Link key={item.id} href={item.path} style={{ marginRight: 16 }}>
            {item.title}
          </Link>
        ))}
      </Typography>
    </div>
  );

  if (standalone) {
    return (
      <LandingI18nProvider>
        <main className="pdf-root">
          <LandingStyles />
          <LandingNav onSignIn={onSignIn ?? (() => undefined)} />
          {body}
          <LandingFooter />
        </main>
      </LandingI18nProvider>
    );
  }

  return (
    <Page themeId="tool">
      <Header title={copy.title} subtitle="Review placeholder · not final legal terms" />
      <Content>{body}</Content>
    </Page>
  );
}
