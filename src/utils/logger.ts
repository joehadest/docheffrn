/**
 * Utilitário de logging que remove logs em produção
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },
    error: (...args: any[]) => {
        // Erros sempre são logados, mesmo em produção
        console.error(...args);
    },
    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },
    info: (...args: any[]) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },
};

