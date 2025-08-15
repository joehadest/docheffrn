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

const categorySchema = new mongoose.Schema({
	value: { type: String, required: true },
	label: { type: String, required: true }
});
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export async function GET() {
	await connectDB();
	const categories = await Category.find({});
	return NextResponse.json({ success: true, data: categories });
}

export async function POST(request: Request) {
	await connectDB();
	const body = await request.json();
	if (!body.value || !body.label) {
		return NextResponse.json({ success: false, error: 'Campos obrigatórios.' }, { status: 400 });
	}
	const result = await Category.create({ value: body.value, label: body.label });
	return NextResponse.json({ success: true, data: result });
}

export async function PUT(request:Request) {
	await connectDB();
	const body = await request.json();
	if (!body._id || !body.value || !body.label) {
		return NextResponse.json({ success: false, error: 'Campos obrigatórios.' }, { status: 400 });
	}
	const result = await Category.findByIdAndUpdate(body._id, { value: body.value, label: body.label }, { new: true });
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
