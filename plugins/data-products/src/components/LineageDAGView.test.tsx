/**
 * The lineage view's two honest states.
 *
 * Both were wrong in the same way before `NXD-085`: the component made claims
 * it had no basis for. Its empty state advertised
 * `GET /api/composer/versions/:id/lineage/dag` — an endpoint with no frontend
 * consumer anywhere, on the very page that would render it — and every failure
 * path fell through to that same empty state, so "this product has no lineage"
 * and "the Composer did not answer" were indistinguishable to a reader.
 *
 * The second is the one that matters. An empty graph is a statement about the
 * product; a failed request is a statement about the platform. Rendering the
 * first when the second is true is the UI form of a silent fail-open, which
 * this repository has now met three times — `NXD-045`'s unlogged policy
 * resolver, the swallowed `catch` here, and `NXD-083`'s route that could not
 * answer at all.
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LineageDAGView } from './LineageDAGView';

const getBaseUrl = jest.fn(async () => 'http://composer.test');

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: () => ({ getBaseUrl }),
  discoveryApiRef: { id: 'discovery' },
}));

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const EMPTY_IMPACT = {
  artifactName: 'cold-room-temperature',
  affectedVersions: [],
  affectedContracts: [],
};

function answer(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe('LineageDAGView', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    getBaseUrl.mockClear();
  });

  it('does not advertise an endpoint no page calls', async () => {
    fetchMock.mockResolvedValue(answer(EMPTY_IMPACT));

    render(<LineageDAGView productName="cold-room-temperature" />);

    await waitFor(() =>
      expect(
        screen.getByText(/No lineage data available yet/),
      ).toBeInTheDocument(),
    );
    // The multi-hop DAG route is real and unconsumed. Naming it here told a
    // reader the page could show it.
    expect(screen.queryByText(/lineage\/dag/)).not.toBeInTheDocument();
  });

  it('still says how lineage gets populated, which is a thing the reader can act on', async () => {
    fetchMock.mockResolvedValue(answer(EMPTY_IMPACT));

    render(<LineageDAGView productName="cold-room-temperature" />);

    await waitFor(() =>
      expect(screen.getByText(/dependencies/)).toBeInTheDocument(),
    );
  });

  it.each([
    ['a non-OK response', () => Promise.resolve(answer({}, false, 503))],
    ['a rejected request', () => Promise.reject(new Error('ECONNREFUSED'))],
  ])(
    'distinguishes a failure from an empty graph — %s',
    async (_label, impl) => {
      fetchMock.mockImplementation(impl);

      render(<LineageDAGView productName="cold-room-temperature" />);

      await waitFor(() =>
        expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument(),
      );
      // The distinction is the whole point: the failure state must not be read
      // as "this product has no lineage".
      expect(
        screen.queryByText(/No lineage data available yet/),
      ).not.toBeInTheDocument();
    },
  );
});
