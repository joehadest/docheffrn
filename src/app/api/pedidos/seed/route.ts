import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const pedidosExemplo = [
    {
        itens: [
            {
                nome: "Pizza Margherita",
                quantidade: 1,
                preco: 45.90,
                observacao: "Borda recheada de catupiry"
            },
            {
                nome: "Coca-Cola 2L",
                quantidade: 1,
                preco: 12.00
            }
        ],
        total: 57.90,
        status: "pendente",
        cliente: {
            nome: "João Silva",
            telefone: "(11) 98765-4321",
            endereco: "Rua das Flores, 123"
        },
        observacoes: "Entregar no portão azul",
        formaPagamento: "dinheiro",
        troco: 50.00
    },
    {
        itens: [
            {
                nome: "Pizza Calabresa",
                quantidade: 2,
                preco: 49.90,
                observacao: "Sem cebola"
            }
        ],
        total: 99.80,
        status: "preparando",
        cliente: {
            nome: "Maria Santos",
            telefone: "(11) 91234-5678",
            endereco: "Av. Principal, 456"
        },
        observacoes: "Tocar a campainha 3 vezes",
        formaPagamento: "cartao"
    },
    {
        itens: [
            {
                nome: "Pizza Frango com Catupiry",
                quantidade: 1,
                preco: 52.90,
                observacao: "Borda recheada de cheddar"
            },
            {
                nome: "Guaraná 2L",
                quantidade: 1,
                preco: 10.00
            }
        ],
        total: 62.90,
        status: "entregue",
        cliente: {
            nome: "Pedro Oliveira",
            telefone: "(11) 99876-5432",
            endereco: "Rua dos Pinheiros, 789"
        },
        observacoes: "Deixar com o porteiro",
        formaPagamento: "pix"
    }
];

export async function POST() {
    try {
        const { db } = await connectToDatabase();

        // Adiciona timestamps e IDs para cada pedido
        const pedidosComTimestamps = pedidosExemplo.map(pedido => ({
            ...pedido,
            _id: new ObjectId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }));

        // Insere os pedidos no banco de dados
        const result = await db.collection('pedidos').insertMany(pedidosComTimestamps);

        // Registra diagnóstico
        await db.collection('diagnosticos').insertOne({
            tipo: 'info',
            mensagem: `Pedidos de exemplo inseridos: ${result.insertedCount}`,
            timestamp: new Date().toISOString(),
            resolvido: false,
            detalhes: {
                pedidosIds: Object.values(result.insertedIds)
            }
        });

        return NextResponse.json({
            success: true,
            message: `${result.insertedCount} pedidos de exemplo inseridos com sucesso`
        });
    } catch (error) {
        console.error('Erro ao inserir pedidos de exemplo:', error);
        return NextResponse.json(
            { error: 'Erro ao inserir pedidos de exemplo' },
            { status: 500 }
        );
    }
} 