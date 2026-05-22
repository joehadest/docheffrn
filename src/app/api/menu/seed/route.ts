/**
 * @deprecated Use Mongoose/MenuItem (coleção menuitems) via GET /api/menu ou scripts de seed.
 * Esta rota legada escrevia na coleção nativa `menu`, divergente do cardápio público.
 */
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/menuModel';
import MenuItem from '@/lib/menuModel';

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
        await connectDB();

        const count = await MenuItem.countDocuments();
        if (count > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'O cardápio já possui itens. Use o painel admin ou DELETE manual antes de re-seedar.',
                },
                { status: 409 }
            );
        }

        const itemsWithAvailability = menuItems.map((item) => ({
            ...item,
            isAvailable: true,
            destaque: item.destaque ?? false,
            sizes: item.sizes ?? {},
            borderOptions: item.borderOptions ?? {},
            extraOptions: {},
            ingredients: [],
        }));

        const inserted = await MenuItem.insertMany(itemsWithAvailability);

        return NextResponse.json({
            success: true,
            message: `${inserted.length} itens inseridos na coleção MenuItem (menuitems)`,
        });
    } catch (error) {
        console.error('Erro ao inserir itens do menu:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao inserir itens do menu' },
            { status: 500 }
        );
    }
} 