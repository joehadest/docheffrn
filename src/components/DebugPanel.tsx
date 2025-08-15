import React, { useState, useEffect } from 'react';
import { getRestaurantStatus } from '../utils/timeUtils';
import type { BusinessHoursConfig } from '../utils/timeUtils';

interface DebugPanelProps {
    businessHours: BusinessHoursConfig | null;
    isVisible?: boolean;
}

export default function DebugPanel({ businessHours, isVisible = false }: DebugPanelProps) {
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        if (businessHours) {
            const currentStatus = getRestaurantStatus(businessHours);
            setStatus(currentStatus);
        }
    }, [businessHours]);

    if (!isVisible || !status) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm z-50">
            <h3 className="font-bold mb-2">Debug - Status do Estabelecimento</h3>
            <div className="space-y-1">
                <div><strong>Horário UTC:</strong> {status.currentTime}</div>
                <div><strong>Dia:</strong> {status.currentDay}</div>
                <div><strong>Horário Local:</strong> {status.localTime}</div>
                <div><strong>Status:</strong> 
                    <span className={status.isOpen ? 'text-green-400' : 'text-red-400'}>
                        {status.isOpen ? ' ABERTO' : ' FECHADO'}
                    </span>
                </div>
                <div><strong>Motivo:</strong> {status.reason}</div>
                {status.todayHours && (
                    <div>
                        <strong>Configuração do dia:</strong>
                        <div className="ml-2">
                            <div>Aberto: {status.todayHours.open ? 'Sim' : 'Não'}</div>
                            <div>Início: {status.todayHours.start}</div>
                            <div>Fim: {status.todayHours.end}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 