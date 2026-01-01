import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { hashPassword } from '@/lib/passwordUtils';

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
        default: 'admin123'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

export async function POST() {
    try {
        await connectDB();
        
        // Verifica se já existe um documento de configurações
        let settings = await Settings.findOne();
        
        const defaultPassword = 'admin123';
        const hashedPassword = await hashPassword(defaultPassword);

        if (!settings) {
            // Cria um novo documento com a senha padrão hasheada
            settings = await Settings.create({
                adminPassword: hashedPassword,
                lastUpdated: new Date()
            });
            return NextResponse.json({ 
                success: true, 
                message: 'Configurações iniciais criadas com senha padrão: admin123 (hasheada)' 
            });
        } else {
            // Se já existe, verifica se tem senha
            if (!settings.adminPassword) {
                settings.adminPassword = hashedPassword;
                settings.lastUpdated = new Date();
                await settings.save();
                return NextResponse.json({ 
                    success: true, 
                    message: 'Senha padrão adicionada: admin123 (hasheada)' 
                });
            } else {
                // Se já tem senha mas não está hasheada, hash ela
                const bcryptPattern = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/;
                if (!bcryptPattern.test(settings.adminPassword)) {
                    settings.adminPassword = await hashPassword(settings.adminPassword);
                    settings.lastUpdated = new Date();
                    await settings.save();
                    return NextResponse.json({ 
                        success: true, 
                        message: 'Senha existente foi hasheada com sucesso' 
                    });
                }
                return NextResponse.json({ 
                    success: true, 
                    message: 'Configurações já existem com senha definida e hasheada' 
                });
            }
        }
    } catch (error) {
        console.error('Erro ao inicializar configurações:', error);
        return NextResponse.json(
            { success: false, message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
} 