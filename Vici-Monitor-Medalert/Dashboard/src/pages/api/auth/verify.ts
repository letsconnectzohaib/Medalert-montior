
import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-super-secret-key-that-should-be-in-a-env-file';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const token = req.cookies.auth_token;

        if (!token) {
            return res.status(401).json({ isAuthenticated: false, message: 'No token found.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // The token is valid, send back the user info stored in the token
        res.status(200).json({ isAuthenticated: true, user: decoded });

    } catch (error) {
        // If verification fails (invalid or expired token)
        res.status(410).json({ isAuthenticated: false, message: 'Session expired or invalid.' });
    }
}
