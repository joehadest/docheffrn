import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const ADMIN_SESSION_COOKIE = 'adminSession';
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24;
const collectionName = 'admin_sessions';

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function readSessionToken(request: Request): string | null {
  const cookie = request.headers.get('cookie')?.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const token = cookie?.slice(ADMIN_SESSION_COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export function isSameOriginRequest(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function getAdminSession(request: Request) {
  const token = readSessionToken(request);
  if (!token) return null;
  const { db } = await connectToDatabase();
  return db.collection(collectionName).findOne({
    tokenHash: hashSessionToken(token), expiresAt: { $gt: new Date() },
  }, { projection: { _id: 1, expiresAt: 1 } });
}

export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: 'Origem da requisição não permitida.' }, { status: 403 });
  }
  try {
    if (await getAdminSession(request)) return null;
    return NextResponse.json({ success: false, message: 'Sua sessão expirou. Entre novamente no painel.' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, message: 'Não foi possível validar a sessão. Tente novamente.' }, { status: 503 });
  }
}

export async function createAdminSession(response: NextResponse) {
  const token = randomBytes(32).toString('hex');
  const { db } = await connectToDatabase();
  // Mongo TTL cleanup is asynchronous, so every session read also checks expiration.
  await db.collection(collectionName).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection(collectionName).insertOne({
    tokenHash: hashSessionToken(token), createdAt: new Date(),
    expiresAt: new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000),
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_SECONDS,
  });
  response.cookies.set('isAuthenticated', '', { httpOnly: true, path: '/admin', maxAge: 0 });
  response.headers.set('Cache-Control', 'no-store');
}

export async function revokeAdminSession(request: Request) {
  const token = readSessionToken(request);
  if (!token) return;
  const { db } = await connectToDatabase();
  await db.collection(collectionName).deleteOne({ tokenHash: hashSessionToken(token) });
}

export async function revokeAllAdminSessions() {
  const { db } = await connectToDatabase();
  await db.collection(collectionName).deleteMany({});
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  response.cookies.set('isAuthenticated', '', { httpOnly: true, path: '/admin', maxAge: 0 });
}
