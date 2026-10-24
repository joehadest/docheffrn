import type { Db } from 'mongodb';
import type { Pedido } from '@/types/cart';
import { broadcast } from '@/lib/sse';

export async function publishOrderStatus(db: Db, order: Pedido) {
  broadcast({ type: 'status-atualizado', pedidoId: String(order._id), status: order.status });
  if (!order.cliente?.telefone) return;
  const labels: Record<Pedido['status'], string> = { pendente: 'Pendente', preparando: 'Em preparo', pronto: 'Pronto', em_entrega: 'Saiu para entrega', entregue: 'Concluído', cancelado: 'Cancelado' };
  try {
    await db.collection('notifications').insertOne({
      clientId: order.cliente.telefone, orderId: String(order._id), status: order.status,
      message: `Seu pedido está: ${labels[order.status]}.`, read: false, createdAt: new Date().toISOString(),
    });
  } catch {
    console.error('Pedido atualizado, mas não foi possível registrar a notificação.');
  }
}
