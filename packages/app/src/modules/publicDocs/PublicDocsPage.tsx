/**
 * `/install` — the installation and setup docs, readable without signing in
 * (NXD-114).
 *
 * Rendered by the landing page in front of sign-in, like the legal pages, in
 * the same chrome. The person who needs these documents is often the one
 * whose sign-in does not work yet: GitHub not configured, no administrator,
 * the database not started. TechDocs, behind sign-in, keeps the full set.
 */

import { useEffect, useMemo, useState } from 'react';
import { MarkdownContent } from '@backstage/core-components';
import { Link, Typography } from '@material-ui/core';
import {
  LandingFooter,
  LandingNav,
  LandingStyles,
} from '../identity/PublicLanding';
import { LandingI18nProvider, useLandingI18n } from '../identity/landingI18n';
import { C, PHARMA_NAVY, PHARMA_TEAL } from '../identity/landingTokens';
import {
  PUBLIC_DOCS,
  PUBLIC_DOCS_PATH,
  PUBLIC_DOC_URLS,
  PublicDoc,
  publicDocFor,
} from './constants';
import { anchorFor, resolveLink, sliceSection } from './markdown';
import type { DocumentLoader } from './sources';

/**
 * Loaded on first use: the landing page imports this module, and the bundled
 * documents are only needed once someone opens one.
 */
const loadBundledDocument: DocumentLoader = path =>
  import('./sources').then(m => m.loadBundledDocument(path));

export interface PublicDocsPageProps {
  pathname?: string;
  onSignIn?: () => void;
  /** `nexora.publicDocs.repositoryUrl`. */
  repositoryUrl?: string;
  /** Replaced in tests. */
  loadDocument?: DocumentLoader;
}

const COPY = {
  en: {
    eyebrow: 'Installation & setup',
    title: 'Set up Nexora',
    intro:
      'Everything an administrator needs before sign-in works: where the parts run, GitHub as a prerequisite, the first administrator. The complete documentation is in the portal after sign-in.',
    loading: 'Loading…',
    failed: 'This document could not be loaded.',
    all: 'All setup documents',
    diagram: 'Diagrams are drawn on GitHub; here they appear as their source.',
  },
  de: {
    eyebrow: 'Installation & Einrichtung',
    title: 'Nexora einrichten',
    intro:
      'Alles, was ein Administrator braucht, bevor die Anmeldung funktioniert: wo die Teile laufen, GitHub als Voraussetzung, der erste Administrator. Die vollständige Dokumentation steht nach der Anmeldung im Portal.',
    loading: 'Wird geladen…',
    failed: 'Dieses Dokument konnte nicht geladen werden.',
    all: 'Alle Einrichtungsdokumente',
    diagram: 'Diagramme zeichnet GitHub; hier erscheinen sie als Quelltext.',
  },
} as const;

function useCopy() {
  const { locale } = useLandingI18n();
  return COPY[locale === 'de' ? 'de' : 'en'];
}

function DocIndex() {
  const copy = useCopy();
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {PUBLIC_DOCS.map(doc => (
        <a
          key={doc.slug}
          href={`${PUBLIC_DOCS_PATH}/${doc.slug}`}
          className="pdf-focus"
          style={{
            display: 'block',
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
            textDecoration: 'none',
          }}
        >
          <Typography variant="h6" style={{ color: PHARMA_NAVY }}>
            {doc.title}
          </Typography>
          <Typography variant="body2" style={{ color: C.muted, marginTop: 4 }}>
            {doc.summary}
          </Typography>
        </a>
      ))}
      <Typography variant="body2" style={{ color: C.muted }}>
        {copy.intro}
      </Typography>
    </div>
  );
}

