import { NextRequest } from 'next/server';
import { getValueIOService } from '@/lib/value-io-service';
import { BatchSearchParamsSchema } from '@/types/value-io';
import { withErrorHandler, parseQueryParams, logAPIRequest, validateDateRange } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    logAPIRequest('GET', '/api/batches');
    
    // Parse and validate query parameters
    const params = parseQueryParams(request, BatchSearchParamsSchema);
    
    // Validate date range if provided
    validateDateRange(params.startDate, params.endDate);
    
    // Get the Value.io service instance
    const service = getValueIOService();
    
    // Ensure params have required defaults
    const batchParams = {
      page: params.page || 1,
      pageSize: params.pageSize || 5,
      ...params
    };
    
    // Fetch batches using the enhanced service
    const response = await service.getBatches(batchParams);
    
    return response;
  });
}