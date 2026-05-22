import mongoose from 'mongoose';
import MenuItem from '@/lib/menuModel';

/** Filtro para cardápio público: apenas itens explicitamente disponíveis. */
export const PUBLIC_AVAILABLE_FILTER = { isAvailable: true } as const;

const MENU_ITEM_UPDATE_KEYS = [
    'name',
    'description',
    'price',
    'category',
    'image',
    'destaque',
    'sizes',
    'ingredients',
    'borderOptions',
    'extraOptions',
    'isAvailable',
] as const;

export type MenuItemUpdateKey = (typeof MENU_ITEM_UPDATE_KEYS)[number];

/**
 * Garante que documentos antigos sem `isAvailable` passem a ter `true`,
 * para o admin e o cardápio público usarem a mesma regra.
 */
export async function normalizeMissingAvailability(): Promise<number> {
    const result = await MenuItem.updateMany(
        {
            $or: [
                { isAvailable: { $exists: false } },
                { isAvailable: null },
                { isAvailable: { $type: 'string' } },
                { isAvailable: { $nin: [true, false] } },
            ],
        },
        { $set: { isAvailable: true } }
    );
    return result.modifiedCount ?? 0;
}

export function isValidMenuItemId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id);
}

export function parseAvailabilityBody(
    value: unknown
): { ok: true; isAvailable: boolean } | { ok: false; error: string } {
    if (typeof value !== 'boolean') {
        return { ok: false, error: 'isAvailable deve ser um boolean (true ou false)' };
    }
    return { ok: true, isAvailable: value };
}

/** Extrai apenas campos permitidos para create/update, evitando sobrescrever _id indevidamente. */
export function sanitizeMenuItemPayload(
    body: Record<string, unknown>,
    options?: { includeAvailability?: boolean }
): Partial<Record<MenuItemUpdateKey, unknown>> {
    const includeAvailability = options?.includeAvailability ?? true;
    const sanitized: Partial<Record<MenuItemUpdateKey, unknown>> = {};

    for (const key of MENU_ITEM_UPDATE_KEYS) {
        if (key === 'isAvailable' && !includeAvailability) continue;
        if (body[key] !== undefined) {
            if (key === 'isAvailable' && typeof body[key] !== 'boolean') continue;
            sanitized[key] = body[key];
        }
    }

    return sanitized;
}

export const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
} as const;
