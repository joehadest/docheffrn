import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/menuModel';
import MenuItem from '@/lib/menuModel';

export async function PATCH(request: Request, context: { params: { id: string } }) {
    try {
        await connectDB();
        const { id } = context.params;
        const { isAvailable } = await request.json();

        const updated = await MenuItem.findByIdAndUpdate(
            id,
            { isAvailable },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Item não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Erro ao atualizar disponibilidade:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao atualizar disponibilidade' },
            { status: 500 }
        );
    }
}
