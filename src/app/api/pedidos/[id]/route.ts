import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Pedido } from '@/types';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { db } = await connectToDatabase();
        const pedido = await db.collection('pedidos').findOne({
            _id: new ObjectId(params.id)
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

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { db } = await connectToDatabase();
        const updates = await request.json();

        // Atualiza o timestamp
        updates.updatedAt = new Date().toISOString();

        const result = await db.collection('pedidos').findOneAndUpdate(
            { _id: new ObjectId(params.id) },
            { $set: updates },
            { returnDocument: 'after' }
        );

        if (!result || result.lastErrorObject?.n === 0) {
            return NextResponse.json(
                { error: 'Pedido não encontrado' },
                { status: 404 }
            );
        }

        const statusAnterior = result.value?.status;

        // Registra diagnóstico se houver mudança de status
        if (updates.status) {
            await db.collection('diagnosticos').insertOne({
                tipo: 'info',
                mensagem: `Status do pedido ${params.id} alterado para: ${updates.status}`,
                timestamp: new Date().toISOString(),
                resolvido: false,
                detalhes: {
                    pedidoId: params.id,
                    statusAnterior: statusAnterior,
                    statusNovo: updates.status
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar pedido' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { db } = await connectToDatabase();
        const result = await db.collection('pedidos').deleteOne({
            _id: new ObjectId(params.id)
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
            mensagem: `Pedido ${params.id} removido`,
            timestamp: new Date().toISOString(),
            resolvido: false,
            detalhes: { pedidoId: params.id }
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