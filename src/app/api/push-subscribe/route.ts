import { NextResponse } from 'next/server';
import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
    const { subscription, pedidoId } = await request.json();
    const { db } = await connectToDatabase();

    console.log('Recebendo subscription:', subscription, 'para pedido:', pedidoId);

    try {
        const result = await db.collection('pedidos').updateOne(
            { _id: new ObjectId(pedidoId) },
            { $set: { pushSubscription: subscription } }
        );

        if (result.matchedCount === 0) {
            console.error('Pedido não encontrado para salvar pushSubscription:', pedidoId);
            return NextResponse.json({ success: false, message: 'Pedido não encontrado' }, { status: 404 });
        }

        console.log('pushSubscription salva com sucesso para o pedido:', pedidoId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar pushSubscription:', error);
        return NextResponse.json({ success: false, message: 'Erro ao salvar pushSubscription' }, { status: 500 });
    }
} 