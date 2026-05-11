/**
 * Utilitários para verificação de horários do estabelecimento
 */

export interface BusinessHours {
    open: boolean;
    start: string;
    end: string;
}

export interface BusinessHoursConfig {
    monday: BusinessHours;
    tuesday: BusinessHours;
    wednesday: BusinessHours;
    thursday: BusinessHours;
    friday: BusinessHours;
    saturday: BusinessHours;
    sunday: BusinessHours;
}

/**
 * Obtém o horário atual em formato local do Brasil
 * @returns string no formato "HH:MM"
 */
export function getCurrentTimeUTC(): string {
    const now = new Date();
    // Usar toLocaleTimeString com fuso horário específico do Brasil
    return now.toLocaleTimeString('pt-BR', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
}

/**
 * Dia da semana em inglês (lowercase), sempre no fuso America/Sao_Paulo.
 * Deve ser usado junto com getCurrentTimeUTC — ambos no mesmo fuso evitam
 * rejeitar pedidos no servidor (UTC) enquanto o cardápio no Brasil ainda mostra "aberto".
 */
export function getCurrentDayOfWeek(): string {
    const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'long',
    }).format(new Date());
    return weekday.toLowerCase();
}

/** "18:00", "9:30", "18:00:00" → minutos desde meia-noite (null se inválido) */
export function parseTimeToMinutes(time: string | undefined | null): number | null {
    if (time == null || typeof time !== 'string') return null;
    const m = time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
    return h * 60 + min;
}

/** Hora atual em minutos (0–1439) no fuso America/Sao_Paulo */
export function getCurrentMinutesInSaoPaulo(): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find(p => p.type === 'hour')?.value ?? '0');
    const min = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
    return h * 60 + min;
}

function isNowWithinBusinessSlot(todayHours: BusinessHours | undefined): boolean {
    if (!todayHours || !todayHours.open) return false;
    const cur = getCurrentMinutesInSaoPaulo();
    const startM = parseTimeToMinutes(todayHours.start);
    const endM = parseTimeToMinutes(todayHours.end);
    if (startM === null || endM === null) return false;
    if (endM >= startM) {
        return cur >= startM && cur <= endM;
    }
    /* Virada do dia (ex.: 22:00–02:00) */
    return cur >= startM || cur <= endM;
}

/**
 * Verifica se o estabelecimento está aberto baseado nas configurações de horário
 * @param businessHours Configurações de horário do estabelecimento
 * @returns boolean indicando se está aberto
 */
export function isRestaurantOpen(businessHours: BusinessHoursConfig | null | undefined): boolean {
    if (!businessHours) return false;
    const currentDay = getCurrentDayOfWeek();
    const todayHours = businessHours[currentDay as keyof BusinessHoursConfig];
    return isNowWithinBusinessSlot(todayHours);
}

/**
 * Obtém informações detalhadas sobre o status do estabelecimento
 * @param businessHours Configurações de horário do estabelecimento
 * @returns objeto com informações detalhadas
 */
export function getRestaurantStatus(businessHours: BusinessHoursConfig | null | undefined) {
    const currentTime = getCurrentTimeUTC();
    const currentDay = getCurrentDayOfWeek();
    const now = new Date();

    const todayHours = businessHours?.[currentDay as keyof BusinessHoursConfig];

    let isOpen = false;
    let reason = 'Sem horários';

    if (!businessHours) {
        reason = 'Sem horários';
    } else if (!todayHours) {
        reason = 'Dia não configurado';
    } else if (!todayHours.open) {
        reason = 'Dia marcado como fechado';
    } else {
        const cur = getCurrentMinutesInSaoPaulo();
        const startM = parseTimeToMinutes(todayHours.start);
        const endM = parseTimeToMinutes(todayHours.end);
        if (startM === null || endM === null) {
            reason = 'Horário inválido';
        } else if (endM >= startM) {
            if (cur < startM) reason = 'Ainda não abriu';
            else if (cur > endM) reason = 'Já fechou';
            else {
                isOpen = true;
                reason = 'Aberto';
            }
        } else {
            isOpen = cur >= startM || cur <= endM;
            reason = isOpen ? 'Aberto' : 'Fechado';
        }
    }

    return {
        currentTime,
        currentDay,
        localTime: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        utcTime: now.toISOString(),
        todayHours,
        isOpen,
        reason,
    };
}