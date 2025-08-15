import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Conexão com MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');
}

let cached = global.mongoose ?? (global.mongoose = { conn: null, promise: null });

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

// Schema do Menu
const menuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: ''
    },
    destaque: {
        type: Boolean,
        default: false
    },
    sizes: {
        type: Map,
        of: Number,
        default: new Map()
    },
    ingredients: {
        type: [String],
        default: []
    },
    borderOptions: {
        type: Map,
        of: Number,
        default: new Map()
    },
    extraOptions: {
        type: Map,
        of: Number,
        default: new Map()
    }
}, {
    timestamps: true
});

const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);

// GET - Buscar item específico por ID
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const item = await MenuItem.findById(params.id);

        if (!item) {
            return NextResponse.json(
                { success: false, error: 'Item não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: item
        });

    } catch (error) {
        console.error('Erro ao buscar item:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// PUT - Atualizar item específico
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const body = await request.json();

        const updatedItem = await MenuItem.findByIdAndUpdate(
            params.id,
            body,
            { new: true, runValidators: true }
        );

        if (!updatedItem) {
            return NextResponse.json(
                { success: false, error: 'Item não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: updatedItem
        });

    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// DELETE - Excluir item específico
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const deletedItem = await MenuItem.findByIdAndDelete(params.id);

        if (!deletedItem) {
            return NextResponse.json(
                { success: false, error: 'Item não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Item excluído com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir item:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
