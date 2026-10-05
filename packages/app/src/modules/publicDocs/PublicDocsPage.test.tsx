import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PublicDocsPage } from './PublicDocsPage';

jest.mock('./sources', () => ({ loadBundledDocument: jest.fn() }));

const README = `# Nexora

Product text that is not installation.

## Installation for administrators

Pick a topology. Then do the [GitHub setup](docs/github-setup.md#setup-checklist--github-as-a-prerequisite).
Also see [the demo guide](docs/demo-guide.md).

## What the platform does

Marketing.
`;

/** The sign-in page renders inside the app's router; so does this test. */
function render(ui: ReactElement) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
}

function loader(files: Record<string, string>) {
  return jest.fn(async (path: string) => {
    if (!(path in files)) {
      throw new Error('missing');
    }
    return files[path];
  });
}

describe('PublicDocsPage (NXD-114)', () => {
  it('lists the installation documents on /install', () => {
    render(<PublicDocsPage pathname="/install" loadDocument={loader({})} />);
    expect(screen.getByText('Set up Nexora')).toBeTruthy();
    expect(
      screen
        .getByText('GitHub setup checklist')
        .closest('a')
        ?.getAttribute('href'),
    ).toBe('/install/github');
    expect(screen.getByText('Users and roles')).toBeTruthy();
  });

  it('shows only the installation section of the README', async () => {
    const load = loader({ 'README.md': README });
    render(<PublicDocsPage pathname="/install/overview" loadDocument={load} />);

    expect(await screen.findByText(/Pick a topology/)).toBeTruthy();
    expect(
      screen.queryByText('Product text that is not installation.'),
    ).toBeNull();
    expect(screen.queryByText('Marketing.')).toBeNull();
    expect(load).toHaveBeenCalledWith('README.md');
  });

  it('links to other public documents in the portal, and drops the rest', async () => {
    render(
      <PublicDocsPage
        pathname="/install/overview"
        loadDocument={loader({ 'README.md': README })}
      />,
    );
    const github = await screen.findByText('GitHub setup');
    expect(github.closest('a')?.getAttribute('href')).toBe(
      '/install/github#setup-checklist--github-as-a-prerequisite',
    );
    // Kept as text inside the paragraph, without a link.
    expect(screen.getByText(/Also see the demo guide/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'the demo guide' })).toBeNull();
  });

  it('sends links outside the set to the repository when configured', async () => {
    render(
      <PublicDocsPage
        pathname="/install/overview"
        repositoryUrl="https://github.com/acme/repo/blob/main"
        loadDocument={loader({ 'README.md': README })}
      />,
    );
    const demo = await screen.findByText('the demo guide');
    expect(demo.closest('a')?.getAttribute('href')).toBe(
      'https://github.com/acme/repo/blob/main/docs/demo-guide.md',
    );
  });

  it('marks the current document in the side navigation', async () => {
    render(
      <PublicDocsPage
        pathname="/install/github"
        loadDocument={loader({
          'docs/github-setup.md': '# GitHub configuration',
        })}
      />,
    );
    await waitFor(() =>
      expect(
        screen
          .getAllByText('GitHub setup checklist')
          .some(el => el.closest('a')?.getAttribute('aria-current') === 'page'),
      ).toBe(true),
    );
  });

  it('says so when a document cannot be loaded', async () => {
    render(
      <PublicDocsPage pathname="/install/start" loadDocument={loader({})} />,
    );
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /could not be loaded/,
    );
  });
});
