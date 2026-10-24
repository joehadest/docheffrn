import type { Pedido } from '@/types/cart';
import { financeDateKey } from '@/utils/financePeriod';

export const ORDER_STATUSES: Pedido['status'][] = ['pendente', 'preparando', 'pronto', 'em_entrega', 'entregue', 'cancelado'];
export const ORDER_STATUS_LABELS: Record<Pedido['status'], string> = {
  pendente: 'Novos', preparando: 'Em preparo', pronto: 'Prontos', em_entrega: 'Em entrega', entregue: 'Concluídos', cancelado: 'Cancelados',
};
export const ORDER_CHANNEL_LABELS: Record<Pedido['tipoEntrega'], string> = { entrega: 'Delivery', retirada: 'Retirada', local: 'Mesa' };

export function nextOrderStatus(order: Pick<Pedido, 'status' | 'tipoEntrega'>): Pedido['status'] | null {
  if (order.status === 'pendente') return 'preparando';
  if (order.status === 'preparando') return 'pronto';
  if (order.status === 'pronto') return order.tipoEntrega === 'entrega' ? 'em_entrega' : order.tipoEntrega === 'retirada' ? 'entregue' : null;
  if (order.status === 'em_entrega') return 'entregue';
  return null;
}

export function nextOrderAction(order: Pick<Pedido, 'status' | 'tipoEntrega'>): string {
  const status = nextOrderStatus(order);
  return status === 'preparando' ? 'Iniciar preparo' : status === 'pronto' ? 'Marcar pronto' : status === 'em_entrega' ? 'Saiu para entrega' : 'Concluir pedido';
}

export const isActiveOrder = (order: Pick<Pedido, 'status'>) => order.status !== 'entregue' && order.status !== 'cancelado';

const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
export function matchesOrderSearch(order: Pedido, search: string) {
  const query = normalized(search);
  if (!query) return true;
  const text = normalized([order._id, order.cliente?.nome, order.cliente?.telefone, order.mesa].filter(Boolean).join(' '));
  if (text.includes(query.replace(/^#/, ''))) return true;
  const digits = query.replace(/\D/g, '');
  return digits.length > 0 && /^[\d\s()+.-]+$/.test(query) && (order.cliente?.telefone || '').replace(/\D/g, '').includes(digits);
}

export function filterOperationOrders(orders: Pedido[], filters: { search: string; status: string; channel: string; period: 'active' | 'today' | 'all' }, now = new Date()) {
  const today = financeDateKey(now);
  return orders.filter(order =>
    (filters.period === 'all' || (filters.period === 'active' ? isActiveOrder(order) : financeDateKey(order.data) === today)) &&
    (!filters.status || order.status === filters.status) &&
    (!filters.channel || order.tipoEntrega === filters.channel) &&
    matchesOrderSearch(order, filters.search)
  );
}

export function orderElapsedLabel(createdAt: string, now: number): string {
  const elapsed = now - new Date(createdAt).getTime();
  if (!Number.isFinite(elapsed)) return 'Horário indisponível';
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes} min desde o pedido`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}min desde o pedido`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h desde o pedido`;
}
