import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/adminSession';
import { connectToDatabase } from '@/lib/mongodb';
import { validateCourierInput, type Courier } from '@/types/delivery';

type CourierDocument = Omit<Courier, '_id'> & { _id: ObjectId };

export async function GET(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { db } = await connectToDatabase();
    const couriers = await db.collection<CourierDocument>('couriers').find({}).sort({ active: -1, name: 1 }).toArray();
    return NextResponse.json({ success: true, data: couriers }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Erro ao carregar entregadores:', error);
    return NextResponse.json({ success: false, message: 'Não foi possível carregar os entregadores.' }, { status: 500 });
  }
}

async function saveCourier(request: Request, editing: boolean) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    let input: unknown;
    try { input = await request.json(); } catch { return NextResponse.json({ success: false, message: 'Envie os dados em JSON válido.' }, { status: 400 }); }
    const result = validateCourierInput(input);
    if (result.error) return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    const id = (input as Record<string, unknown>).id;
    if (editing && (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))) return NextResponse.json({ success: false, message: 'Identificador de entregador inválido.' }, { status: 400 });
    const { db } = await connectToDatabase();
    const collection = db.collection<CourierDocument>('couriers');
    const now = new Date().toISOString();
    if (editing) {
      const courier = await collection.findOneAndUpdate({ _id: new ObjectId(id as string) }, { $set: { ...result.data, updatedAt: now } }, { returnDocument: 'after' });
      if (!courier) return NextResponse.json({ success: false, message: 'Entregador não encontrado.' }, { status: 404 });
      return NextResponse.json({ success: true, data: courier });
    }
    const courier: CourierDocument = { _id: new ObjectId(), ...result.data!, createdAt: now, updatedAt: now };
    await collection.insertOne(courier);
    return NextResponse.json({ success: true, data: courier }, { status: 201 });
  } catch (error) {
    console.error('Erro ao salvar entregador:', error);
    return NextResponse.json({ success: false, message: 'Não foi possível salvar o entregador. Tente novamente.' }, { status: 500 });
  }
}

export const POST = (request: Request) => saveCourier(request, false);
export const PATCH = (request: Request) => saveCourier(request, true);
