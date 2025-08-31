import { NextRequest } from "next/server"
import { getValueIOService } from '@/lib/value-io-service';
import { withErrorHandler, logAPIRequest } from '@/lib/api-utils';

export async function GET() {
  return withErrorHandler(async () => {
    logAPIRequest('GET', '/api/destinations');
    
    // Get the Value.io service instance
    const service = getValueIOService();
    
    // Fetch ProPay destinations from the API
    const response = await service.getProPayDestinations();
    
    // Map destinations to the expected frontend format
    // Use identifier as the primary ID since that's what the API expects in URLs
    const destinations = response.data.destinations?.map((dest) => ({
      id: dest.identifier, // Use identifier as primary ID for API calls
      identifier: dest.identifier,
      name: dest.name,
      gateway: dest.type, // Value.io uses 'type' field
      currency: 'USD', // Default currency, could be enhanced to read from destination config
      _originalId: dest.id, // Keep original MongoDB ID for reference
    })) || [];
    
    console.log(`Successfully fetched ${destinations.length} ProPay destinations from Value.io API`);
    return { destinations };
  });
}