import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');
}

let cached = global.mongoose ?? (global.mongoose = { conn: null, promise: null });
async function connectDB() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI!, { bufferCommands: false }).then((mongoose) => mongoose);
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}

const menuItemSchema = new mongoose.Schema({ isAvailable: Boolean }, { strict: false });
const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);

export async function PATCH(request: Request, context: { params: { id: string } }) {
    try {
        await connectDB();
        const { id } = context.params;
        const { isAvailable } = await request.json();
        const updated = await MenuItem.findByIdAndUpdate(id, { isAvailable }, { new: true });
        if (!updated) {
            return NextResponse.json({ success: false, error: 'Item não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erro ao atualizar disponibilidade' }, { status: 500 });
    }
}
