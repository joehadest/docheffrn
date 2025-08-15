import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { RestaurantStatus } from '@/types';

export async function GET() {
    try {
        const { db } = await connectToDatabase();
        const status = await db.collection('restaurant_status').findOne({});

        if (!status) {
            // Se não existir, cria um status padrão
            const defaultStatus: RestaurantStatus = {
                isOpen: false,
                horarioAbertura: '18:00',
                horarioFechamento: '23:00',
                diasFuncionamento: ['quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'segunda'],
                mensagemFechado: 'Estamos fechados. Volte em breve!'
            };

            await db.collection('restaurant_status').insertOne(defaultStatus);
            return NextResponse.json(defaultStatus);
        }

        return NextResponse.json(status);
    } catch (error) {
        console.error('Erro ao buscar status:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar status' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const { db } = await connectToDatabase();
        const updates = await request.json();

        const result = await db.collection('restaurant_status').updateOne(
            {},
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: 'Status não encontrado' },
                { status: 404 }
            );
        }

        // Registra diagnóstico
        await db.collection('diagnosticos').insertOne({
            tipo: 'info',
            mensagem: `Status do restaurante alterado: ${updates.isOpen ? 'Aberto' : 'Fechado'}`,
            timestamp: new Date().toISOString(),
            resolvido: false,
            detalhes: {
                statusNovo: updates.isOpen
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar status' },
            { status: 500 }
        );
    }
} 