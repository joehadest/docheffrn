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
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    image: { type: String, default: '' },
    destaque: { type: Boolean, default: false },
    sizes: { type: Map, of: Number, default: {} },
    ingredients: { type: [String], default: [] },
    borderOptions: { type: Map, of: Number, default: {} },
    extraOptions: { type: Map, of: Number, default: {} }
});

const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);

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
