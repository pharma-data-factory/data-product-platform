import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import { ConsumptionError } from './types';
import type {
  ConsumeContext,
  DataProductDescriptor,
  QueryResult,
  StreamEvent,
} from './types';

export const dataProductConsumptionApiRef =
  createApiRef<DataProductConsumptionApi>({
    id: 'plugin.data-product-consumption.service',
  });

export interface DataProductConsumptionApi {
  getDescriptor(entityRef: string): Promise<DataProductDescriptor>;
  query(options: {
    entityRef: string;
    interfaceId?: string;
    context?: ConsumeContext;
    limit?: number;
  }): Promise<QueryResult>;
  openStream(options: {
    entityRef: string;
    interfaceId?: string;
    context?: ConsumeContext;
    onEvent: (event: StreamEvent) => void;
    onError?: (error: ConsumptionError) => void;
  }): { close: () => void };
}

function mapHttpError(status: number, body: string): ConsumptionError {
  if (status === 404) return new ConsumptionError('NOT_FOUND', body || 'Not found');
  if (status === 403) return new ConsumptionError('FORBIDDEN', body || 'Forbidden');
  if (status === 408 || status === 504) {
    return new ConsumptionError('TIMEOUT', body || 'Timeout');
  }
  if (status >= 500) {
    return new ConsumptionError('UPSTREAM_UNAVAILABLE', body || 'Upstream unavailable');
  }
  return new ConsumptionError('UNKNOWN', body || `HTTP ${status}`);
}

export class DataProductConsumptionClient implements DataProductConsumptionApi {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
    },
  ) {}

  private async base() {
    return this.options.discoveryApi.getBaseUrl('data-products');
  }

  private async getJson<T>(path: string): Promise<T> {
    const url = `${await this.base()}${path}`;
    let response: Response;
    try {
      response = await this.options.fetchApi.fetch(url);
    } catch (cause) {
      throw new ConsumptionError('UPSTREAM_UNAVAILABLE', 'Network error', cause);
    }
    if (!response.ok) {
      throw mapHttpError(response.status, await response.text());
    }
    return response.json() as Promise<T>;
  }

  getDescriptor(entityRef: string) {
    return this.getJson<DataProductDescriptor>(
      `/consume/products/${encodeURIComponent(entityRef)}`,
    );
  }

  query(options: {
    entityRef: string;
    interfaceId?: string;
    context?: ConsumeContext;
    limit?: number;
  }) {
    const params = new URLSearchParams({
      entityRef: options.entityRef,
      interfaceId: options.interfaceId ?? 'query',
      limit: String(options.limit ?? 50),
    });
    if (options.context?.site) params.set('site', options.context.site);
    if (options.context?.line) params.set('line', options.context.line);
    if (options.context?.equipment) params.set('equipment', options.context.equipment);
    if (options.context?.area) params.set('area', options.context.area);
    return this.getJson<QueryResult>(`/consume/query?${params.toString()}`);
  }

  openStream(options: {
    entityRef: string;
    interfaceId?: string;
    context?: ConsumeContext;
    onEvent: (event: StreamEvent) => void;
    onError?: (error: ConsumptionError) => void;
  }) {
    let closed = false;
    let source: EventSource | undefined;

    (async () => {
      const params = new URLSearchParams({
        entityRef: options.entityRef,
        interfaceId: options.interfaceId ?? 'realtime',
      });
      if (options.context?.equipment) params.set('equipment', options.context.equipment);
      if (options.context?.site) params.set('site', options.context.site);
      const url = `${await this.base()}/consume/stream?${params.toString()}`;
      // EventSource cannot set Authorization headers; backend allows cookie/session
      // via same-origin when using Backstage proxy. For v1 we use fetch polling fallback
      // if EventSource fails auth — see pollStream.
      try {
        source = new EventSource(url, { withCredentials: true });
        source.onmessage = ev => {
          if (closed) return;
          try {
            options.onEvent(JSON.parse(ev.data) as StreamEvent);
          } catch (cause) {
            options.onError?.(
              new ConsumptionError('CONTRACT_VIOLATION', 'Invalid stream payload', cause),
            );
          }
        };
        source.onerror = () => {
          // Fall back to polling when SSE not authenticated
          source?.close();
          void this.pollStream(options, () => closed);
        };
      } catch {
        void this.pollStream(options, () => closed);
      }
    })();

    return {
      close: () => {
        closed = true;
        source?.close();
      },
    };
  }

  private async pollStream(
    options: {
      entityRef: string;
      interfaceId?: string;
      context?: ConsumeContext;
      onEvent: (event: StreamEvent) => void;
      onError?: (error: ConsumptionError) => void;
    },
    isClosed: () => boolean,
  ) {
    while (!isClosed()) {
      try {
        const params = new URLSearchParams({
          entityRef: options.entityRef,
          interfaceId: options.interfaceId ?? 'realtime',
          poll: '1',
        });
        if (options.context?.equipment) {
          params.set('equipment', options.context.equipment);
        }
        const batch = await this.getJson<{ items: StreamEvent[] }>(
          `/consume/stream-poll?${params.toString()}`,
        );
        for (const item of batch.items) {
          if (isClosed()) return;
          options.onEvent(item);
        }
      } catch (err) {
        options.onError?.(
          err instanceof ConsumptionError
            ? err
            : new ConsumptionError('UNKNOWN', String(err)),
        );
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
