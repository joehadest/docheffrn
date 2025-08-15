/**
 * Função para verificar as configurações atuais do banco de dados
 */

export async function checkCurrentConfig() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        
        if (data.success) {
            console.log('=== Configurações Atuais ===');
            console.log('Configurações completas:', data.data);
            console.log('Horários de funcionamento:', data.data.businessHours);
            console.log('Status geral:', data.data.isOpen);
            
            // Verificar configuração do domingo especificamente
            if (data.data.businessHours?.sunday) {
                console.log('Configuração do domingo:', data.data.businessHours.sunday);
                console.log('Domingo está aberto:', data.data.businessHours.sunday.open);
                console.log('Horário de início:', data.data.businessHours.sunday.start);
                console.log('Horário de fim:', data.data.businessHours.sunday.end);
            } else {
                console.log('ERRO: Configuração do domingo não encontrada!');
            }
            
            return data.data;
        } else {
            console.error('Erro ao buscar configurações:', data.message);
            return null;
        }
    } catch (error) {
        console.error('Erro ao verificar configurações:', error);
        return null;
    }
}

// Adicionar ao console global para debug
if (typeof window !== 'undefined') {
    (window as any).checkCurrentConfig = checkCurrentConfig;
    console.log('Função checkCurrentConfig disponível no console. Execute: checkCurrentConfig()');
} 