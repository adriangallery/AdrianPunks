/**
 * API endpoint for NFT preview generation
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface PreviewRequest {
  tokenId: string;
  traits?: string[];
}

interface PreviewResponse {
  previewUrl: string;
  traits: Record<string, number>;
  tokenId: string;
  timestamp: number;
}

interface ErrorResponse {
  error: string;
  retryAfter?: number;
}

// Simple in-memory rate limiting (in production, use Redis or similar)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userRequests = requestCounts.get(ip);

  if (!userRequests || now > userRequests.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userRequests.count >= RATE_LIMIT) {
    return false;
  }

  userRequests.count++;
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreviewResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIP as string)) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.',
      retryAfter: 60
    });
  }

  try {
    const { tokenId, traits } = req.query;

    if (!tokenId || typeof tokenId !== 'string') {
      return res.status(400).json({ error: 'Token ID is required' });
    }

    // Parse traits from query parameters
    const traitsArray = Array.isArray(traits) ? traits : traits ? [traits] : [];
    const traitsMap: Record<string, number> = {};

    traitsArray.forEach(trait => {
      const [category, traitId] = trait.split(':');
      if (category && traitId) {
        traitsMap[category] = parseInt(traitId);
      }
    });

    // Generate preview URL based on token and traits
    const previewUrl = generatePreviewUrl(tokenId, traitsMap);

    const response: PreviewResponse = {
      previewUrl,
      traits: traitsMap,
      tokenId,
      timestamp: Date.now(),
    };

    // Set aggressive cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // Cache for 1 hour
    res.setHeader('ETag', `"${tokenId}-${JSON.stringify(traitsMap)}"`);
    res.status(200).json(response);

  } catch (error) {
    console.error('Preview API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate preview URL for NFT with traits
 */
function generatePreviewUrl(tokenId: string, traits: Record<string, number>): string {
  // This is a placeholder implementation
  // In a real implementation, you would:
  // 1. Fetch the base NFT image
  // 2. Apply trait overlays based on the traits parameter
  // 3. Generate a composite image
  // 4. Return the URL to the generated image

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  // For now, return a placeholder URL
  // In production, this would be a real image generation service
  if (Object.keys(traits).length === 0) {
    return `${baseUrl}/api/nfts/${tokenId}/image`;
  }

  // Build traits parameter for image generation
  const traitsParam = Object.entries(traits)
    .map(([category, traitId]) => `${category}:${traitId}`)
    .join(',');

  return `${baseUrl}/api/generate-preview?tokenId=${tokenId}&traits=${traitsParam}`;
} 