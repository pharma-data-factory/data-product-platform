import { useCallback } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadError } from './LoadError';
import { useLoadable } from './useLoadable';

function Probe({ load }: { load: () => Promise<string> }) {
  const stable = useCallback(() => load(), [load]);
  const { value, loading, error, retry } = useLoadable(stable);
  if (loading) return <div>loading</div>;
  if (error) return <LoadError error={error} what="the probe" onRetry={retry} />;
  return <div>value: {value}</div>;
}

describe('useLoadable and LoadError (NXD-094)', () => {
  it('shows the value once loaded', async () => {
    render(<Probe load={async () => 'ready'} />);
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('value: ready')).toBeInTheDocument();
  });

  it('shows a failure as an alert, not as an empty result', async () => {
    render(<Probe load={async () => Promise.reject(new Error('HTTP 500'))} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load the probe');
    expect(screen.queryByText(/value:/)).not.toBeInTheDocument();
  });

  it('loads again on retry and recovers', async () => {
    const load = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce('second time');
    render(<Probe load={load} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('value: second time')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('offers no retry for a permission failure', async () => {
    render(<Probe load={async () => Promise.reject(new Error('403 Forbidden'))} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Not permitted to view the probe',
    );
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('drops a result that arrives after unmount', async () => {
    let resolve: (value: string) => void = () => {};
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <Probe load={() => new Promise<string>(r => (resolve = r))} />,
    );
    unmount();
    await act(async () => resolve('late'));
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('reports a loader that throws synchronously instead of crashing', async () => {
    render(
      <Probe
        load={() => {
          throw new Error('HTTP 500');
        }}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load the probe',
    );
  });

  it('never shows a stack trace to the user', () => {
    render(
      <LoadError
        error={new Error('TypeError: x is undefined\n    at load (api.ts:12:3)')}
        what="the probe"
      />,
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('api.ts');
  });
});
