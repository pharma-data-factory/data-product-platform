import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { PublishReadinessNotice } from './PublishReadinessNotice';

function renderWith(response: () => Promise<Response>) {
  const discovery = { getBaseUrl: async () => 'http://backend/api/composer' };
  const fetchApi = { fetch: jest.fn(response) };
  render(
    <TestApiProvider
      apis={[
        [discoveryApiRef, discovery],
        [fetchApiRef, fetchApi],
      ]}
    >
      <PublishReadinessNotice />
    </TestApiProvider>,
  );
  return fetchApi;
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('PublishReadinessNotice (NXD-099)', () => {
  it('says before the form that publishing will fail, and why', async () => {
    const fetchApi = renderWith(() =>
      json({
        ready: false,
        reason: 'NO_CREDENTIALS',
        message: 'No GitHub credentials are configured for github.com.',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Golden Paths cannot publish a repository in this environment',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'No GitHub credentials are configured for github.com.',
    );
    expect(fetchApi.fetch).toHaveBeenCalledWith(
      'http://backend/api/composer/scm/publish-readiness',
    );
  });

  it('renders nothing when publishing is possible', async () => {
    const fetchApi = renderWith(() =>
      json({ ready: true, host: 'github.com', owner: 'acme' }),
    );
    await waitFor(() => expect(fetchApi.fetch).toHaveBeenCalled());
    await act(async () => {}); // let the response settle
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not imply publishing works when the check itself failed', async () => {
    renderWith(() => json({ error: 'boom' }, 500));
    expect(
      await screen.findByText(
        'Could not check whether publishing is configured in this environment.',
      ),
    ).toBeInTheDocument();
  });
});
