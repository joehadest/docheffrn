import { NextResponse } from 'next/server';
import { ObjectId, type Document } from 'mongodb';
import { requireAdmin } from '@/lib/adminSession';
import { connectToDatabase } from '@/lib/mongodb';
import { publishOrderStatus } from '@/lib/adminOrderEvents';
import { parseAdminOrderAction, validateAdminOrderTransition } from '@/utils/adminOrderActions';
import type { Pedido } from '@/types/cart';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ success: false, message: 'Pedido inválido.' }, { status: 400 });
    const parsed = parseAdminOrderAction(await request.json());
    if (parsed.error) return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
    const action = parsed.data!;
    const { db } = await connectToDatabase();
    const collection = db.collection('pedidos');
    const current = await collection.findOne({ _id: new ObjectId(id) });
    if (!current) return NextResponse.json({ success: false, message: 'Pedido não encontrado.' }, { status: 404 });
    const order = { ...current, _id: String(current._id) } as Pedido;
    const invalid = validateAdminOrderTransition(order, action);
    if (invalid) return NextResponse.json({ success: false, message: invalid }, { status: action.expectedStatus && action.expectedStatus !== order.status ? 409 : 400 });

    const now = new Date().toISOString();
    const changes: Record<string, unknown> = { updatedAt: now };
    const update: Document = { $set: changes };
    let assignment = order.deliveryAssignment;
    let assignmentNote: string | undefined;
    if (action.courierId !== undefined) {
      if (action.courierId === null) {
        assignment = undefined;
        update.$unset = { deliveryAssignment: '' };
        assignmentNote = 'Entregador removido.';
      } else {
        const courier = await db.collection('couriers').findOne({ _id: new ObjectId(action.courierId), active: true });
        if (!courier) return NextResponse.json({ success: false, message: 'Selecione um entregador ativo.' }, { status: 400 });
        assignment = { courierId: String(courier._id), name: String(courier.name), phone: String(courier.phone), assignedAt: now };
        changes.deliveryAssignment = assignment;
        assignmentNote = `Entregador atribuído: ${assignment.name}.`;
      }
    }
    if (action.status === 'em_entrega' && action.status !== order.status) {
      if (!assignment) return NextResponse.json({ success: false, message: 'Atribua um entregador antes de iniciar a entrega.' }, { status: 400 });
      const active = await db.collection('couriers').findOne({ _id: new ObjectId(assignment.courierId), active: true }, { projection: { _id: 1 } });
      if (!active) return NextResponse.json({ success: false, message: 'O entregador atribuído está inativo. Selecione outro entregador.' }, { status: 400 });
    }
    if (action.status) changes.status = action.status;
    if (action.status === 'cancelado' && action.cancelReason) changes.cancelReason = action.cancelReason;
    const changedStatus = Boolean(action.status && action.status !== order.status);
    if (changedStatus || assignmentNote) {
      update.$push = { statusHistory: { status: action.status ?? order.status, at: now,
        ...(action.cancelReason || assignmentNote ? { note: [action.cancelReason, assignmentNote].filter(Boolean).join(' ') } : {}) } };
    }
    // Compare the state read above atomically, even when old clients omit expectedStatus.
    const updated = await collection.findOneAndUpdate({ _id: current._id, status: action.expectedStatus ?? order.status }, update, { returnDocument: 'after' });
    if (!updated) return NextResponse.json({ success: false, message: 'O pedido foi atualizado em outra tela. Atualize os dados e tente novamente.' }, { status: 409 });
    const result = { ...updated, _id: String(updated._id) } as Pedido;
    if (changedStatus) await publishOrderStatus(db, result);
    return NextResponse.json({ success: true, data: result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof SyntaxError ? 'Dados inválidos.' : 'Não foi possível atualizar o pedido.' }, { status: error instanceof SyntaxError ? 400 : 500 });
  }
}
