/**
 * Where artifact content comes from.
 *
 * Until now there was one answer and it was not written down anywhere: the
 * loader called `readFile`. `ArtifactVersion.sourceRef` existed as the intended
 * seam and was never dereferenced, so "multiple source/package providers" — the
 * last open item of Phase 7 — had a declared field, a plan, and no mechanism.
 *
 * A provider answers one question: **what manifest documents are at this
 * source, and what does each one say?** Enumeration and reading are one
 * operation on purpose. A directory can be walked and a URL cannot, and an
 * interface that pretends otherwise forces every caller to know which kind it
 * is holding.
 *
 * Two implementations ship, because one is not an abstraction. The filesystem
 * provider is the behaviour that already existed, moved behind the seam
 * unchanged. The HTTP provider is the proof that the seam is real.
 *
 * **Refs are portable.** A document's ref is `file:<path relative to the
 * configured root>` or the URL itself — never an absolute path off this
 * machine. That constraint comes from NXD-074: an installation that federates
 * content must be able to say where something came from in terms the receiver
 * can also resolve. `/workspaces/…/catalog/artifacts/x.yaml` means nothing
 * anywhere else.
 *
 * **Explicit non-goal:** `spec.sourceRef` is not touched. It is authored data
 * carrying values like `template:default/mqtt-temperature-data-product`, which
 * resolve against whoever reads them and are therefore not portable. Making
 * them so is a change to what manifests mean, not to how they are fetched.
 * NXD-076 records it as still open.
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative, sep } from 'path';
import { parse as parseYaml } from 'yaml';

/** One manifest document, with a portable reference to where it came from. */
export interface LoadedDocument {
  /** `file:catalog/artifacts/nexora/x.yaml` or `https://host/x.yaml`. */
  ref: string;
  document: unknown;
}

/** A document that could not be read or parsed. */
export interface DocumentFailure {
  ref: string;
  reason: string;
}

export interface ProviderResult {
  documents: LoadedDocument[];
  failures: DocumentFailure[];
}

export interface ArtifactContentProvider {
  /** Names the provider in logs. Not a scheme — `canResolve` decides that. */
  readonly name: string;
  /** Whether this provider handles the given source. */
  canResolve(source: string): boolean;
  /**
   * Every manifest document at `source`.
   *
   * `undefined` means the source is not there — a distinct answer from "there
   * and empty". An installation that ships no manifests is legitimate, and a
   * missing source must not read as a failure.
   */
  load(source: string): Promise<ProviderResult | undefined>;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** A ref that means the same thing on another machine. */
function portableFileRef(root: string, path: string): string {
  const rel = relative(root, path);
  // Normalised so a ref recorded on Windows reads the same on Linux.
  return `file:${rel.split(sep).join('/')}`;
}

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

async function listYamlFiles(
  directory: string,
): Promise<string[] | undefined> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...((await listYamlFiles(path)) ?? []));
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      files.push(path);
    }
  }
  // Sorted so a load is reproducible and a failure list is stable.
  return files.sort();
}

/**
 * The behaviour that already existed, behind the seam and otherwise unchanged.
 *
 * `root` is what refs are made relative to. It is the configured directory, so
 * a manifest at `<root>/nexora/x.yaml` is `file:nexora/x.yaml` regardless of
 * where the repository is checked out.
 */
export function createFilesystemProvider(): ArtifactContentProvider {
  return {
    name: 'filesystem',
    // Declines anything carrying a URI scheme rather than claiming everything
    // that is not HTTP. As a catch-all it swallowed `ftp://…` as a directory
    // name, found nothing, and reported "not there" — so a mistyped scheme
    // did nothing at all and said nothing about it. Unknown schemes now reach
    // the no-provider branch and are reported as the configuration error they
    // are. A Windows path (`C:\…`) has no `//` and is unaffected.
    canResolve: source => !/^[a-z][a-z0-9+.-]*:\/\//i.test(source),
    async load(source) {
      const files = await listYamlFiles(source);
      if (files === undefined) {
        return undefined;
      }
      const documents: LoadedDocument[] = [];
      const failures: DocumentFailure[] = [];
      for (const path of files) {
        const ref = portableFileRef(source, path);
        try {
          documents.push({ ref, document: parseYaml(await readFile(path, 'utf8')) });
        } catch (error) {
          failures.push({ ref, reason: describe(error) });
        }
      }
      return { documents, failures };
    },
  };
}

// ---------------------------------------------------------------------------
// HTTP(S)
// ---------------------------------------------------------------------------

/** Long enough for a slow mirror, short enough not to hold up a backend. */
const HTTP_TIMEOUT_MS = 15_000;

export interface HttpProviderOptions {
  /** Injected so a test can drive it without a network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * One URL, one manifest document.
 *
 * Deliberately not an index format. A directory can be walked because the
 * filesystem answers "what is in here"; HTTP does not, and inventing a
 * Nexora-specific index would be a second manifest schema nobody asked for.
 * Listing the URLs in configuration is explicit, reviewable, and enough to
 * prove the seam. If an index is ever wanted it is a third provider, not a
 * change to this one.
 *
 * A source that answers 404 is **not there**, which is the same answer the
 * filesystem provider gives for a missing directory — an operator who
 * configures a URL that has not been published yet gets a log line, not a
 * failed startup. Any other non-OK status is a failure, because it means the
 * source exists and something went wrong.
 */
export function createHttpProvider(
  options: HttpProviderOptions = {},
): ArtifactContentProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;

  return {
    name: 'http',
    canResolve: source => /^https?:\/\//i.test(source),
    async load(source) {
      let response: Response;
      try {
        response = await fetchImpl(source, {
          headers: { Accept: 'application/yaml, text/yaml, text/plain' },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        return {
          documents: [],
          failures: [{ ref: source, reason: describe(error) }],
        };
      }

      if (response.status === 404) {
        return undefined;
      }
      if (!response.ok) {
        return {
          documents: [],
          failures: [
            {
              ref: source,
              reason: `HTTP ${response.status} ${response.statusText}`,
            },
          ],
        };
      }

      try {
        const body = await response.text();
        return {
          documents: [{ ref: source, document: parseYaml(body) }],
          failures: [],
        };
      } catch (error) {
        return {
          documents: [],
          failures: [{ ref: source, reason: describe(error) }],
        };
      }
    },
  };
}

/** The providers a default installation resolves content with. */
export function defaultContentProviders(
  options: HttpProviderOptions = {},
): ArtifactContentProvider[] {
  return [createFilesystemProvider(), createHttpProvider(options)];
}

/** The provider that answers for `source`, or undefined if none does. */
export function providerFor(
  providers: readonly ArtifactContentProvider[],
  source: string,
): ArtifactContentProvider | undefined {
  return providers.find(provider => provider.canResolve(source));
}
