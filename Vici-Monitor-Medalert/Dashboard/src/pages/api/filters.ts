
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req;
  const { type } = query;

  if (!type || (type !== 'campaigns' && type !== 'groups')) {
    return res.status(400).json({ success: false, error: 'Invalid filter type' });
  }

  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_ANALYTICS_API_URL}/api/filters/${type}`;
    
    const backendRes = await fetch(apiUrl);

    if (!backendRes.ok) {
      const errorData = await backendRes.text();
      console.error(`Backend API Error (${type}):`, errorData);
      return res.status(backendRes.status).json({ success: false, error: `Backend error: ${backendRes.statusText}` });
    }

    const data = await backendRes.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error(`Proxy API Error (${type}):`, error);
    return res.status(500).json({ success: false, error: `Failed to connect to analytics service: ${error.message}` });
  }
}
