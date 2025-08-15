import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Armazenar conexões WebSocket ativas
const clients = new Map();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
        return NextResponse.json({ error: 'Client ID é obrigatório' }, { status: 400 });
    }

    try {
        const { db } = await connectToDatabase();
        const collection = db.collection('notifications');

        // Buscar notificações não lidas para este cliente
        const notifications = await collection.find({
            clientId,
            read: false
        }).sort({ createdAt: -1 }).toArray();

        return NextResponse.json({ success: true, data: notifications });
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao buscar notificações' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { clientId, orderId, status, message } = await request.json();

        const { db } = await connectToDatabase();
        const collection = db.collection('notifications');

        const notification = {
            clientId,
            orderId,
            status,
            message,
            read: false,
            createdAt: new Date().toISOString()
        };

        await collection.insertOne(notification);

        // Notificar todos os clientes conectados
        clients.forEach((client) => {
            if (client.clientId === clientId) {
                client.send(JSON.stringify(notification));
            }
        });

        return NextResponse.json({ success: true, data: notification });
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao criar notificação' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const { notificationId } = await request.json();

        const { db } = await connectToDatabase();
        const collection = db.collection('notifications');

        await collection.updateOne(
            { _id: new ObjectId(notificationId) },
            { $set: { read: true } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao marcar notificação como lida' },
            { status: 500 }
        );
    }
} 