function DocView({
  doc,
  repositoryUrl,
  loadDocument,
}: {
  doc: PublicDoc;
  repositoryUrl?: string;
  loadDocument: DocumentLoader;
}) {
  const copy = useCopy();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'failed' }
    | { status: 'ok'; text: string }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadDocument(doc.path)
      .then(raw => {
        if (!cancelled) {
          setState({
            status: 'ok',
            text: doc.section ? sliceSection(raw, doc.section) : raw,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'failed' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [doc, loadDocument]);

  const markdown = state.status === 'ok' ? state.text : '';

  // Arriving from another document with a GitHub-style anchor: scroll to the
  // heading this page actually renders.
  useEffect(() => {
    if (!markdown || !window.location.hash) {
      return;
    }
    const target = anchorFor(markdown, window.location.hash.slice(1));
    const element = target
      ? document.getElementById(target.slice(1))
      : undefined;
    element?.scrollIntoView();
  }, [markdown]);

  // react-markdown assigns the result to `href` as is, so undefined renders
  // an `<a>` without href: the text stays, the dead link does not. The
  // Backstage type says string; the runtime takes undefined.
  const transformLinkUri = useMemo(
    () => (href: string) =>
      resolveLink(href, {
        path: doc.path,
        publicPaths: PUBLIC_DOC_URLS,
        repositoryBlobUrl: repositoryUrl,
        markdown,
      }) as string,
    [doc.path, repositoryUrl, markdown],
  );

  if (state.status === 'loading') {
    return <Typography style={{ color: C.muted }}>{copy.loading}</Typography>;
  }
  if (state.status === 'failed') {
    return <Typography role="alert">{copy.failed}</Typography>;
  }
  return (
    <article aria-label={doc.title}>
      {markdown.includes('```mermaid') ? (
        <Typography
          variant="body2"
          style={{ color: C.muted, marginBottom: 16 }}
        >
          {copy.diagram}
        </Typography>
      ) : null}
      <MarkdownContent
        content={markdown}
        dialect="gfm"
        transformLinkUri={transformLinkUri}
      />
    </article>
  );
}

function PublicDocsContent({
  pathname,
  onSignIn,
  repositoryUrl,
  loadDocument = loadBundledDocument,
}: PublicDocsPageProps) {
  const copy = useCopy();
  const doc = publicDocFor(
    pathname ??
      (typeof window !== 'undefined'
        ? window.location.pathname
        : PUBLIC_DOCS_PATH),
  );

  return (
    <main className="pdf-root">
      <LandingStyles />
      <LandingNav onSignIn={onSignIn ?? (() => undefined)} location="page" />
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '48px 24px 80px',
          display: 'grid',
          gridTemplateColumns: doc ? 'minmax(180px, 240px) 1fr' : '1fr',
          gap: 40,
        }}
      >
        {doc ? (
          <nav aria-label={copy.all} style={{ fontSize: 14 }}>
            <Link href={PUBLIC_DOCS_PATH} style={{ color: PHARMA_TEAL }}>
              {copy.all}
            </Link>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
              {PUBLIC_DOCS.map(item => (
                <li key={item.slug} style={{ marginBottom: 10 }}>
                  <Link
                    href={`${PUBLIC_DOCS_PATH}/${item.slug}`}
                    aria-current={item.slug === doc.slug ? 'page' : undefined}
                    style={{
                      color: item.slug === doc.slug ? PHARMA_NAVY : C.muted,
                      fontWeight: item.slug === doc.slug ? 700 : 400,
                    }}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            style={{ color: PHARMA_TEAL, letterSpacing: '0.14em' }}
          >
            {copy.eyebrow}
          </Typography>
          {doc ? (
            <DocView
              doc={doc}
              repositoryUrl={repositoryUrl}
              loadDocument={loadDocument}
            />
          ) : (
            <>
              <Typography
                variant="h3"
                paragraph
                style={{ color: PHARMA_NAVY, fontWeight: 700, marginTop: 8 }}
              >
                {copy.title}
              </Typography>
              <DocIndex />
            </>
          )}
        </div>
      </div>
      <LandingFooter location="page" />
    </main>
  );
}

export function PublicDocsPage(props: PublicDocsPageProps) {
  return (
    <LandingI18nProvider>
      <PublicDocsContent {...props} />
    </LandingI18nProvider>
  );
}
