import { NextResponse } from 'next/server';
import { getValueIOService } from '@/lib/value-io-service';
import { withErrorHandler, logAPIRequest } from '@/lib/api-utils';

export async function GET() {
  return withErrorHandler(async () => {
    logAPIRequest('GET', '/api/test-auth');
    
    // Test the Value.io service connection
    const service = getValueIOService();
    const result = await service.testConnection();
    
    if (result.success) {
      // Also test fetching some actual data to verify full functionality
      try {
        const destinationsResponse = await service.getProPayDestinations();
        const batchesResponse = await service.getBatches({ page: 1, pageSize: 2 });
        const cacheStats = service.getCacheStats();
        
        return {
          success: true,
          message: result.message,
          accountInfo: result.accountInfo,
          performance: result.performance,
          testData: {
            batchesCount: batchesResponse.batches?.length || 0,
            destinationsCount: destinationsResponse.data.destinations?.length || 0,
            proPayDestinationsOnly: true,
            sampleBatch: batchesResponse.batches?.[0] ? {
              id: batchesResponse.batches[0].batch_id,
              depositAmount: batchesResponse.batches[0].deposit_amount,
              depositDate: batchesResponse.batches[0].deposit_date,
              currency: batchesResponse.batches[0].settlement_currency,
            } : null,
            sampleDestination: destinationsResponse.data.destinations?.[0] ? {
              id: destinationsResponse.data.destinations[0].id,
              name: destinationsResponse.data.destinations[0].name,
              type: destinationsResponse.data.destinations[0].type,
              identifier: destinationsResponse.data.destinations[0].identifier,
            } : null,
          },
          cacheStats,
          credentials: {
            apiUser: process.env.VALUE_IO_API_USER,
            apiKeyPrefix: process.env.VALUE_IO_API_KEY?.substring(0, 8) + '...',
            baseUrl: process.env.VALUE_IO_BASE_URL || 'https://api.value.io/v1',
          }
        };
      } catch (dataError) {
        return {
          success: true,
          message: result.message + ' (Authentication works, but data fetch failed)',
          accountInfo: result.accountInfo,
          performance: result.performance,
          dataError: dataError instanceof Error ? dataError.message : String(dataError),
          credentials: {
            apiUser: process.env.VALUE_IO_API_USER,
            apiKeyPrefix: process.env.VALUE_IO_API_KEY?.substring(0, 8) + '...',
            baseUrl: process.env.VALUE_IO_BASE_URL || 'https://api.value.io/v1',
          }
        };
      }
    } else {
      // Return error response with proper status
      const errorResponse = NextResponse.json({
        success: false,
        message: result.message,
        performance: result.performance,
        credentials: {
          apiUser: process.env.VALUE_IO_API_USER,
          apiKeyPrefix: process.env.VALUE_IO_API_KEY?.substring(0, 8) + '...',
          baseUrl: process.env.VALUE_IO_BASE_URL || 'https://api.value.io/v1',
        }
      }, { status: 401 });
      
      return errorResponse;
    }
  });
}