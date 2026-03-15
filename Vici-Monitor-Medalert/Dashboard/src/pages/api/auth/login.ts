
import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // We only accept POST requests to this endpoint
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { username, password } = req.body;

  try {
    const backendUrl = `${process.env.NEXT_PUBLIC_ANALYTICS_API_URL}/api/auth/login`;
    
    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
        // Forward the error message from the backend
        return res.status(backendRes.status).json({ success: false, message: data.message || 'Authentication failed' });
    }

    // If login is successful, we receive a token.
    // We will set this token in a secure, HTTP-only cookie.
    const { token, user } = data;

    const cookie = serialize('auth_token', token, {
        httpOnly: true, // The browser's JavaScript cannot access the cookie
        secure: process.env.NODE_ENV !== 'development', // Use 'secure' in production
        maxAge: 60 * 60 * 8, // 8 hours, same as the JWT expiry
        sameSite: 'lax', // Protects against CSRF attacks
        path: '/', // The cookie is available to all pages
    });

    res.setHeader('Set-Cookie', cookie);

    // Send back a success response with user info (but not the token)
    return res.status(200).json({ success: true, user });

  } catch (error: any) {
    console.error("Login Proxy Error:", error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
}
