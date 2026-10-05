/**
 * Pure helpers for the public installation docs (NXD-114): cut a section out
 * of a document, and resolve the links inside it.
 *
 * The documents are written for GitHub, where `#heading` anchors use GitHub's
 * slug and relative links point at files in the repository. In the portal the
 * headings get Backstage's MarkdownContent slug instead, and a relative link
 * only works if it points at another document of the public set. So every link
 * is resolved here: to an anchor this page really has, to another public
 * document, to the repository when one is configured, or to nothing.
 */

/** The anchor GitHub generates for a heading. */
export function githubSlug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/**
 * The id Backstage's MarkdownContent puts on a heading
 * (`toLocaleLowerCase('en-US').replace(/\W/g, '-')` on the rendered text).
 */
export function backstageSlug(heading: string): string {
  return heading.toLocaleLowerCase('en-US').replace(/\W/g, '-');
}

/** The visible text of a heading line, without `#`, emphasis or code ticks. */
function headingText(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/[`*_]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
}

function headings(markdown: string): string[] {
  const result: string[] = [];
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (/^```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && /^#{1,6}\s/.test(line)) {
      result.push(headingText(line));
    }
  }
  return result;
}

/**
 * The part of `markdown` from the heading `from` (inclusive) to the next
 * heading of the same or a higher level (exclusive). The whole document when
 * the heading is not found, so a renamed heading degrades to "too much" rather
 * than to an empty page.
 */
export function sliceSection(markdown: string, from: string): string {
  const lines = markdown.split('\n');
  let start = -1;
  let level = 0;
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    const match = !fenced && /^(#{1,6})\s/.exec(lines[i]);
    if (!match) {
      continue;
    }
    if (start < 0) {
      if (headingText(lines[i]) === from) {
        start = i;
        level = match[1].length;
      }
    } else if (match[1].length <= level) {
      return lines.slice(start, i).join('\n').trimEnd();
    }
  }
  return start < 0 ? markdown : lines.slice(start).join('\n').trimEnd();
}

export interface LinkContext {
  /** Repository path of the document being shown, e.g. `docs/github-setup.md`. */
  path: string;
  /** Repository path → portal URL, for the documents of the public set. */
  publicPaths: ReadonlyMap<string, string>;
  /** `https://github.com/org/repo/blob/main`, when configured. */
  repositoryBlobUrl?: string;
  /** The markdown being shown; its headings resolve `#` anchors. */
  markdown: string;
}

/** `docs/a/b.md` + `../c.md` → `docs/c.md`. */
function resolvePath(from: string, relative: string): string {
  const parts = from.split('/').slice(0, -1);
  for (const segment of relative.split('/')) {
    if (segment === '..') {
      parts.pop();
    } else if (segment !== '.' && segment !== '') {
      parts.push(segment);
    }
  }
  return parts.join('/');
}

/**
 * Maps a GitHub-style anchor to the `#id` this page actually renders. Also
 * used for the anchor in the address bar when arriving from another document.
 */
export function anchorFor(
  markdown: string,
  anchor: string,
): string | undefined {
  const heading = headings(markdown).find(h => githubSlug(h) === anchor);
  return heading === undefined ? undefined : `#${backstageSlug(heading)}`;
}

/**
 * Where a link in a public document should go. `undefined` renders the text
 * without a link: better than a link into a page the reader cannot open.
 */
export function resolveLink(
  href: string,
  context: LinkContext,
): string | undefined {
  if (/^(https?:|mailto:)/i.test(href)) {
    return href;
  }
  if (href.startsWith('#')) {
    return anchorFor(context.markdown, href.slice(1)) ?? href;
  }

  const [rawPath, anchor] = href.split('#');
  const target = resolvePath(context.path, rawPath);
  const publicUrl = context.publicPaths.get(target);
  if (publicUrl) {
    return anchor ? `${publicUrl}#${anchor}` : publicUrl;
  }
  if (context.repositoryBlobUrl) {
    const base = context.repositoryBlobUrl.replace(/\/$/, '');
    return `${base}/${target}${anchor ? `#${anchor}` : ''}`;
  }
  return undefined;
}
