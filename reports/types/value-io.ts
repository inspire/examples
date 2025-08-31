import { z } from 'zod';

// Value.io API Response wrapper
export const ValueIOResponseSchema = z.object({
  path: z.string(),
  route: z.string(),
  mode: z.string(),
  status: z.string(),
  errors: z.record(z.any()),
  data: z.any(),
});

export type ValueIOResponse<T = any> = {
  path: string;
  route: string;
  mode: string;
  status: string;
  errors: Record<string, any>;
  data: T;
};


// Batch Schema from Value.io reporting endpoints
export const BatchSchema = z.object({
  batch_id: z.union([z.string(), z.number()]), // Can be string or number from API
  deposit_date: z.string(),
  deposit_amount: z.number(),
  settlement_currency: z.string(),
  // Additional fields for component compatibility
  destination_id: z.string().optional(),
  destination_identifier: z.string().optional(), // Value.io identifier used in API URLs
  destination_name: z.string().optional(),
  destination_type: z.string().optional(), // e.g., 'Gateway::VIOInstant'
  transaction_count: z.number().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type Batch = z.infer<typeof BatchSchema>;

// Transaction Schema from Value.io reporting endpoints
export const TransactionSchema = z.object({
  gateway_transaction_id: z.string().nullable(),
  transaction_date: z.string(),
  fund_date: z.string(),
  transaction_number: z.number(),
  transaction_type: z.string(), // e.g., '+SP', '-CK', '+CC', etc.
  invoice_number: z.string(),
  payer_name: z.string(),
  authorization_amount: z.number(),
  authorization_currency: z.string(),
  gross_amount: z.number(),
  discount_fee: z.number(),
  per_trans_fee: z.number(),
  credit: z.number(),
  total_fee: z.number(),
  net_amount: z.number(),
  settlement_currency: z.string(),
  comment1: z.string().nullable(),
  comment2: z.string().nullable(),
  // Additional fields for component compatibility
  batch_id: z.union([z.string(), z.number()]).optional(),
  destination_type: z.string().optional(), // e.g., 'Gateway::VIOInstant'
  status: z.enum(['settled', 'pending', 'failed', 'refunded']).optional(),
  card_last_four: z.string().optional(),
  card_brand: z.string().optional(),
  merchant_reference: z.string().optional(),
  destination_name: z.string().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Destination/Gateway Schema (updated for real API structure)
export const DestinationSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  identifier: z.string(),
  type: z.string(), // e.g., 'Gateway::VIOInstant', 'Gateway::Inspire', etc.
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  config: z.any().nullable(),
  links: z.array(z.object({
    rel: z.string(),
    href: z.string(),
  })).optional(),
});

export type Destination = z.infer<typeof DestinationSchema>;

// Account Schema
export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  payment_redirect_url: z.string().nullable(),
  signature_secret: z.string(),
  account_updater: z.boolean(),
});

export type Account = z.infer<typeof AccountSchema>;

// API Response Schemas

export const DestinationListResponseSchema = z.object({
  destinations: z.array(DestinationSchema),
});

export type DestinationListResponse = z.infer<typeof DestinationListResponseSchema>;

export const AccountResponseSchema = z.object({
  account: AccountSchema,
});

export type AccountResponse = z.infer<typeof AccountResponseSchema>;

// Processed Response Schemas (for component compatibility)
export const BatchListResponseSchema = z.object({
  batches: z.array(BatchSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
});

export type BatchListResponse = z.infer<typeof BatchListResponseSchema>;

export const TransactionListResponseSchema = z.object({
  transactions: z.array(TransactionSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
  batchSummary: z.object({
    batch_id: z.string(),
    deposit_date: z.string(),
    deposit_amount: z.number(),
    settlement_currency: z.string(),
    transaction_count: z.number(),
  }).optional(),
});

export type TransactionListResponse = z.infer<typeof TransactionListResponseSchema>;

// API Error Schema
export const APIErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  timestamp: z.string(),
  path: z.string().optional(),
});

export type APIError = z.infer<typeof APIErrorSchema>;

// Request Parameter Schemas

export const BatchSearchParamsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  destinationId: z.string().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(5),
  sortBy: z.enum(['deposit_date', 'deposit_amount', 'batch_id']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type BatchSearchParams = z.infer<typeof BatchSearchParamsSchema>;

export const TransactionSearchParamsSchema = z.object({
  batchId: z.string().optional(), // Optional for reporting endpoint
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
  transactionType: z.enum(['+CC', '+ACH', '-ACH', 'all', 'checks']).optional(),
  searchTerm: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  currency: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  destinationId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type TransactionSearchParams = z.infer<typeof TransactionSearchParamsSchema>;

// API Configuration
export interface ValueIOConfig {
  apiKey: string;
  apiUser: string; // Changed from apiSecret to match Value.io auth
  baseUrl: string;
  accountId?: string; // Optional account ID for filtering
  timeout?: number;
  retryAttempts?: number;
  rateLimitRequests?: number;
  rateLimitWindowMs?: number;
}

// Cache Configuration
export interface CacheConfig {
  batchesTTL?: number;
  transactionsTTL?: number;
  destinationsTTL?: number;
}