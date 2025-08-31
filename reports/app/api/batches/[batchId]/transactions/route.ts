import { NextRequest } from 'next/server';
import { getValueIOService } from '@/lib/value-io-service';
import { TransactionSearchParams, TransactionSearchParamsSchema } from '@/types/value-io';
import { withErrorHandler, parseQueryParams, logAPIRequest, sanitizePII } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{
    batchId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return withErrorHandler(async () => {
    const { batchId } = await params;
    
    if (!batchId) {
      throw new Error('Batch ID is required');
    }
    
    logAPIRequest('GET', `/api/batches/${batchId}/transactions`);
    
    // Parse query parameters, adding the batchId from the route
    const baseParams = parseQueryParams(request, TransactionSearchParamsSchema.omit({ batchId: true }));
    const queryParams: TransactionSearchParams = {
      page: baseParams.page || 1,
      pageSize: baseParams.pageSize || 10,
      ...baseParams,
      batchId
    };
    
    // Get the Value.io service instance
    const service = getValueIOService();
    
    // Fetch transactions using the enhanced service
    const response = await service.getTransactions(queryParams);
    
    // Sanitize PII data before returning
    const sanitizedResponse = {
      ...response,
      transactions: response.transactions.map(transaction => sanitizePII(transaction))
    };
    
    return sanitizedResponse;
  });
}