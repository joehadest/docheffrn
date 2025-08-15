/**
 * Script de teste para verificar a lógica de horários
 * Execute este script para testar se a verificação de horários está funcionando corretamente
 */

import { getCurrentTimeUTC, getCurrentDayOfWeek, isRestaurantOpen, getRestaurantStatus } from './timeUtils';
import type { BusinessHoursConfig } from './timeUtils';

// Configuração de teste
const testBusinessHours: BusinessHoursConfig = {
    monday: { open: true, start: '18:00', end: '22:00' },
    tuesday: { open: true, start: '18:00', end: '22:00' },
    wednesday: { open: true, start: '18:00', end: '22:00' },
    thursday: { open: true, start: '18:00', end: '22:00' },
    friday: { open: true, start: '18:00', end: '23:00' },
    saturday: { open: true, start: '18:00', end: '23:00' },
    sunday: { open: false, start: '18:00', end: '22:00' }
};

export function testTimeUtils() {
    console.log('=== Teste de Utilitários de Horário ===');
    
    const currentTime = getCurrentTimeUTC();
    const currentDay = getCurrentDayOfWeek();
    const status = getRestaurantStatus(testBusinessHours);
    
    console.log('Horário atual (Brasil):', currentTime);
    console.log('Dia atual:', currentDay);
    console.log('Status detalhado:', status);
    console.log('Estabelecimento está aberto:', status.isOpen);
    console.log('Motivo:', status.reason);
    
    // Teste específico para domingo às 21:01
    console.log('\n=== Teste Específico para Domingo 21:01 ===');
    const testSundayTime = '21:01';
    const testDate = new Date();
    const [hours, minutes] = testSundayTime.split(':').map(Number);
    
    // Simular domingo às 21:01
    const originalGetDay = Date.prototype.getDay;
    const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
    
    Date.prototype.getDay = () => 0; // Domingo
    Date.prototype.toLocaleTimeString = () => testSundayTime;
    
    const testStatus = getRestaurantStatus(testBusinessHours);
    console.log(`Domingo ${testSundayTime}: ${testStatus.isOpen ? 'ABERTO' : 'FECHADO'} - ${testStatus.reason}`);
    console.log('Configuração do domingo:', testBusinessHours.sunday);
    
    // Restaurar métodos originais
    Date.prototype.getDay = originalGetDay;
    Date.prototype.toLocaleTimeString = originalToLocaleTimeString;
    
    // Testar diferentes horários
    const testTimes = [
        '17:59', // Antes de abrir
        '18:00', // Horário de abertura
        '20:00', // Meio do expediente
        '21:01', // Seu horário atual
        '22:30', // Horário de fechamento
        '22:31'  // Depois de fechar
    ];
    
    console.log('\n=== Teste com diferentes horários ===');
    testTimes.forEach(time => {
        const testDate = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        
        // Simular o horário atual
        const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
        
        Date.prototype.toLocaleTimeString = () => time;
        
        const testStatus = getRestaurantStatus(testBusinessHours);
        
        console.log(`Horário ${time}: ${testStatus.isOpen ? 'ABERTO' : 'FECHADO'} - ${testStatus.reason}`);
        
        // Restaurar métodos originais
        Date.prototype.toLocaleTimeString = originalToLocaleTimeString;
    });
    
    console.log('\n=== Teste concluído ===');
}

// Executar teste se este arquivo for executado diretamente
if (typeof window !== 'undefined') {
    // No navegador, adicionar ao console global
    (window as any).testTimeUtils = testTimeUtils;
    console.log('Função testTimeUtils disponível no console. Execute: testTimeUtils()');
} 