import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const menuItems = [
    {
        name: "Hambúrguer Naldinho",
        description: "Hambúrguer artesanal com queijo, alface, tomate e molho especial",
        price: 32.90,
        category: "hamburguers",
        image: "/hamburguers/naldinho.jpg",
        destaque: true
    },
    {
        name: "Pizza de Calabresa",
        description: "Pizza tradicional com calabresa, cebola e azeitonas",
        price: 49.90,
        category: "pizzas",
        image: "/pizzas/pizzadecalabresa.jpg",
        sizes: {
            P: 39.90,
            G: 49.90
        },
        borderOptions: {
            "catupiry": 4.00,
            "cheddar": 4.00,
            "chocolate": 6.00
        }
    }
];

export async function POST() {
    try {
        const { db } = await connectToDatabase();

        // Limpa a coleção existente
        await db.collection('menu').deleteMany({});

        // Adiciona IDs para cada item
        const itemsComIds = menuItems.map(item => ({
            ...item,
            _id: new ObjectId()
        }));

        // Insere os itens no banco de dados
        const result = await db.collection('menu').insertMany(itemsComIds);

        // Registra diagnóstico
        await db.collection('diagnosticos').insertOne({
            tipo: 'info',
            mensagem: `Itens do menu inseridos: ${result.insertedCount}`,
            timestamp: new Date().toISOString(),
            resolvido: false,
            detalhes: {
                itemIds: Object.values(result.insertedIds)
            }
        });

        return NextResponse.json({
            success: true,
            message: `${result.insertedCount} itens do menu inseridos com sucesso`
        });
    } catch (error) {
        console.error('Erro ao inserir itens do menu:', error);
        return NextResponse.json(
            { error: 'Erro ao inserir itens do menu' },
            { status: 500 }
        );
    }
} 