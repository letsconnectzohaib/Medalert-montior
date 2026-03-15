
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req;
  const { type, endDate, campaign, group } = query;

  if (!type || !endDate) {
    return res.status(400).json({ success: false, error: 'type and endDate are required' });
  }

  try {
    const queryParams = new URLSearchParams();
    if (campaign && typeof campaign === 'string') {
        queryParams.append('campaign', campaign);
    }
    if (group && typeof group === 'string') {
        queryParams.append('group', group);
    }
    
    const queryString = queryParams.toString();
    const apiUrl = `${process.env.NEXT_PUBLIC_ANALYTICS_API_URL}/api/trends/${type}/${endDate}${queryString ? `?${queryString}` : ''}`;
    
    const backendRes = await fetch(apiUrl);
    const data = await backendRes.json();

    if (!backendRes.ok || !data.success) {
      console.error("Backend API Error:", data.error);
      return res.status(backendRes.status).json({ success: false, error: data.error || `Backend error: ${backendRes.statusText}` });
    }

    return res.status(200).json(data);

  } catch (error: any) {
    console.error("Proxy API Error:", error);
    return res.status(500).json({ success: false, error: `Failed to connect to analytics service: ${error.message}` });
  }
}
