import type { Pedido } from '@/types/cart';

export const FINANCE_TIME_ZONE = 'America/Sao_Paulo';
export type FinancePreset = 'today' | 'week' | 'month' | 'last30' | 'year';
export type FinancePeriod =
  | { type: 'all' }
  | { type: 'preset'; preset: FinancePreset }
  | { type: 'day'; day: string }
  | { type: 'range'; start: string; end: string }
  | { type: 'months'; months: string[] };

const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: FINANCE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
export function financeDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = dateFormatter.formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function validDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

export function validateFinancePeriod(period: FinancePeriod): string | null {
  if (period.type === 'day' && !validDay(period.day)) return 'Selecione um dia válido.';
  if (period.type === 'range') {
    if (!validDay(period.start) || !validDay(period.end)) return 'Preencha a data inicial e a data final.';
    if (period.start > period.end) return 'A data final deve ser igual ou posterior à data inicial.';
  }
  if (period.type === 'months' && (!period.months.length || period.months.some(month => !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)))) return 'Adicione pelo menos um mês válido.';
  return null;
}

function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function financeBounds(preset: FinancePreset, now = new Date()) {
  const end = financeDateKey(now);
  if (preset === 'today') return { start: end, end };
  if (preset === 'month') return { start: `${end.slice(0, 7)}-01`, end };
  if (preset === 'year') return { start: `${end.slice(0, 4)}-01-01`, end };
  if (preset === 'week') return { start: shiftDay(end, -new Date(`${end}T12:00:00Z`).getUTCDay()), end };
  return { start: shiftDay(end, -29), end };
}

/** Compare calendar days in the restaurant timezone, including both endpoints. */
export function matchesFinancePeriod(value: string, period: FinancePeriod, now = new Date()) {
  const day = financeDateKey(value);
  if (!day || validateFinancePeriod(period)) return false;
  if (period.type === 'all') return true;
  if (period.type === 'day') return day === period.day;
  if (period.type === 'months') return period.months.includes(day.slice(0, 7));
  const bounds = period.type === 'range' ? period : financeBounds(period.preset, now);
  return day >= bounds.start && day <= bounds.end;
}

const displayDay = (day: string) => day.split('-').reverse().join('/');
export const displayFinanceMonth = (month: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
export function financePeriodLabel(period: FinancePeriod, now = new Date()): string {
  if (period.type === 'all') return 'Todo o período · sem filtros';
  if (period.type === 'day') return displayDay(period.day);
  if (period.type === 'months') return [...new Set(period.months)].sort().map(displayFinanceMonth).join(' · ');
  const { start, end } = period.type === 'range' ? period : financeBounds(period.preset, now);
  const range = start === end ? displayDay(start) : `${displayDay(start)} a ${displayDay(end)}`;
  return period.type === 'preset' ? `${{ today: 'Hoje', week: 'Esta semana', month: 'Este mês', last30: 'Últimos 30 dias', year: 'Este ano' }[period.preset]} · ${range}` : range;
}

export function financialOrderTotal(order: Pedido): number {
  if (order.total != null && Number.isFinite(order.total) && order.total > 0) return order.total;
  const subtotal = order.itens.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  return subtotal + (order.tipoEntrega === 'entrega' ? (order.endereco?.deliveryFee ?? 0) : 0);
}

/** Every report view and action receives the same filtered orders. Sum money in cents. */
export function buildFinanceReport(orders: Pedido[], period: FinancePeriod, now = new Date()) {
  const filtered = orders.filter(order => matchesFinancePeriod(order.data, period, now))
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  const completed = filtered.filter(order => order.status === 'entregue');
  return {
    orders: filtered,
    completed: completed.length,
    revenue: completed.reduce((sum, order) => sum + Math.round(financialOrderTotal(order) * 100), 0) / 100,
    pendingOrders: filtered.filter(order => order.status !== 'entregue' && order.status !== 'cancelado'),
  };
}
