
import type { NextApiRequest, NextApiResponse } from 'next';

// This API route acts as a proxy between the Next.js frontend and the separate backend server.
// This is a best practice for security and abstraction. The frontend only ever talks to its own backend.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req;
  const { shiftDate } = query;

  // We are fetching data for the "analytical-breakdown" which is the most complex view.
  // We can easily add more endpoints here later.
  const endpoint = 'analytical-breakdown';

  if (!shiftDate) {
    return res.status(400).json({ success: false, error: 'shiftDate is required' });
  }

  try {
    // Forward the request to the actual backend server.
    // The NEXT_PUBLIC_ANALYTICS_API_URL would be 'http://localhost:3001' in development.
    const apiUrl = `${process.env.NEXT_PUBLIC_ANALYTICS_API_URL}/api/summary/${endpoint}/${shiftDate}`;
    
    const backendRes = await fetch(apiUrl);

    if (!backendRes.ok) {
      const errorData = await backendRes.text();
      console.error("Backend API Error:", errorData);
      return res.status(backendRes.status).json({ success: false, error: `Backend error: ${backendRes.statusText}` });
    }

    const data = await backendRes.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error("Proxy API Error:", error);
    return res.status(500).json({ success: false, error: `Failed to connect to analytics service: ${error.message}` });
  }
}
