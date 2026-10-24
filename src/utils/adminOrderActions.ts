import type { Pedido } from '@/types/cart';

export const VALID_ORDER_STATUSES = ['pendente', 'preparando', 'pronto', 'em_entrega', 'entregue', 'cancelado'] as const;
export type AdminOrderAction = { status?: Pedido['status']; expectedStatus?: Pedido['status']; courierId?: string | null; cancelReason?: string };
export const isOrderStatus = (value: unknown): value is Pedido['status'] => typeof value === 'string' && (VALID_ORDER_STATUSES as readonly string[]).includes(value);

export function parseAdminOrderAction(body: unknown): { data: AdminOrderAction; error?: never } | { error: string; data?: never } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Envie uma atualização válida.' };
  const value = body as Record<string, unknown>;
  if (Object.keys(value).some(key => !['status', 'expectedStatus', 'courierId', 'cancelReason'].includes(key))) return { error: 'A atualização contém campos não permitidos.' };
  if (value.status === undefined && value.courierId === undefined) return { error: 'Informe uma mudança de status ou entregador.' };
  if (value.status !== undefined && !isOrderStatus(value.status)) return { error: 'Status inválido.' };
  if (value.expectedStatus !== undefined && !isOrderStatus(value.expectedStatus)) return { error: 'Status esperado inválido.' };
  if (value.courierId !== undefined && value.courierId !== null && (typeof value.courierId !== 'string' || !/^[a-f\d]{24}$/i.test(value.courierId))) return { error: 'Entregador inválido.' };
  if (value.cancelReason !== undefined && (typeof value.cancelReason !== 'string' || value.cancelReason.length > 500 || value.status !== 'cancelado')) return { error: 'Informe um motivo de cancelamento de até 500 caracteres.' };
  return { data: { ...value, ...(typeof value.cancelReason === 'string' ? { cancelReason: value.cancelReason.trim() } : {}) } as AdminOrderAction };
}

export function validateAdminOrderTransition(order: Pick<Pedido, 'status' | 'tipoEntrega'>, action: AdminOrderAction) {
  if (action.expectedStatus !== undefined && action.expectedStatus !== order.status) return 'O pedido foi atualizado em outra tela. Atualize os dados e tente novamente.';
  if (['entregue', 'cancelado'].includes(order.status)) return 'Pedidos finalizados não podem ser alterados na operação.';
  if (action.courierId !== undefined && (order.tipoEntrega !== 'entrega' || !['pronto', 'em_entrega'].includes(order.status))) return 'Atribua entregadores apenas a entregas prontas ou em rota.';
  if (action.status === 'entregue' && order.tipoEntrega === 'local') return 'Feche a conta deste pedido pela aba Mesas.';
  if (action.status === 'em_entrega' && order.tipoEntrega !== 'entrega') return 'Apenas pedidos para entrega podem sair em rota.';
  if (action.status && action.status !== order.status) {
    const next: Record<Pedido['status'], Pedido['status'][]> = {
      pendente: ['preparando', 'cancelado'], preparando: ['pronto', 'cancelado'],
      pronto: order.tipoEntrega === 'entrega' ? ['em_entrega', 'cancelado'] : ['entregue', 'cancelado'],
      em_entrega: ['entregue', 'cancelado'], entregue: [], cancelado: [],
    };
    if (!next[order.status]?.includes(action.status)) return 'Essa mudança de status não é permitida. Atualize o pedido e siga a próxima etapa.';
  }
  return null;
}

export function validOrderItems(items: unknown): items is Pedido['itens'] {
  return Array.isArray(items) && items.length <= 300 && items.every(item => item && typeof item === 'object'
    && typeof item.nome === 'string' && item.nome.trim().length > 0 && item.nome.length <= 200
    && Number.isInteger(item.quantidade) && item.quantidade > 0 && item.quantidade <= 999
    && typeof item.preco === 'number' && Number.isFinite(item.preco) && item.preco >= 0 && item.preco <= 100000);
}
