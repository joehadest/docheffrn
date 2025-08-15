'use client';
import React, { useEffect, useState } from 'react';
import { FaBell } from 'react-icons/fa';

interface NotificationProps {
    message: string;
    onClose: () => void;
}

export default function Notification({ message, onClose }: NotificationProps) {
    useEffect(() => {
        // Criar e tocar som de notificação usando Web Audio API
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (err) {
            console.log('Erro ao tocar som:', err);
        }

        // Fechar automaticamente após 5 segundos
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-4 right-4 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up">
            <FaBell className="text-xl" />
            <span>{message}</span>
            <button
                onClick={onClose}
                className="ml-2 hover:text-orange-200 transition-colors"
            >
                ×
            </button>
        </div>
    );
} 