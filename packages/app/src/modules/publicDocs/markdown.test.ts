import {
  anchorFor,
  backstageSlug,
  githubSlug,
  resolveLink,
  sliceSection,
} from './markdown';

const DOC = `# Title

Intro.

## Setup checklist — GitHub as a prerequisite

### 1. OAuth App — sign-in

Step.

\`\`\`bash
# not a heading
\`\`\`

### 2. GitHub App

More.

## Local setup

Other.
`;

describe('slugs', () => {
  it('matches GitHub for headings with punctuation', () => {
    expect(githubSlug('Setup checklist — GitHub as a prerequisite')).toBe(
      'setup-checklist--github-as-a-prerequisite',
    );
    expect(githubSlug('Optional: GitHub team sync (NXD-108)')).toBe(
      'optional-github-team-sync-nxd-108',
    );
  });

  it('matches the id Backstage MarkdownContent renders', () => {
    expect(backstageSlug('Setup checklist — GitHub as a prerequisite')).toBe(
      'setup-checklist---github-as-a-prerequisite',
    );
  });
});

describe('sliceSection', () => {
  it('cuts from the heading to the next sibling, ignoring fenced code', () => {
    const section = sliceSection(
      DOC,
      'Setup checklist — GitHub as a prerequisite',
    );
    expect(section.startsWith('## Setup checklist')).toBe(true);
    expect(section).toContain('### 2. GitHub App');
    expect(section).toContain('# not a heading');
    expect(section).not.toContain('Local setup');
  });

  it('returns the whole document when the heading is gone', () => {
    expect(sliceSection(DOC, 'Renamed heading')).toBe(DOC);
  });
});

describe('anchorFor', () => {
  it('maps a GitHub anchor to the rendered id', () => {
    expect(anchorFor(DOC, '1-oauth-app--sign-in')).toBe(
      '#1--oauth-app---sign-in',
    );
    expect(anchorFor(DOC, 'not-a-heading')).toBeUndefined();
  });
});

describe('resolveLink', () => {
  const publicPaths = new Map([
    ['docs/github-setup.md', '/install/github'],
    ['docs/identity-and-rbac.md', '/install/users-and-roles'],
    ['START.md', '/install/start'],
  ]);
  const context = {
    path: 'docs/github-setup.md',
    publicPaths,
    markdown: DOC,
  };

  it('keeps external links', () => {
    expect(resolveLink('https://github.com', context)).toBe(
      'https://github.com',
    );
  });

  it('rewrites an in-page anchor to the rendered id', () => {
    expect(resolveLink('#2-github-app', context)).toBe('#2--github-app');
    expect(resolveLink('#1-oauth-app--sign-in', context)).toBe(
      '#1--oauth-app---sign-in',
    );
  });

  it('sends a link to another public document to its portal page', () => {
    expect(resolveLink('identity-and-rbac.md', context)).toBe(
      '/install/users-and-roles',
    );
    expect(resolveLink('../START.md#c--dev-server', context)).toBe(
      '/install/start#c--dev-server',
    );
  });

  it('sends other repository files to GitHub when configured', () => {
    expect(
      resolveLink('demo-guide.md', {
        ...context,
        repositoryBlobUrl: 'https://github.com/acme/repo/blob/main/',
      }),
    ).toBe('https://github.com/acme/repo/blob/main/docs/demo-guide.md');
  });

  it('drops the link otherwise, rather than pointing behind sign-in', () => {
    expect(resolveLink('demo-guide.md', context)).toBeUndefined();
  });
});
