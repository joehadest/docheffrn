'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Pedido } from '@/types/cart';
import type { FinancePeriod } from '@/utils/financePeriod';

export type AdminOrderUpdate = { status?: Pedido['status']; courierId?: string | null; expectedStatus?: Pedido['status']; cancelReason?: string };
type AdminData = {
  orders: Pedido[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  updateOrder: (id: string, updates: AdminOrderUpdate) => Promise<void>;
  financialPeriod: FinancePeriod;
  setFinancialPeriod: (period: FinancePeriod) => void;
};
const Context = createContext<AdminData | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [financialPeriod, setFinancialPeriod] = useState<FinancePeriod>({ type: 'preset', preset: 'today' });
  const pending = useRef<Promise<void> | null>(null);
  const revision = useRef(0);
  const mounted = useRef(true);
  const refresh = useCallback((): Promise<void> => {
    if (pending.current) return pending.current;
    const version = revision.current;
    setRefreshing(true);
    const request = (async () => {
      try {
        const res = await fetch('/api/pedidos', { cache: 'no-store' });
        if (res.status === 401) { window.location.assign('/admin/login'); return; }
        const result = await res.json();
        if (!res.ok || !result.success || !Array.isArray(result.data)) throw new Error('Não foi possível atualizar os pedidos.');
        if (mounted.current && version === revision.current) {
          setOrders(result.data);
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (failure) {
        if (mounted.current) setError(failure instanceof Error ? failure.message : 'Falha de conexão. Tente novamente.');
      } finally {
        if (mounted.current) { setLoading(false); setRefreshing(false); }
        pending.current = null;
      }
    })();
    pending.current = request;
    return request;
  }, []);

  const updateOrder = useCallback(async (id: string, updates: AdminOrderUpdate) => {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    if (res.status === 401) { window.location.assign('/admin/login'); throw new Error('Sua sessão expirou. Entre novamente.'); }
    const result = await res.json();
    if (!res.ok || !result.success) {
      await refresh();
      throw new Error(result.message || 'Não foi possível atualizar o pedido.');
    }
    revision.current += 1;
    if (result.data) setOrders(previous => previous.map(order => order._id === id ? result.data : order));
    if (pending.current) await pending.current;
    await refresh();
  }, [refresh]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    const resume = () => { if (!document.hidden) void refresh(); };
    const stream = new EventSource(`/api/ws?clientId=admin-data-${crypto.randomUUID()}`);
    stream.onmessage = event => {
      try { const data = JSON.parse(event.data); if (data.type !== 'connected' && data.type !== 'ping') void refresh(); } catch { /* Ignore keep-alive messages. */ }
    };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => { mounted.current = false; clearInterval(timer); stream.close(); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); };
  }, [refresh]);

  return <Context.Provider value={{ orders, loading, refreshing, error, lastUpdated, refresh, updateOrder, financialPeriod, setFinancialPeriod }}>{children}</Context.Provider>;
}

export function useAdminData() {
  const data = useContext(Context);
  if (!data) throw new Error('useAdminData precisa de AdminDataProvider.');
  return data;
}
