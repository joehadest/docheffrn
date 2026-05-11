import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dns from 'dns';
import { isRestaurantOpen } from '../../../utils/timeUtils';
import type { BusinessHoursConfig } from '../../../utils/timeUtils';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');

if (process.env.NODE_ENV === 'development' && MONGODB_URI.startsWith('mongodb+srv://')) {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
}

declare global {
    // eslint-disable-next-line no-var
    var mongoose: { conn: typeof import('mongoose') | null; promise: Promise<typeof import('mongoose')> | null } | undefined;
}

let cached = global.mongoose ?? (global.mongoose = { conn: null, promise: null });

async function connectDB() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI!, { bufferCommands: false }).then(m => m);
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}

const settingsSchema = new mongoose.Schema({
    allowHalfAndHalf: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: false },
    businessHours: {
        monday: { open: { type: Boolean, default: false }, start: String, end: String },
        tuesday: { open: { type: Boolean, default: false }, start: String, end: String },
        wednesday: { open: { type: Boolean, default: false }, start: String, end: String },
        thursday: { open: { type: Boolean, default: false }, start: String, end: String },
        friday: { open: { type: Boolean, default: false }, start: String, end: String },
        saturday: { open: { type: Boolean, default: false }, start: String, end: String },
        sunday: { open: { type: Boolean, default: false }, start: String, end: String },
    },
    deliveryFees: [
        { neighborhood: { type: String, required: true }, fee: { type: Number, required: true, min: 0 } }
    ],
    adminPassword: { type: String, default: 'admin123' },
    pixKey: { type: String, default: '84987291269' },
    lastUpdated: { type: Date, default: Date.now },
});

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

export async function GET() {
    try {
        await connectDB();
        const settings = await Settings.findOne() || await Settings.create({});
        const isOpen = isRestaurantOpen(settings.businessHours as BusinessHoursConfig);

        // Não expõe adminPassword na resposta
        const doc = settings.toObject();
        const { adminPassword: _pw, ...safeData } = doc;
        return NextResponse.json({ success: true, data: { ...safeData, isOpen } });
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        return NextResponse.json({ success: false, message: 'Erro ao buscar configurações' }, { status: 500 });
    }
}

async function saveSettings(request: Request) {
    try {
        await connectDB();
        const { deliveryFees, businessHours, allowHalfAndHalf, pixKey } = await request.json();

        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({ deliveryFees, businessHours, allowHalfAndHalf, pixKey });
        } else {
            // Atualiza apenas os campos enviados; não toca em isOpen (calculado) nem adminPassword
            if (businessHours !== undefined) settings.businessHours = businessHours;
            if (deliveryFees !== undefined) settings.deliveryFees = deliveryFees;
            if (pixKey !== undefined) settings.pixKey = pixKey;
            if (allowHalfAndHalf !== undefined) settings.allowHalfAndHalf = allowHalfAndHalf;
            settings.lastUpdated = new Date();
            await settings.save();
        }
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        return NextResponse.json({ success: false, message: 'Erro ao atualizar configurações' }, { status: 500 });
    }
}

export const POST = saveSettings;
export const PUT = saveSettings;
