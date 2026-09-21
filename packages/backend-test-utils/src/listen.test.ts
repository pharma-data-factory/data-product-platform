import type { Server } from 'net';
import express from 'express';
import {
  FETCH_BLOCKED_PORTS,
  listenOnFetchablePort,
  type Listenable,
} from './listen';

/**
 * An app that hands back the ports it is told to, in order.
 *
 * The real bug cannot be provoked on demand — it depends on what the OS
 * happens to offer — so the retry behaviour is tested against a stand-in that
 * can. `close` is recorded, because a rebind that leaks the rejected server is
 * a port leak across a whole suite.
 */
function appOfferingPorts(ports: number[]): Listenable & {
  closed: number[];
} {
  const closed: number[] = [];
  let index = 0;
  return {
    closed,
    listen(_port: number, _hostname: string): Server {
      const port = ports[Math.min(index, ports.length - 1)];
      index += 1;
      const listeners: Record<string, (() => void)[]> = {};
      const server = {
        once(event: string, handler: () => void) {
          (listeners[event] ??= []).push(handler);
          if (event === 'listening') {
            setImmediate(handler);
          }
          return server;
        },
        address: () => ({ address: '127.0.0.1', family: 'IPv4', port }),
        close(callback?: (error?: Error) => void) {
          closed.push(port);
          callback?.();
          return server;
        },
      };
      return server as unknown as Server;
    },
  };
}

describe('listenOnFetchablePort', () => {
  it('returns the first port fetch will accept', async () => {
    const app = appOfferingPorts([40000]);
    const server = await listenOnFetchablePort(app);

    expect(server.port).toBe(40000);
    expect(server.url).toBe('http://127.0.0.1:40000');
    expect(app.closed).toEqual([]);
  });

  it('rebinds past a blocked port and closes the one it rejected', async () => {
    // 6000 is on the Fetch blocklist; without the rebind the suite would get
    // TypeError: fetch failed with cause "bad port".
    const app = appOfferingPorts([6000, 40001]);
    const server = await listenOnFetchablePort(app);

    expect(server.port).toBe(40001);
    expect(app.closed).toEqual([6000]);
  });

  it('rebinds past several in a row', async () => {
    const app = appOfferingPorts([6000, 6697, 10080, 40002]);
    const server = await listenOnFetchablePort(app);

    expect(server.port).toBe(40002);
    expect(app.closed).toEqual([6000, 6697, 10080]);
  });

  it('gives up rather than looping when only blocked ports are offered', async () => {
    // Twenty in a row is not bad luck, it is a broken assumption, and a test
    // suite hanging forever is worse than one failing with a reason.
    const app = appOfferingPorts([6000]);

    await expect(listenOnFetchablePort(app)).rejects.toThrow(
      /Could not bind a port fetch will connect to after 20 attempts/,
    );
  });

  it('lists only ports an unprivileged listen can be handed', () => {
    for (const port of FETCH_BLOCKED_PORTS) {
      expect(port).toBeGreaterThanOrEqual(1024);
    }
  });

  it('binds a real express app and serves over fetch', async () => {
    const app = express();
    app.get('/ping', (_req, res) => {
      res.json({ ok: true });
    });

    const server = await listenOnFetchablePort(app);
    try {
      const response = await fetch(`${server.url}/ping`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(FETCH_BLOCKED_PORTS.has(server.port)).toBe(false);
    } finally {
      await server.close();
    }
  });
});
