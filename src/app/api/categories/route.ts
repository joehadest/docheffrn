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
	icon?: string;
	order?: number;
	allowHalfAndHalf?: boolean;
}

const categorySchema = new mongoose.Schema<ICategory>({
	value: { type: String, required: true },
	label: { type: String, required: true },
	icon: { type: String, default: '' },
	order: { type: Number, default: 0 },
	allowHalfAndHalf: { type: Boolean, default: false }
});

let Category: mongoose.Model<ICategory>;
try {
	Category = mongoose.model<ICategory>('Category');
} catch {
	Category = mongoose.model<ICategory>('Category', categorySchema);
}

export async function PATCH(request: Request) {
	await connectDB();
	const body = await request.json();
	let updated = [];

	if (Array.isArray(body.categories)) {
		for (let i = 0; i < body.categories.length; i++) {
			const cat = body.categories[i];
			const result = await Category.findByIdAndUpdate(cat._id, { order: i + 1 }, { new: true });
			if (result) updated.push(result);
		}
		return NextResponse.json({ success: true, updated });
	} else {
		return NextResponse.json({ success: false, error: 'Array de categorias é obrigatório.' }, { status: 400 });
	}
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
	const newCategory = {
		value: body.value,
		label: body.label,
		icon: body.icon || '',
		order: typeof body.order === 'number' ? body.order : 0,
		allowHalfAndHalf: typeof body.allowHalfAndHalf === 'boolean' ? body.allowHalfAndHalf : false,
	};
	const result = await Category.create(newCategory);
	return NextResponse.json({ success: true, data: result });
}

export async function PUT(request: Request) {
	await connectDB();
	const body = await request.json();
	if (!body._id || !body.value || !body.label) {
		return NextResponse.json({ success: false, error: 'Campos obrigatórios.' }, { status: 400 });
	}
	const updateData: Partial<ICategory> = {
		value: body.value,
		label: body.label,
		icon: body.icon,
	};
	if (body.order !== undefined) {
		updateData.order = typeof body.order === 'number' ? body.order : parseInt(body.order) || 0;
	}
	if (body.allowHalfAndHalf !== undefined) {
		updateData.allowHalfAndHalf = typeof body.allowHalfAndHalf === 'boolean' ? body.allowHalfAndHalf : false;
	}
	const result = await Category.findByIdAndUpdate(body._id, updateData, { new: true });
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