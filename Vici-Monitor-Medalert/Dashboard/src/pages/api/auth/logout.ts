
import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // To log out, we simply clear the cookie by setting its maxAge to -1.
  const cookie = serialize('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    maxAge: -1, // Expire the cookie immediately
    sameSite: 'lax',
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);

  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
}
