
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { campaign, group } = req.query;
    const queryParams = new URLSearchParams();
    if (typeof campaign === 'string') {
      queryParams.append('campaign', campaign);
    }
    if (typeof group === 'string') {
      queryParams.append('group', group);
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_ANALYTICS_API_URL}/api/agents/realtime?${queryParams.toString()}`;
    const token = req.cookies.auth_token;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const backendRes = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!backendRes.ok) {
      const errorData = await backendRes.json();
      return res.status(backendRes.status).json(errorData);
    }

    const data = await backendRes.json();
    res.status(200).json(data);

  } catch (error) {
    console.error("Real-time proxy error:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
