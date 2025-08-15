/**
 * Script de teste específico para verificar o status no carrinho
 */

export async function testCartStatus() {
    try {
        console.log('=== Teste de Status no Carrinho ===');
        
        // Buscar configurações atuais
        const response = await fetch('/api/settings');
        const data = await response.json();
        
        if (data.success) {
            console.log('Configurações carregadas:', data.data);
            
            // Simular a lógica do carrinho
            const businessHours = data.data.businessHours;
            if (businessHours) {
                // Usar a mesma lógica do Cart
                const { isRestaurantOpen } = await import('./timeUtils');
                const restaurantStatus = isRestaurantOpen(businessHours);
                
                console.log('Status calculado:', restaurantStatus);
                console.log('Deve estar aberto:', restaurantStatus ? 'SIM' : 'NÃO');
                
                // Verificar horário atual
                const now = new Date();
                const currentTime = now.toLocaleTimeString('pt-BR', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo'
                });
                const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
                
                console.log('Horário atual:', currentTime);
                console.log('Dia atual:', currentDay);
                console.log('Configuração do dia:', businessHours[currentDay]);
                
                return {
                    isOpen: restaurantStatus,
                    currentTime,
                    currentDay,
                    dayConfig: businessHours[currentDay]
                };
            } else {
                console.log('ERRO: Configurações de horário não encontradas');
                return null;
            }
        } else {
            console.log('ERRO: Falha ao carregar configurações');
            return null;
        }
    } catch (error) {
        console.error('Erro no teste:', error);
        return null;
    }
}

// Adicionar ao console global
if (typeof window !== 'undefined') {
    (window as any).testCartStatus = testCartStatus;
    console.log('Função testCartStatus disponível no console. Execute: testCartStatus()');
} 