import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/menuModel';
import MenuItem from '@/lib/menuModel';

export async function GET() {
    try {
        await connectDB();
        const menuItems = await MenuItem.find({});
        return NextResponse.json({ success: true, data: menuItems });
    } catch (error) {
        console.error('Erro ao buscar todos os itens do menu:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar todos os itens do menu' },
            { status: 500 }
        );
    }
}
