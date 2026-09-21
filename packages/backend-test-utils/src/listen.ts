/**
 * Binding a test server to a port `fetch` will actually connect to.
 *
 * The Fetch standard keeps a blocklist of ports — 6000, 6697, 10080 and
 * friends — that `fetch` refuses *before* opening a socket, raising
 * `TypeError: fetch failed` with cause `bad port`. That is normally
 * unreachable, because the usual Linux ephemeral range starts at 32768, but a
 * container whose `ip_local_port_range` starts at 1024 can hand one of them
 * straight to `app.listen(0)`. The request then fails for reasons that have
 * nothing to do with the test, on a different test each run.
 *
 * The whole fix is to notice and rebind. It lives here rather than in each
 * suite because eight backend test files need it and eight copies of a
 * blocklist is eight chances for one of them to fall behind the spec.
 *
 * Only relevant to callers that use `fetch`. `http.request` does not consult
 * the blocklist, so a suite driving its server that way is unaffected and does
 * not need this.
 *
 * See docs/nexora-transformation/DECISIONS.md (NXD-017).
 * https://fetch.spec.whatwg.org/#bad-port-blocklist
 */

import type { AddressInfo, Server } from 'net';

/**
 * Blocked ports an unprivileged `listen(0)` can actually be handed.
 *
 * The spec's list also contains ports below 1024; they are left out because
 * nothing can bind them here, and a shorter list is one fewer thing to keep
 * accurate.
 */
export const FETCH_BLOCKED_PORTS: ReadonlySet<number> = new Set([
  1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666,
  6667, 6668, 6669, 6679, 6697, 10080,
]);

export interface ListeningServer {
  /** Base URL, without a trailing slash. */
  url: string;
  port: number;
  close(): Promise<void>;
}

/** What `listenOnFetchablePort` needs of an app: the ability to listen. */
export interface Listenable {
  listen(port: number, hostname: string): Server;
}

const MAX_ATTEMPTS = 20;

/**
 * Listens on an ephemeral port, retrying while the OS hands back one `fetch`
 * refuses.
 *
 * Bounded rather than unbounded: drawing twenty blocked ports in a row is not
 * bad luck, it is a broken assumption, and looping forever would hide it.
 */
export async function listenOnFetchablePort(
  app: Listenable,
  hostname = '127.0.0.1',
): Promise<ListeningServer> {
  const rejected: number[] = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const server = app.listen(0, hostname);
    await new Promise<void>((resolve, reject) => {
      server.once('listening', () => resolve());
      server.once('error', reject);
    });
    const { port } = server.address() as AddressInfo;

    if (FETCH_BLOCKED_PORTS.has(port)) {
      rejected.push(port);
      await new Promise<void>(resolve => server.close(() => resolve()));
      continue;
    }

    return {
      url: `http://${hostname}:${port}`,
      port,
      close: () =>
        new Promise<void>((resolve, reject) =>
          server.close(error => (error ? reject(error) : resolve())),
        ),
    };
  }

  throw new Error(
    `Could not bind a port fetch will connect to after ${MAX_ATTEMPTS} ` +
      `attempts; the OS offered only blocked ports (${rejected.join(', ')}).`,
  );
}
