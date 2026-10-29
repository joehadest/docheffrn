import mongoose from 'mongoose';
import { DEFAULT_WHATSAPP_NUMBER } from '@/utils/whatsapp';

const settingsSchema = new mongoose.Schema({
    whatsappNumber: { type: String, default: DEFAULT_WHATSAPP_NUMBER },
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
    deliveryFees: [{
        neighborhood: { type: String, required: true },
        fee: { type: Number, required: true, min: 0 },
    }],
    adminPassword: { type: String, default: 'admin123' },
    pixKey: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
});

// Recover a model compiled by an older route during development hot reload.
if (mongoose.models.Settings && !mongoose.models.Settings.schema.path('whatsappNumber')) {
    mongoose.deleteModel('Settings');
}

// Every route uses the same model, including the login route that runs first.
export const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
