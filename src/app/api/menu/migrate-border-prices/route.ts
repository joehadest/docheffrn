import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/menuModel';
import MenuItem from '@/lib/menuModel';

/**
 * Migração one-off: converte borderOptions do formato antigo (preço único por
 * borda) para o novo formato (preço por borda e por tamanho), assumindo G = 2x P
 * — mesma proporção que já era cobrada de fato no carrinho antes desta mudança.
 * Rodar uma vez manualmente após o deploy; itens já migrados são ignorados.
 */
export async function POST() {
    try {
        await connectDB();

        const items = await MenuItem.find({});
        let migratedCount = 0;

        for (const doc of items) {
            const raw = doc.toObject().borderOptions as Record<string, unknown> | undefined;
            if (!raw || Object.keys(raw).length === 0) continue;

            let needsMigration = false;
            const migrated: Record<string, { P: number; G: number }> = {};

            for (const [name, value] of Object.entries(raw)) {
                if (typeof value === 'number') {
                    needsMigration = true;
                    migrated[name] = { P: value, G: value * 2 };
                } else {
                    migrated[name] = value as { P: number; G: number };
                }
            }

            if (needsMigration) {
                doc.set('borderOptions', migrated);
                await doc.save();
                migratedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Migração concluída. ${migratedCount} item(ns) atualizado(s).`,
        });
    } catch (error) {
        console.error('Migração de preços de borda - Erro:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao migrar preços de borda' },
            { status: 500 }
        );
    }
}
