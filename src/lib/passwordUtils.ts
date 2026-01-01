import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Gera hash de uma senha usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara uma senha em texto plano com um hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

/**
 * Verifica se uma string é um hash bcrypt válido
 */
export function isHashedPassword(password: string): boolean {
    // Bcrypt hashes começam com $2a$, $2b$ ou $2y$ e têm 60 caracteres
    return /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(password);
}

