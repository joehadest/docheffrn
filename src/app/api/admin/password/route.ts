import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { hashPassword, comparePassword, isHashedPassword } from '@/lib/passwordUtils';

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

// Schema do Settings (reutilizando o mesmo)
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
    pixKey: {
        type: String,
        default: '84987291269'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

// Função para verificar senha
export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        
        if (!password) {
            return NextResponse.json(
                { success: false, message: 'Senha é obrigatória' },
                { status: 400 }
            );
        }

        await connectDB();
        const settings = await Settings.findOne() || await Settings.create({});

        // Se a senha não está hasheada (migração de versão antiga), hash ela agora
        if (settings.adminPassword && !isHashedPassword(settings.adminPassword)) {
            settings.adminPassword = await hashPassword(settings.adminPassword);
            await settings.save();
        }

        // Compara a senha fornecida com o hash armazenado
        const isPasswordValid = settings.adminPassword 
            ? await comparePassword(password, settings.adminPassword)
            : false;

        if (isPasswordValid) {
            const res = NextResponse.json({ success: true, message: 'Senha correta' });
            res.cookies.set('isAuthenticated', 'true', { httpOnly: true, path: '/admin', maxAge: 60 * 60 * 24 });
            return res;
        } else {
            return NextResponse.json(
                { success: false, message: 'Senha incorreta' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Erro ao verificar senha:', error);
        return NextResponse.json(
            { success: false, message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// Função para alterar senha
export async function PUT(request: Request) {
    try {
        const { currentPassword, newPassword } = await request.json();
        
        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, message: 'Senha atual e nova senha são obrigatórias' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, message: 'A nova senha deve ter pelo menos 6 caracteres' },
                { status: 400 }
            );
        }

        await connectDB();
        const settings = await Settings.findOne() || await Settings.create({});

        // Se a senha não está hasheada (migração de versão antiga), hash ela primeiro
        if (settings.adminPassword && !isHashedPassword(settings.adminPassword)) {
            settings.adminPassword = await hashPassword(settings.adminPassword);
            await settings.save();
        }

        // Verifica se a senha atual está correta
        const isCurrentPasswordValid = settings.adminPassword 
            ? await comparePassword(currentPassword, settings.adminPassword)
            : false;

        if (!isCurrentPasswordValid) {
            return NextResponse.json(
                { success: false, message: 'Senha atual incorreta' },
                { status: 401 }
            );
        }

        // Hash e atualiza a nova senha
        settings.adminPassword = await hashPassword(newPassword);
        settings.lastUpdated = new Date();
        await settings.save();

        return NextResponse.json({ 
            success: true, 
            message: 'Senha alterada com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        return NextResponse.json(
            { success: false, message: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}