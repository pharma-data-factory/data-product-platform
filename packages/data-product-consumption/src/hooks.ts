import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { dataProductConsumptionApiRef } from './client';
import { ConsumptionError } from './types';
import type {
  ConsumeContext,
  DataProductDescriptor,
  QueryResult,
  StreamEvent,
} from './types';

export function useDataProduct(productRef: string | undefined) {
  const api = useApi(dataProductConsumptionApiRef);
  const [data, setData] = useState<DataProductDescriptor | null>(null);
  const [error, setError] = useState<ConsumptionError | null>(null);
  const [loading, setLoading] = useState(Boolean(productRef));

  useEffect(() => {
    if (!productRef) {
      setData(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .getDescriptor(productRef)
      .then(d => {
        if (active) {
          setData(d);
          setError(null);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          setError(
            err instanceof ConsumptionError
              ? err
              : new ConsumptionError('UNKNOWN', String(err)),
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [api, productRef]);

  return { data, error, loading };
}

export function useDataProductQuery(options: {
  productRef?: string;
  interfaceId?: string;
  context?: ConsumeContext;
  enabled?: boolean;
}) {
  const api = useApi(dataProductConsumptionApiRef);
  const [data, setData] = useState<QueryResult | null>(null);
  const [error, setError] = useState<ConsumptionError | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!options.productRef || options.enabled === false) {
      return;
    }
    setLoading(true);
    try {
      const result = await api.query({
        entityRef: options.productRef,
        interfaceId: options.interfaceId,
        context: options.context,
      });
      setData(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ConsumptionError
          ? err
          : new ConsumptionError('UNKNOWN', String(err)),
      );
    } finally {
      setLoading(false);
    }
  }, [
    api,
    options.productRef,
    options.interfaceId,
    options.enabled,
    options.context?.site,
    options.context?.area,
    options.context?.line,
    options.context?.equipment,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, error, loading, refresh };
}

export function useDataProductStream(options: {
  productRef?: string;
  interfaceId?: string;
  context?: ConsumeContext;
  enabled?: boolean;
}) {
  const api = useApi(dataProductConsumptionApiRef);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState<'idle' | 'connected' | 'paused' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<ConsumptionError | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    if (!options.productRef || options.enabled === false) {
      return undefined;
    }
    setStatus('connected');
    const handle = api.openStream({
      entityRef: options.productRef,
      interfaceId: options.interfaceId,
      context: options.context,
      onEvent: ev => {
        if (paused.current) return;
        setEvents(prev => [ev, ...prev].slice(0, 100));
      },
      onError: err => {
        setError(err);
        setStatus('error');
      },
    });
    return () => {
      handle.close();
      setStatus('idle');
    };
  }, [api, options.productRef, options.interfaceId, options.context, options.enabled]);

  return {
    events,
    status,
    error,
    eventCount: events.length,
    pause: () => {
      paused.current = true;
      setStatus('paused');
    },
    resume: () => {
      paused.current = false;
      setStatus('connected');
    },
  };
}

export function useDataProductContract(productRef: string | undefined) {
  const { data, error, loading } = useDataProduct(productRef);
  return {
    inputs: data?.contracts.inputs ?? [],
    outputs: data?.contracts.outputs ?? [],
    error,
    loading,
  };
}

export function useDataProductQuality(productRef: string | undefined) {
  const { data, error, loading } = useDataProduct(productRef);
  return { quality: data?.quality, error, loading };
}

export function useDataProductLineage(productRef: string | undefined) {
  const { data, error, loading } = useDataProduct(productRef);
  return { lineage: data?.lineage ?? [], error, loading };
}
