import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { discoveryApiRef } from '@backstage/core-plugin-api';
import { PlatformFooter } from './PlatformFooter';

/**
 * NXD-095. Service health was the colour of an 8px dot, with the words in a
 * tooltip on an element nothing could focus.
 */
describe('PlatformFooter service status', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('names each state for a screen reader and writes out a failure', async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url.includes('urs-composer')) {
        return { ok: false, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({ llmEnabled: true }) };
    }) as unknown as typeof fetch;
    const discovery = {
      getBaseUrl: async (pluginId: string) => `http://backend/api/${pluginId}`,
    };

    await act(async () => {
      render(
        <TestApiProvider apis={[[discoveryApiRef, discovery]]}>
          <PlatformFooter />
        </TestApiProvider>,
      );
    });

    const down = screen.getByRole('img', { name: 'URS Composer: Down' });
    // Not colour alone: the word is on screen as well.
    expect(down).toHaveTextContent('URS Composer · down');
    expect(screen.getByRole('img', { name: 'Backend: OK' })).toHaveTextContent(
      /^Backend$/,
    );
    expect(screen.getByRole('region', { name: 'Service status' })).toBeInTheDocument();
  });
});
