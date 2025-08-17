export async function POST(request: Request) {
    try {
        const { isOpen, deliveryFees, businessHours, allowHalfAndHalf } = await request.json();
        await connectDB();
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({
                isOpen,
                deliveryFees,
                businessHours,
                allowHalfAndHalf,
                lastUpdated: new Date()
            });
        } else {
            settings.isOpen = isOpen;
            settings.deliveryFees = deliveryFees;
            settings.businessHours = businessHours;
            settings.allowHalfAndHalf = allowHalfAndHalf;
            settings.lastUpdated = new Date();
            await settings.save();
        }
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao atualizar configurações' },
            { status: 500 }
        );
    }
}
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { isRestaurantOpen, getRestaurantStatus } from '../../../utils/timeUtils';
import type { BusinessHoursConfig } from '../../../utils/timeUtils';

// Adicione isso no topo do arquivo (após os imports)
declare global {
    // eslint-disable-next-line no-var
    var mongoose: { conn: any, promise: any } | undefined;
}

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

// Schema do Settings
const settingsSchema = new mongoose.Schema({
    allowHalfAndHalf: {
        type: Boolean,
        default: false
    },
    isOpen: {
        type: Boolean,
        default: false
    },
    businessHours: {
        monday: { open: { type: Boolean, default: false }, start: String, end: String },
        tuesday: { open: { type: Boolean, default: false }, start: String, end: String },
        wednesday: { open: { type: Boolean, default: false }, start: String, end: String },
        thursday: { open: { type: Boolean, default: false }, start: String, end: String },
        friday: { open: { type: Boolean, default: false }, start: String, end: String },
        saturday: { open: { type: Boolean, default: false }, start: String, end: String },
        sunday: { open: { type: Boolean, default: false }, start: String, end: String }
    },
    deliveryFees: [{
        neighborhood: {
            type: String,
            required: true
        },
        fee: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    adminPassword: {
        type: String,
        default: 'admin123' // Senha padrão
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

// Função para verificar se o estabelecimento está aberto
function isCurrentlyOpen(businessHours: any): boolean {
    return isRestaurantOpen(businessHours as BusinessHoursConfig);
}

export async function GET() {
    try {
        await connectDB();
        const settings = await Settings.findOne() || await Settings.create({});

        // Verifica se está aberto baseado no horário
        const isOpen = isCurrentlyOpen(settings.businessHours);
        settings.isOpen = isOpen;

        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao buscar configurações' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
    const { isOpen, deliveryFees, businessHours, allowHalfAndHalf } = await request.json();
        console.log('Recebendo dados para atualização:', { isOpen, deliveryFees, businessHours });

        await connectDB();
        console.log('Conexão com o banco estabelecida');

        let settings = await Settings.findOne();
        console.log('Configurações encontradas:', settings);

        if (!settings) {
            console.log('Criando novas configurações');
            settings = await Settings.create({
                isOpen,
                deliveryFees,
                businessHours,
                allowHalfAndHalf,
                lastUpdated: new Date()
            });
        } else {
            console.log('Atualizando configurações existentes');
            settings.isOpen = isOpen;
            settings.deliveryFees = deliveryFees;
            settings.businessHours = businessHours;
            settings.allowHalfAndHalf = allowHalfAndHalf;
            settings.lastUpdated = new Date();
            await settings.save();
        }

        console.log('Configurações salvas com sucesso:', settings);
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao atualizar configurações' },
            { status: 500 }
        );
    }
} 