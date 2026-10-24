import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { clearAdminSessionCookie, getAdminSession, revokeAdminSession } from '@/lib/adminSession';

export async function proxy(request: NextRequest) {
    const isLoginPage = request.nextUrl.pathname === '/admin/login';
    const isLogoutRoute = request.nextUrl.pathname === '/admin/logout';

    // Se for rota de logout, limpa o cookie e redireciona para login
    if (isLogoutRoute) {
        try { await revokeAdminSession(request); } catch { /* Clear browser credentials if storage is unavailable. */ }
        const response = NextResponse.redirect(new URL('/admin/login', request.url));
        clearAdminSessionCookie(response);
        return response;
    }

    // Se não estiver autenticado e tentar acessar uma rota admin
    let isAuthenticated = false;
    try { isAuthenticated = Boolean(await getAdminSession(request)); } catch { /* Fail closed. */ }
    if (!isAuthenticated && !isLoginPage) {
        const response = NextResponse.redirect(new URL('/admin/login', request.url));
        clearAdminSessionCookie(response);
        return response;
    }

    // Se estiver autenticado e tentar acessar a página de login
    if (isAuthenticated && isLoginPage) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
