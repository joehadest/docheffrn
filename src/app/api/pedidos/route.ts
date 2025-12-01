import { NextResponse } from 'next/server';
import { broadcast } from '@/lib/sse';
import { connectToDatabase } from '@/lib/mongodb';
import { Pedido } from '@/types';
import { ObjectId } from 'mongodb';
import webpush from 'web-push';
import mongoose from 'mongoose';
import { isRestaurantOpen, getRestaurantStatus } from '../../../utils/timeUtils';
import type { BusinessHoursConfig } from '../../../utils/timeUtils';

interface PedidoDocument extends Omit<Pedido, '_id'> {
    _id: ObjectId;
}

// Schema do Settings (copiado da API de settings)
const settingsSchema = new mongoose.Schema({
    isOpen: {
        type: Boolean,
        default: false
    },
    businessHours: {
        monday: { open: { type: Boolean, default: false }, start: String, end: String },
        tuesday: { open: { type: Boolean, default: false }, start: String, end: String },
        wednesday: { open: { type: Boolean, default: false }, start: String, end: String },
        thursday: { open: { type: Boolean, default: false }, start: String, end: String },
        friday: { open: { type: Boolean, default: false }, start: String, end: String },
        saturday: { open: { type: Boolean, default: false }, start: String, end: String },
        sunday: { open: { type: Boolean, default: false }, start: String, end: String }
    },
    deliveryFees: [{
        neighborhood: {
            type: String,
            required: true
        },
        fee: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    adminPassword: {
        type: String,
        default: 'admin123'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

// Função para verificar se o estabelecimento está aberto
async function checkRestaurantStatus(): Promise<boolean> {
    try {
        // Conectar ao MongoDB usando Mongoose
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) {
            throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');
        }

        // Verificar se já está conectado
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGODB_URI);
        }

        const settings = await Settings.findOne() || await Settings.create({});
        if (!settings) {
            console.log('Nenhuma configuração encontrada no banco');
            return false;
        }

        // Usar a função utilitária para verificar o status
        const status = getRestaurantStatus(settings.businessHours as BusinessHoursConfig);
        
        console.log('=== Verificação de Status na API de Pedidos ===');
        console.log('Status detalhado:', status);
        console.log('==============================================');

        return status.isOpen;
    } catch (error) {
        console.error('Erro ao verificar status do estabelecimento:', error);
        return false;
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const telefone = searchParams.get('telefone');

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

        const { db } = await connectToDatabase();
        
        // Verificar se o estabelecimento está aberto
        const isOpen = await checkRestaurantStatus();
        if (!isOpen) {
            return NextResponse.json(
                { success: false, message: 'Estabelecimento fechado. Pedidos não são aceitos no momento.' },
                { status: 403 }
            );
        }

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
        return NextResponse.json({ success: true, pedidoId: result.insertedId });
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao criar pedido' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const updates = await request.json();

        if (!id) {
            return NextResponse.json(
                { success: false, message: 'ID do pedido não fornecido' },
                { status: 400 }
            );
        }

        const { db } = await connectToDatabase();
        const collection = db.collection('pedidos');

        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, message: 'Pedido não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao atualizar pedido' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
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