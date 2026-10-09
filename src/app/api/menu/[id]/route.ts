import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/menuModel';
import MenuItem from '@/lib/menuModel';
import { isValidMenuItemId, sanitizeMenuItemPayload } from '@/lib/menuAvailability';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectDB();
        const item = await MenuItem.findById(id);

        if (!item) {
            return NextResponse.json(
                { success: false, error: 'Item não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: item });
    } catch (error) {
        console.error('Erro ao buscar item:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!isValidMenuItemId(id)) {
            return NextResponse.json(
                { success: false, error: 'ID do item inválido' },
                { status: 400 }
            );
        }

        await connectDB();
        const body = await request.json();
        const existing = await MenuItem.findById(id).select('isAvailable').lean();

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Item não encontrado' },
                { status: 404 }
            );
        }

        const raw = body as Record<string, unknown>;
        const hasAvailability = typeof raw.isAvailable === 'boolean';
        const updateData = sanitizeMenuItemPayload(raw, {
            includeAvailability: hasAvailability,
        });

        if (!hasAvailability && existing.isAvailable !== undefined) {
            updateData.isAvailable = existing.isAvailable;
        }

        const updatedItem = await MenuItem.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedItem) {
            return NextResponse.json(
                { success: false, error: 'Item não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: updatedItem });
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectDB();
        const deletedItem = await MenuItem.findByIdAndDelete(id);

        if (!deletedItem) {
            return NextResponse.json(
                { success: false, error: 'Item não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: 'Item excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
