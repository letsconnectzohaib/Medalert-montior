
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode('your-super-secret-key-that-should-be-in-a-env-file');

async function verifyToken(token: string): Promise<boolean> {
    try {
        await jose.jwtVerify(token, JWT_SECRET);
        return true;
    } catch (e) {
        return false;
    }
}

export async function middleware(req: NextRequest) {
    const token = req.cookies.get('auth_token')?.value;
    const isAuthenticated = token ? await verifyToken(token) : false;
    const { pathname } = req.nextUrl;

    // Allow requests for API routes, static files, and image optimization
    if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/static')) {
        return NextResponse.next();
    }

    // If user is authenticated and tries to visit login page, redirect to dashboard
    if (isAuthenticated && pathname === '/login') {
        return NextResponse.redirect(new URL('/', req.url));
    }

    // If user is not authenticated and is not on the login page, redirect to login
    if (!isAuthenticated && pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
}
