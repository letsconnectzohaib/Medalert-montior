
import type { NextApiRequest, NextApiResponse } from 'next';

// This API route acts as a proxy for our heatmap data.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req;
  const { endDate } = query;

  if (!endDate) {
    return res.status(400).json({ success: false, error: 'endDate is required' });
  }

  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_ANALYTICS_API_URL}/api/summary/heatmap-data/${endDate}`;
    
    const backendRes = await fetch(apiUrl);

    if (!backendRes.ok) {
      const errorData = await backendRes.text();
      console.error("Backend API Error (heatmap):", errorData);
      return res.status(backendRes.status).json({ success: false, error: `Backend error: ${backendRes.statusText}` });
    }

    const data = await backendRes.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error("Proxy API Error (heatmap):", error);
    return res.status(500).json({ success: false, error: `Failed to connect to analytics service: ${error.message}` });
  }
}
