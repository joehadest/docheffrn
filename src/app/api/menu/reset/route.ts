import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/menuModel';
import MenuItem from '@/lib/menuModel';

export async function POST() {
    try {
        console.log('Reset do banco - Conectando...');
        await connectDB();

        console.log('Reset do banco - Limpando dados existentes...');
        await MenuItem.deleteMany({});

        console.log('Reset do banco - Dados limpos com sucesso!');

        return NextResponse.json({
            success: true,
            message: 'Banco de dados resetado com sucesso! Acesse /api/menu para carregar os novos dados.'
        });
    } catch (error) {
        console.error('Reset do banco - Erro:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao resetar banco de dados' },
            { status: 500 }
        );
    }
}
