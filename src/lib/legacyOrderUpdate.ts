import { NextResponse } from 'next/server';
import { ObjectId, type Document } from 'mongodb';
import { requireAdmin } from '@/lib/adminSession';
import { connectToDatabase } from '@/lib/mongodb';
import { publishOrderStatus } from '@/lib/adminOrderEvents';
import { isOrderStatus, validOrderItems } from '@/utils/adminOrderActions';
import type { Pedido } from '@/types/cart';

/** Compatibility for the existing finance finalization and table checkout flows. */
export async function handleLegacyOrderUpdate(request: Request, id: string | null) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!id || !/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ success: false, message: 'ID do pedido inválido.' }, { status: 400 });
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !['status', 'itens', 'total', 'formaPagamento'].includes(key))) return NextResponse.json({ success: false, message: 'Campos de atualização inválidos.' }, { status: 400 });
    if (body.status !== undefined && !isOrderStatus(body.status)) return NextResponse.json({ success: false, message: 'Status inválido.' }, { status: 400 });
    if (body.itens !== undefined && !validOrderItems(body.itens)) return NextResponse.json({ success: false, message: 'Itens inválidos.' }, { status: 400 });
    if (body.total !== undefined && (typeof body.total !== 'number' || !Number.isFinite(body.total) || body.total < 0 || body.itens === undefined)) return NextResponse.json({ success: false, message: 'Envie os itens para recalcular o total.' }, { status: 400 });
    if (body.formaPagamento !== undefined && (typeof body.formaPagamento !== 'string' || body.formaPagamento.length > 80)) return NextResponse.json({ success: false, message: 'Pagamento inválido.' }, { status: 400 });
    const { db } = await connectToDatabase();
    const collection = db.collection('pedidos');
    const current = await collection.findOne({ _id: new ObjectId(id) });
    if (!current) return NextResponse.json({ success: false, message: 'Pedido não encontrado.' }, { status: 404 });
    if (body.status === 'em_entrega' && current.tipoEntrega !== 'entrega') return NextResponse.json({ success: false, message: 'Apenas pedidos de entrega podem sair em rota.' }, { status: 400 });
    if (['entregue', 'cancelado'].includes(current.status) && (body.status !== current.status || body.itens !== undefined)) return NextResponse.json({ success: false, message: 'O pedido já está finalizado. Atualize a tela.' }, { status: 409 });
    if (body.itens !== undefined && current.tipoEntrega !== 'local') return NextResponse.json({ success: false, message: 'A edição de itens está disponível para contas de mesas.' }, { status: 400 });
    const now = new Date().toISOString();
    const changes: Record<string, unknown> = { ...body, updatedAt: now };
    if (body.itens !== undefined) changes.total = body.itens.reduce((sum: number, item: Pedido['itens'][number]) => sum + Math.round(item.preco * 100) * item.quantidade, 0) / 100;
    const update: Document = { $set: changes };
    const changed = body.status && body.status !== current.status;
    if (changed) update.$push = { statusHistory: { status: body.status, at: now } };
    const result = await collection.findOneAndUpdate({ _id: current._id, status: current.status }, update, { returnDocument: 'after' });
    if (!result) return NextResponse.json({ success: false, message: 'O pedido foi alterado em outra tela. Atualize e tente novamente.' }, { status: 409 });
    if (changed) await publishOrderStatus(db, { ...result, _id: String(result._id) } as Pedido);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Não foi possível atualizar o pedido.' }, { status: error instanceof SyntaxError ? 400 : 500 });
  }
}
