import { handleLegacyOrderUpdate } from '@/lib/legacyOrderUpdate';
import { requireAdmin } from '@/lib/adminSession';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Pedido } from '@/types';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { db } = await connectToDatabase();
        const pedido = await db.collection('pedidos').findOne({
            _id: new ObjectId(id)
        });

        if (!pedido) {
            return NextResponse.json(
                { error: 'Pedido não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json(pedido);
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar pedido' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return handleLegacyOrderUpdate(request, id);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    try {
        const { id } = await params;
        const { db } = await connectToDatabase();
        const result = await db.collection('pedidos').deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: 'Pedido não encontrado' },
                { status: 404 }
            );
        }

        // Registra diagnóstico
        await db.collection('diagnosticos').insertOne({
            tipo: 'info',
            mensagem: `Pedido ${id} removido`,
            timestamp: new Date().toISOString(),
            resolvido: false,
            detalhes: { pedidoId: id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao remover pedido:', error);
        return NextResponse.json(
            { error: 'Erro ao remover pedido' },
            { status: 500 }
        );
    }
}