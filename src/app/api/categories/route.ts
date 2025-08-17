// Endpoint para sincronizar a ordem das categorias conforme a ordem atual do painel admin ou ordem visual desejada
export async function PATCH(request: Request) {
	await connectDB();
	const body = await request.json();
	let updated = [];
	if (Array.isArray(body.categories)) {
		// Sincroniza conforme o array recebido do painel admin
		for (let i = 0; i < body.categories.length; i++) {
			const cat = body.categories[i];
			const result = await Category.findByIdAndUpdate(cat._id, { order: i + 1 }, { new: true });
			if (result) updated.push(result);
		}
		return NextResponse.json({ success: true, updated });
	} else {
		// Se não receber array, mantém a ordem visual fixa
		const visualOrder = [
			{ value: 'pizzas', order: 1 },
			{ value: 'esfirras', order: 2 },
			{ value: 'massas', order: 3 },
			{ value: 'panquecas', order: 4 },
			{ value: 'tapiocas', order: 5 },
			{ value: 'hamburgueres', order: 6 },
			{ value: 'petiscos', order: 7 },
			{ value: 'bebidas', order: 8 },
			{ value: 'Refrigerantes', order: 9 }
		];
		for (const item of visualOrder) {
			const result = await Category.findOneAndUpdate(
				{ value: item.value },
				{ order: item.order },
				{ new: true }
			);
			if (result) updated.push(result);
		}
		return NextResponse.json({ success: true, updated });
	}
}
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
}

const categorySchema = new mongoose.Schema<ICategory>({
	value: { type: String, required: true },
	label: { type: String, required: true },
	order: { type: Number, default: 0 }
});

let Category: mongoose.Model<ICategory>;
try {
	Category = mongoose.model<ICategory>('Category');
} catch {
	Category = mongoose.model<ICategory>('Category', categorySchema);
}

export async function GET() {
	await connectDB();
	const categories = await Category.find({}).sort({ order: 1, label: 1 });
	return NextResponse.json({ success: true, data: categories });
}

export async function POST(request: Request) {
	await connectDB();
	const body = await request.json();
	if (!body.value || !body.label) {
		return NextResponse.json({ success: false, error: 'Campos obrigatórios.' }, { status: 400 });
	}
	const order = typeof body.order === 'number' ? body.order : 0;
	const result = await Category.create({ value: body.value, label: body.label, order });
	return NextResponse.json({ success: true, data: result });
}

export async function PUT(request:Request) {
	await connectDB();
	const body = await request.json();
	if (!body._id || !body.value || !body.label) {
		return NextResponse.json({ success: false, error: 'Campos obrigatórios.' }, { status: 400 });
	}
	const update: { value: any; label: any; order?: number } = { value: body.value, label: body.label };
	if (body.order !== undefined) {
		update.order = typeof body.order === 'number' ? body.order : parseInt(body.order) || 0;
	}
	const result = await Category.findByIdAndUpdate(body._id, update, { new: true });
	return NextResponse.json({ success: true, data: result });
}

export async function DELETE(request: Request) {
	await connectDB();
	const body = await request.json();
	if (!body._id) {
		return NextResponse.json({ success: false, error: 'ID obrigatório.' }, { status: 400 });
	}
	await Category.findByIdAndDelete(body._id);
	return NextResponse.json({ success: true });
}
