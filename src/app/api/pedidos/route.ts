import { requireAdmin } from '@/lib/adminSession';
import { NextResponse } from 'next/server';
import { broadcast } from '@/lib/sse';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { handleLegacyOrderUpdate } from '@/lib/legacyOrderUpdate';
import { validOrderItems } from '@/utils/adminOrderActions';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const telefone = searchParams.get('telefone');

        if (!id && !telefone?.trim()) {
            const denied = await requireAdmin(request);
            if (denied) return denied;
        }
        if (id && !/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ success: false, message: 'ID inválido.' }, { status: 400 });

        const { db } = await connectToDatabase();
        const collection = db.collection('pedidos');

        if (id) {
            const pedido = await collection.findOne({ _id: new ObjectId(id) });
            if (!pedido) {
                return NextResponse.json({ success: false, message: 'Pedido não encontrado' }, { status: 404 });
            }
            return NextResponse.json({ success: true, data: pedido });
        }

        // Se telefone foi fornecido, buscar apenas pedidos desse cliente
        // Se não foi fornecido, retornar TODOS os pedidos (para o painel admin)
        let query: any = {};
        
        if (telefone && telefone.trim()) {
            // Normalizar telefone removendo caracteres especiais para busca mais flexível
            const telefoneNormalizado = telefone.replace(/\D/g, ''); // Remove tudo que não é dígito
            
            // Se o telefone normalizado tiver menos de 8 dígitos, usar apenas busca exata
            if (telefoneNormalizado.length >= 8) {
                // Buscar por correspondência exata ou que contenha os dígitos normalizados
                query = {
                    $or: [
                        { 'cliente.telefone': telefone },
                        { 'cliente.telefone': { $regex: telefoneNormalizado, $options: 'i' } }
                    ]
                };
            } else {
                // Se telefone muito curto, usar apenas busca exata
                query = { 'cliente.telefone': telefone };
            }
        }
        // Se não há telefone, query fica vazio {} e retorna todos os pedidos (para admin)

        const pedidos = await collection.find(query).sort({ data: -1 }).toArray();
        return NextResponse.json({ success: true, data: pedidos });
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao buscar pedidos' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const pedido = await request.json();

        if (!pedido || typeof pedido !== 'object' || Array.isArray(pedido) || !['entrega', 'retirada', 'local'].includes(pedido.tipoEntrega) || !validOrderItems(pedido.itens)) {
            return NextResponse.json({ success: false, message: 'Dados do pedido inválidos.' }, { status: 400 });
        }
        if (pedido.tipoEntrega === 'local') {
            const denied = await requireAdmin(request);
            if (denied) return denied;
        } else if (!pedido.itens.length || typeof pedido.cliente?.nome !== 'string' || !pedido.cliente.nome.trim() || typeof pedido.cliente?.telefone !== 'string' || !pedido.cliente.telefone.trim()) {
            return NextResponse.json({ success: false, message: 'Informe os itens e os dados do cliente.' }, { status: 400 });
        }
        const fee = pedido.tipoEntrega === 'entrega' ? (pedido.endereco?.deliveryFee ?? 0) : 0;
        if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) return NextResponse.json({ success: false, message: 'Taxa de entrega inválida.' }, { status: 400 });
        // Internal fields are always generated on the server, including public checkout.
        delete pedido._id; delete pedido.deliveryAssignment; delete pedido.cancelReason;
        pedido.total = (pedido.itens.reduce((sum: number, item: { preco: number; quantidade: number }) => sum + Math.round(item.preco * 100) * item.quantidade, 0) + Math.round(fee * 100)) / 100;
        pedido.data = new Date().toISOString();
        pedido.updatedAt = pedido.data;
        pedido.status = 'pendente';
        pedido.statusHistory = [{ status: 'pendente', at: pedido.data }];

        const { db } = await connectToDatabase();

        // Horário de funcionamento é só indicativo no cardápio; não bloquear POST aqui
        // (evita 403 quando Mongo/settings e o horário do servidor divergem do que o cliente vê).

        const collection = db.collection('pedidos');

        // Calcular o total se não for fornecido
        if (!pedido.total && pedido.itens) {
            pedido.total = pedido.itens.reduce((acc: number, item: any) => {
                return acc + (item.preco * item.quantidade);
            }, 0);
        }

        // Adicionar data se não fornecida
        if (!pedido.data) {
            pedido.data = new Date().toISOString();
        }

        // Garantir que o status seja válido
        if (!pedido.status) {
            pedido.status = 'pendente';
        }

        const result = await collection.insertOne(pedido);
        // Broadcast evento de novo pedido
        try {
            broadcast({ type: 'novo-pedido', pedidoId: String(result.insertedId) });
        } catch (e) {
            console.error('Falha broadcast novo pedido', e);
        }
        return NextResponse.json({ success: true, pedidoId: String(result.insertedId) });
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao criar pedido' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    return handleLegacyOrderUpdate(request, new URL(request.url).searchParams.get('id'));
}

export async function DELETE(request: Request) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, message: 'ID do pedido não fornecido' },
                { status: 400 }
            );
        }

        const { db } = await connectToDatabase();
        const collection = db.collection('pedidos');

        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { success: false, message: 'Pedido não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao excluir pedido' },
            { status: 500 }
        );
    }
}
