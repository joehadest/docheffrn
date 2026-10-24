import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dns from 'dns';
import { isRestaurantOpen } from '../../../utils/timeUtils';
import type { BusinessHoursConfig } from '../../../utils/timeUtils';
import { requireAdmin } from '@/lib/adminSession';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');

if (process.env.NODE_ENV === 'development' && MONGODB_URI.startsWith('mongodb+srv://')) {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
}

declare global {
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
    const denied = await requireAdmin(request);
    if (denied) return denied;
    try {
        await connectDB();
        const { deliveryFees, businessHours, allowHalfAndHalf, pixKey } = await request.json();
        if (deliveryFees !== undefined && (!Array.isArray(deliveryFees) || deliveryFees.some(fee => typeof fee?.neighborhood !== 'string' || !fee.neighborhood.trim() || typeof fee.fee !== 'number' || !Number.isFinite(fee.fee) || fee.fee < 0))) return NextResponse.json({ success: false, message: 'Taxas de entrega inválidas.' }, { status: 400 });
        if (pixKey !== undefined && (typeof pixKey !== 'string' || pixKey.length > 200)) return NextResponse.json({ success: false, message: 'Chave PIX inválida.' }, { status: 400 });
        if (allowHalfAndHalf !== undefined && typeof allowHalfAndHalf !== 'boolean') return NextResponse.json({ success: false, message: 'Configuração inválida.' }, { status: 400 });
        if (businessHours !== undefined && (!businessHours || typeof businessHours !== 'object' || Object.values(businessHours).some(day => !day || typeof day !== 'object' || typeof (day as { open?: unknown }).open !== 'boolean' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String((day as { start?: unknown }).start)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String((day as { end?: unknown }).end))))) return NextResponse.json({ success: false, message: 'Horários inválidos.' }, { status: 400 });

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
        const { adminPassword: _pw, ...safeData } = settings.toObject();
        return NextResponse.json({ success: true, data: safeData });
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        return NextResponse.json({ success: false, message: 'Erro ao atualizar configurações' }, { status: 500 });
    }
}

export const POST = saveSettings;
export const PUT = saveSettings;
