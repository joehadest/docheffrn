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

const defaultCategories = [
	{ value: 'pizzas', label: 'Pizzas' },
	{ value: 'esfirras', label: 'Esfirras' },
	{ value: 'massas', label: 'Massas' },
	{ value: 'panquecas', label: 'Panquecas' },
	{ value: 'tapiocas', label: 'Tapiocas' },
	{ value: 'hamburgueres', label: 'Hambúrgueres' },
	{ value: 'petiscos', label: 'Petiscos' },
	{ value: 'bebidas', label: 'Bebidas' }
];

export async function POST() {
	await connectDB();
	await Category.deleteMany({});
	const result = await Category.insertMany(defaultCategories);
	return NextResponse.json({ success: true, data: result });
}
