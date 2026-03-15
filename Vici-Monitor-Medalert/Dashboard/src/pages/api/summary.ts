
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req;
  const { shiftDate, campaign, group } = query;

  if (!shiftDate) {
    return res.status(400).json({ success: false, error: 'shiftDate is required' });
  }

  try {
    const queryParams = new URLSearchParams();
    queryParams.append('shiftDate', shiftDate as string);
    if (campaign && typeof campaign === 'string') {
        queryParams.append('campaign', campaign);
    }
    if (group && typeof group === 'string') {
        queryParams.append('group', group);
    }
    
    const queryString = queryParams.toString();
    const apiUrl = `${process.env.NEXT_PUBLIC_ANALYTICS_API_URL}/api/summary?${queryString}`;
    
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
