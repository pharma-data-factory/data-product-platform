import { useCallback, useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { modelCompanyApiRef, Overview } from '../api';
import type {
  BatchView,
  FactoryApiModel,
  FactoryEquipment,
  GenealogyLink,
  OrderView,
  WarehouseHu,
} from '../factoryModel';
import { normalizeFactory } from '../factoryModel';

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 600): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const message = err instanceof Error ? err.message : String(err);
      const retryable = /\b(503|502|504|401)\b/.test(message) || i === 0;
      if (!retryable || i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw last;
}

export function useFactoryOperations(
  pollMs = 5000,
  options: { publicDemo?: boolean } = {},
) {
  const api = useApi(modelCompanyApiRef);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [factory, setFactory] = useState<FactoryApiModel | null>(null);
  const [equipment, setEquipment] = useState<FactoryEquipment[]>([]);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [batches, setBatches] = useState<BatchView[]>([]);
  const [genealogy, setGenealogy] = useState<GenealogyLink[]>([]);
  const [warehouse, setWarehouse] = useState<WarehouseHu[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const publicDemo = options.publicDemo === true;

  const refresh = useCallback(async () => {
    try {
      if (publicDemo) {
        const demo = await withRetry(() => api.getPublicDemo());
        setOverview(demo.overview);
        setFactory(demo.factory as FactoryApiModel);
        setEquipment(demo.equipment as FactoryEquipment[]);
        setOrders(demo.orders as OrderView[]);
        setBatches(demo.batches as BatchView[]);
        setGenealogy(demo.genealogy as GenealogyLink[]);
        setWarehouse(demo.warehouse as WarehouseHu[]);
        setError(null);
        return;
      }

      const [ov, fac, eq, ord, bat, gen, wh] = await Promise.all([
        withRetry(() => api.getOverview()),
        withRetry(() => api.getFactory() as Promise<FactoryApiModel>),
        withRetry(() => api.getEquipment()),
        withRetry(() => api.getOrders()),
        withRetry(() => api.getBatches()),
        withRetry(() => api.getGenealogy()),
        withRetry(() => api.getWarehouse()),
      ]);
      setOverview(ov);
      setFactory(fac);
      setEquipment((eq.items ?? []) as FactoryEquipment[]);
      setOrders((ord.items ?? []) as OrderView[]);
      setBatches((bat.items ?? []) as BatchView[]);
      setGenealogy((gen.items ?? []) as GenealogyLink[]);
      setWarehouse((wh.items ?? []) as WarehouseHu[]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        !publicDemo && /401/.test(message)
          ? `${message} — Sign in as Guest, then Retry.`
          : message,
      );
    }
  }, [api, publicDemo]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const sites = factory ? normalizeFactory(factory) : [];
  const runtimeById = Object.fromEntries(
    equipment.map(e => [e.id, e.runtime]),
  );

  return {
    api,
    overview,
    factory,
    sites,
    equipment,
    orders,
    batches,
    genealogy,
    warehouse,
    runtimeById,
    error,
    busy,
    refresh,
    run,
  };
}
