import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/menuModel';
import MenuItem from '@/lib/menuModel';
import {
    isValidMenuItemId,
    parseAvailabilityBody,
    noStoreHeaders,
} from '@/lib/menuAvailability';

export const dynamic = 'force-dynamic';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        if (!isValidMenuItemId(id)) {
            return NextResponse.json(
                { success: false, error: 'ID do item inválido' },
                { status: 400 }
            );
        }

        await connectDB();
        const body = await request.json();
        const parsed = parseAvailabilityBody(body?.isAvailable);

        if (!parsed.ok) {
            return NextResponse.json(
                { success: false, error: parsed.error },
                { status: 400 }
            );
        }

        const updated = await MenuItem.findByIdAndUpdate(
            id,
            { isAvailable: parsed.isAvailable },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Item não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: updated },
            { headers: noStoreHeaders }
        );
    } catch (error) {
        console.error('Erro ao atualizar disponibilidade:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao atualizar disponibilidade' },
            { status: 500 }
        );
    }
}
