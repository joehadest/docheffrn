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
        const opts = { bufferCommands: false };
        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => mongoose);
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}

interface ICategory {
    value: string;
    label: string;
    order?: number;
    allowHalfAndHalf?: boolean;
}

const categorySchema = new mongoose.Schema<ICategory>({
    value: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, default: 0 },
    allowHalfAndHalf: { type: Boolean, default: false }
});

let Category: mongoose.Model<ICategory>;
try {
    Category = mongoose.model<ICategory>('Category');
} catch {
    Category = mongoose.model<ICategory>('Category', categorySchema);
}
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    const { allowHalfAndHalf } = await request.json();

    if (typeof allowHalfAndHalf !== 'boolean') {
        return NextResponse.json({ success: false, message: 'Valor inválido para allowHalfAndHalf' }, { status: 400 });
    }

    try {
        await connectDB();

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { allowHalfAndHalf },
            { new: true }
        );

        if (!updatedCategory) {
            return NextResponse.json({ success: false, message: 'Categoria não encontrada' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedCategory });
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ success: false, message: `Erro no servidor: ${errorMessage}` }, { status: 500 });
    }
}
