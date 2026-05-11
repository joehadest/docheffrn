import mongoose from 'mongoose';
import dns from 'dns';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');
}

if (process.env.NODE_ENV === 'development' && MONGODB_URI.startsWith('mongodb+srv://')) {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
}

declare global {
    // eslint-disable-next-line no-var
    var mongoose: { conn: typeof import('mongoose') | null; promise: Promise<typeof import('mongoose')> | null } | undefined;
}

let cached = global.mongoose ?? (global.mongoose = { conn: null, promise: null });

export async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI!, { bufferCommands: false }).then((m) => m);
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

const menuItemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        price: { type: Number, required: true, min: 0 },
        category: { type: String, required: true },
        image: { type: String, default: '' },
        destaque: { type: Boolean, default: false },
        sizes: { type: Map, of: Number, default: {} },
        ingredients: { type: [String], default: [] },
        borderOptions: { type: Map, of: Number, default: {} },
        extraOptions: { type: Map, of: Number, default: {} },
        isAvailable: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const MenuItem =
    (mongoose.models.MenuItem as mongoose.Model<mongoose.InferSchemaType<typeof menuItemSchema>>) ||
    mongoose.model('MenuItem', menuItemSchema);

export default MenuItem;
