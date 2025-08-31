import { 
  ValueIOConfig, 
  ValueIOResponse,
  DestinationListResponse,
  AccountResponse,
  BatchListResponse, 
  TransactionListResponse,
  BatchSearchParams,
  TransactionSearchParams,
  DestinationListResponseSchema,
  AccountResponseSchema,
  BatchListResponseSchema,
  TransactionListResponseSchema,
  Batch,
  Transaction,
  Destination
} from '@/types/value-io';
import { format, parse, startOfDay, endOfDay, parseISO } from 'date-fns';

/**
 * Value.io Reporting Service
 * 
 * This service class handles Value.io reporting and analytics endpoints with:
 * - Destinations management for ProPay filtering
 * - Batch reporting from reporting endpoints
 * - Transaction reporting with comprehensive filtering
 * - Proper authentication and error handling
 * - Response caching and rate limiting
 * - TypeScript type safety throughout
 * 
 * Usage:
 * ```typescript
 * const service = ValueIOService.getInstance();
 * const destinations = await service.getProPayDestinations();
 * const batches = await service.getBatches({ page: 1, pageSize: 10 });
 * ```
 */
export class ValueIOService {
  private static instance: ValueIOService | null = null;
  private config: ValueIOConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxCacheSize = 1000; // Prevent memory leaks
  
  constructor(config?: Partial<ValueIOConfig>) {
    this.config = this.buildConfig(config);
    this.validateConfiguration();
    
    // Setup cache cleanup interval (every 5 minutes)
    if (typeof globalThis !== 'undefined' && typeof globalThis.setInterval === 'function') {
      setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
    }
  }

  /**
   * Get singleton instance of the ValueIOService
   */
  public static getInstance(config?: Partial<ValueIOConfig>): ValueIOService {
    if (!ValueIOService.instance) {
      ValueIOService.instance = new ValueIOService(config);
    }
    return ValueIOService.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    ValueIOService.instance = null;
  }

  /**
   * Build configuration with defaults and environment variables
   */
  private buildConfig(config?: Partial<ValueIOConfig>): ValueIOConfig {
    return {
      apiKey: process.env.VALUE_IO_API_KEY || '',
      apiUser: process.env.VALUE_IO_API_USER || '',
      baseUrl: process.env.VALUE_IO_BASE_URL || 'https://api.value.io/v1',
      accountId: process.env.VALUE_IO_ACCOUNT_ID || '',
      timeout: parseInt(process.env.VALUE_IO_API_TIMEOUT || '5000'), // Reduced timeout for development
      retryAttempts: parseInt(process.env.VALUE_IO_API_RETRY_ATTEMPTS || '3'),
      rateLimitRequests: parseInt(process.env.VALUE_IO_RATE_LIMIT_REQUESTS || '100'),
      rateLimitWindowMs: parseInt(process.env.VALUE_IO_RATE_LIMIT_WINDOW_MS || '60000'),
      ...config
    };
  }

  /**
   * Validate that required configuration is present
   */
  private validateConfiguration(): void {
    const errors: string[] = [];
    
    if (!this.config.apiKey) {
      errors.push('VALUE_IO_API_KEY is required');
    }
    if (!this.config.apiUser) {
      errors.push('VALUE_IO_API_USER is required');
    }
    if (!this.config.baseUrl) {
      errors.push('VALUE_IO_BASE_URL is required');
    }
    
    // Check for placeholder values
    if (this.config.apiUser === 'your-api-user-here' || this.config.apiKey === 'your-api-key-here') {
      errors.push('Please replace placeholder API credentials with real values');
    }
    
    // Log configuration for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Value.io API Configuration:', {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        hasApiUser: !!this.config.apiUser,
        hasApiKey: !!this.config.apiKey,
        apiUserPrefix: this.config.apiUser?.substring(0, 3) + '***'
      });
    }
    
    if (errors.length > 0) {
      throw new Error(`Value.io SDK Configuration Error: ${errors.join(', ')}`);
    }
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  /**
   * Get cached data if valid
   */
  private getCachedData<T>(key: string, ttl: number): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl * 1000) {
      this.log('debug', `Cache hit for key: ${key.substring(0, 50)}...`);
      return cached.data as T;
    }
    if (cached) {
      this.cache.delete(key);
      this.log('debug', `Cache expired for key: ${key.substring(0, 50)}...`);
    }
    return null;
  }

  /**
   * Set cached data with size limit protection
   */
  private setCachedData(key: string, data: any): void {
    // Implement LRU-style cache by removing oldest entries
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, { data, timestamp: Date.now() });
    this.log('debug', `Cached data for key: ${key.substring(0, 50)}...`);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      // Use a generous TTL for cleanup (1 hour)
      if (now - value.timestamp > 3600000) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      this.log('debug', `Cleaned up ${deletedCount} expired cache entries`);
    }
  }

  /**
   * Generate authentication headers
   */
  private getAuthHeaders(method: string = 'GET'): HeadersInit {
    const auth = Buffer.from(`${this.config.apiUser}:${this.config.apiKey}`).toString('base64');
    
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Authorization': `Basic ${auth}`,
      'User-Agent': `ValueIO-SDK/1.0.0`,
    };
    
    // Only add Content-Type for POST, PUT, PATCH requests, not for GET requests
    // This is because the Value.io API returns 500 errors when Content-Type is sent with GET requests
    if (method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowKey = 'global';
    const record = this.requestCounts.get(windowKey);
    
    if (!record || now > record.resetTime) {
      this.requestCounts.set(windowKey, {
        count: 1,
        resetTime: now + this.config.rateLimitWindowMs!
      });
      return true;
    }
    
    if (record.count >= this.config.rateLimitRequests!) {
      this.log('warn', `Rate limit exceeded: ${record.count}/${this.config.rateLimitRequests}`);
      return false;
    }
    
    record.count++;
    return true;
  }

  /**
   * Enhanced logging with different levels
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: 'ValueIOService',
      message,
      ...(meta && { meta })
    };
    
    // In development, log to console. In production, send to logging service
    if (process.env.NODE_ENV === 'development' || level === 'error') {
      const logMethod = level === 'error' ? console.error : 
                       level === 'warn' ? console.warn : 
                       level === 'info' ? console.info : console.debug;
      logMethod(`[${level.toUpperCase()}] ValueIOService: ${message}`, meta || '');
    }
    
    // TODO: In production, send to external logging service (e.g., DataDog, CloudWatch)
  }

  /**
   * Enhanced fetch with retry logic, timeout, and comprehensive error handling
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number = 0
  ): Promise<Response> {
    // Check rate limiting
    if (!this.checkRateLimit()) {
      throw new Error(`Rate limit exceeded. Max ${this.config.rateLimitRequests} requests per ${this.config.rateLimitWindowMs}ms`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.log('warn', `Request timeout after ${this.config.timeout}ms`, { url });
    }, this.config.timeout);

    const startTime = Date.now();
    
    try {
      this.log('debug', `Making request to ${url}`, { retry: retries, method: options.method });
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      this.log('debug', `Request completed`, { 
        url: url.replace(this.config.baseUrl, ''), 
        status: response.status, 
        duration: `${duration}ms`,
        retry: retries 
      });

      // Handle retryable errors
      if (!response.ok && retries < this.config.retryAttempts!) {
        const shouldRetry = this.shouldRetry(response.status);
        
        if (shouldRetry) {
          const delay = this.calculateBackoffDelay(retries);
          this.log('warn', `Request failed, retrying in ${delay}ms`, { 
            url: url.replace(this.config.baseUrl, ''), 
            status: response.status, 
            attempt: retries + 1 
          });
          
          await this.sleep(delay);
          return this.fetchWithRetry(url, options, retries + 1);
        }
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      
      if (retries < this.config.retryAttempts!) {
        const delay = this.calculateBackoffDelay(retries);
        this.log('warn', `Network error, retrying in ${delay}ms`, { 
          error: error instanceof Error ? error.message : String(error), 
          attempt: retries + 1,
          duration: `${duration}ms`
        });
        
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, retries + 1);
      }
      
      this.log('error', 'Request failed after all retries', { 
        error: error instanceof Error ? error.message : String(error),
        attempts: retries + 1,
        duration: `${duration}ms`
      });
      
      throw error;
    }
  }

  /**
   * Determine if a status code is retryable
   */
  private shouldRetry(status: number): boolean {
    return status >= 500 || status === 429 || status === 408;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse and handle API errors with detailed context
   */
  private async handleApiError(response: Response, context: string): Promise<never> {
    let errorDetails;
    
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = { 
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status 
      };
    }
    
    // Handle Value.io API error response structure
    let errorMessage: string;
    if (errorDetails.errors && Array.isArray(errorDetails.errors) && errorDetails.errors.length > 0) {
      // Extract errors from the errors array
      const firstError = errorDetails.errors[0];
      errorMessage = firstError.error || firstError.message || String(firstError);
    } else if (errorDetails.errors && typeof errorDetails.errors === 'object' && Object.keys(errorDetails.errors).length > 0) {
      // Extract errors from the errors object
      const firstError = Object.values(errorDetails.errors)[0];
      errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
    } else {
      errorMessage = errorDetails.message || 
                    errorDetails.error || 
                    `API request failed with status ${response.status}`;
    }
    
    this.log('error', `API Error in ${context}`, {
      status: response.status,
      statusText: response.statusText,
      errorDetails,
      url: response.url
    });
    
    // Create contextual error messages
    let contextualMessage = `${context}: ${errorMessage}`;
    
    if (response.status === 401) {
      contextualMessage = `Authentication failed for ${context}. Please check your VALUE_IO_API_USER and VALUE_IO_API_KEY`;
    } else if (response.status === 403) {
      contextualMessage = `Access denied for ${context}. Your API credentials may not have sufficient permissions`;
    } else if (response.status === 404) {
      contextualMessage = `Resource not found for ${context}. The requested endpoint or resource does not exist`;
    } else if (response.status === 429) {
      contextualMessage = `Rate limit exceeded for ${context}. Please slow down your requests`;
    } else if (response.status >= 500) {
      contextualMessage = `Server error for ${context}. Value.io API is experiencing issues`;
    }
    
    throw new Error(contextualMessage);
  }

  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================

  /**
   * Test API connectivity and credentials
   */
  public async testConnection(): Promise<{ 
    success: boolean; 
    message: string; 
    accountInfo?: any;
    performance?: {
      responseTime: number;
      endpoint: string;
    };
  }> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Testing Value.io API connection');
      
      const accountResponse = await this.getAccountInfo();
      const responseTime = Date.now() - startTime;
      
      this.log('info', 'Connection test successful', { responseTime: `${responseTime}ms` });
      
      return {
        success: true,
        message: 'Successfully connected to Value.io API',
        accountInfo: accountResponse.data.account,
        performance: {
          responseTime,
          endpoint: '/accounts'
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.log('error', 'Connection test failed', { 
        error: errorMessage, 
        responseTime: `${responseTime}ms` 
      });
      
      return {
        success: false,
        message: errorMessage,
        performance: {
          responseTime,
          endpoint: '/accounts'
        }
      };
    }
  }

  /**
   * Get account information
   */
  public async getAccountInfo(): Promise<ValueIOResponse<AccountResponse>> {
    const cacheKey = this.getCacheKey('account', {});
    const cacheTTL = parseInt(process.env.VALUE_IO_CACHE_TTL_ACCOUNT || '3600');
    
    const cached = this.getCachedData<ValueIOResponse<AccountResponse>>(cacheKey, cacheTTL);
    if (cached) {
      return cached;
    }

    const url = `${this.config.baseUrl}/accounts`;
    
    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: this.getAuthHeaders('GET'),
      });

      if (!response.ok) {
        await this.handleApiError(response, 'getAccountInfo');
      }

      const apiResponse: ValueIOResponse<any> = await response.json();
      
      // Handle the actual API response structure
      const data: ValueIOResponse<AccountResponse> = {
        ...apiResponse,
        data: {
          account: apiResponse.data // The API returns the account directly in data
        }
      };
      
      this.setCachedData(cacheKey, data);
      this.log('info', 'Account information retrieved successfully');
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch account information: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all destinations with proper pagination
   * Note: Value.io API has a maximum of 10 items per page for destinations
   */
  public async getDestinations(page = 1, perPage = 10): Promise<ValueIOResponse<DestinationListResponse>> {
    const cacheKey = this.getCacheKey('destinations', { page, perPage });
    const cacheTTL = parseInt(process.env.VALUE_IO_CACHE_TTL_DESTINATIONS || '3600');
    
    const cached = this.getCachedData<ValueIOResponse<DestinationListResponse>>(cacheKey, cacheTTL);
    if (cached) {
      return cached;
    }

    // Use correct pagination parameters for destinations endpoint
    const url = `${this.config.baseUrl}/destinations?per_page=${perPage}&page=${page}`;
    
    try {
      this.log('info', 'Fetching destinations from API', { url, page, perPage });
      
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: this.getAuthHeaders('GET'),
      });

      this.log('info', 'Got response from destinations API', { 
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        // Log the full response for debugging
        const errorText = await response.text();
        this.log('error', 'Destinations API error response', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Destinations API returned ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      this.log('info', 'Raw API response received', {
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200)
      });

      const apiResponse: ValueIOResponse<any> = JSON.parse(responseText);
      this.log('info', 'Parsed API response', {
        path: apiResponse.path,
        status: apiResponse.status,
        hasData: !!apiResponse.data,
        dataKeys: apiResponse.data ? Object.keys(apiResponse.data) : [],
        destinationCount: apiResponse.data?.destinations?.length || 0
      });
      
      // Handle the actual API response structure with destinations array in data
      const data: ValueIOResponse<DestinationListResponse> = {
        ...apiResponse,
        data: {
          destinations: apiResponse.data.destinations || []
        }
      };
      
      this.setCachedData(cacheKey, data);
      this.log('info', 'Destinations retrieved successfully', { 
        page,
        perPage,
        count: data.data.destinations?.length || 0,
        destinations: data.data.destinations?.map(d => ({ id: d.id, name: d.name, type: d.type }))
      });
      
      return data;
    } catch (error) {
      this.log('error', 'Error in getDestinations', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch destinations: ${error.message}`);
      }
      throw error;
    }
  }


  /**
   * Get only ProPay destinations (Gateway::VIOInstant)
   * Note: Value.io API has a maximum of 10 items per page for destinations
   */
  public async getProPayDestinations(page = 1, perPage = 10): Promise<ValueIOResponse<DestinationListResponse>> {
    const allDestinations = await this.getDestinations(page, perPage);
    
    // Filter for ProPay destinations only
    const proPayDestinations = allDestinations.data.destinations?.filter(
      dest => dest.type === 'Gateway::VIOInstant'
    ) || [];
    
    this.log('info', 'ProPay destinations filtered', { 
      page,
      perPage,
      total: allDestinations.data.destinations?.length || 0,
      proPay: proPayDestinations.length 
    });
    
    return {
      ...allDestinations,
      data: {
        destinations: proPayDestinations
      }
    };
  }


  /**
   * Get batches using correct Value.io API endpoint
   */
  public async getBatches(params: BatchSearchParams): Promise<BatchListResponse> {
    const cacheKey = this.getCacheKey('batches', params);
    const cacheTTL = parseInt(process.env.VALUE_IO_CACHE_TTL_BATCHES || '300');
    
    const cached = this.getCachedData<BatchListResponse>(cacheKey, cacheTTL);
    if (cached) {
      return cached;
    }

    try {
      // First, get destinations to find the correct destination ID
      let destinationId = params.destinationId;
      if (!destinationId) {
        this.log('info', 'No destination ID provided, fetching ProPay destinations');
        const destinations = await this.getProPayDestinations();
        const firstDestination = destinations.data.destinations?.[0];
        if (!firstDestination) {
          throw new Error('No ProPay destinations found');
        }
        destinationId = firstDestination.identifier;
        this.log('info', 'Using first ProPay destination', { destinationId });
      }


      this.log('info', 'Fetching batches using correct API endpoint', { 
        destinationId,
        params 
      });
      
      // Format dates to MM-DD-YYYY as required by the API
      const formatDateForAPI = (dateStr: string): string => {
        const date = new Date(dateStr);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
      };

      // Default date range if not provided (last 30 days)
      const endDate = params.endDate ? formatDateForAPI(params.endDate) : 
                      format(new Date(), 'MM-dd-yyyy');
      const startDate = params.startDate ? formatDateForAPI(params.startDate) : 
                        format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'MM-dd-yyyy');

      // Calculate offset from page and pageSize
      const limit = params.pageSize;
      const offset = (params.page - 1) * params.pageSize;

      // Use correct batch endpoint: /destinations/{identifier}/batch
      const url = `${this.config.baseUrl}/destinations/${destinationId}/batch?begin_date=${startDate}&end_date=${endDate}&limit=${limit}&offset=${offset}`;
      
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: this.getAuthHeaders('GET'),
      });

      if (!response.ok) {
        await this.handleApiError(response, 'getBatches');
      }

      const apiResponse: ValueIOResponse<any> = await response.json();
      // Handle the actual API response structure - batches might be directly in data or nested
      const allBatches = apiResponse.data.batches || apiResponse.data || [];
      
      // Apply sorting if needed (API might not support all sort options)
      let filteredBatches = this.sortBatches(allBatches, params);
      
      const responseData: BatchListResponse = {
        batches: filteredBatches,
        total: filteredBatches.length, // Note: API pagination may provide total count differently
        page: params.page,
        pageSize: params.pageSize,
        hasMore: filteredBatches.length === params.pageSize, // Assume more if we got a full page
      };
      
      this.setCachedData(cacheKey, responseData);
      this.log('info', 'Batches retrieved using correct API endpoint', { 
        destinationId,
        startDate,
        endDate,
        limit,
        offset,
        returned: filteredBatches.length 
      });
      
      return responseData;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch batches: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get transactions for a specific batch
   */
  public async getBatchTransactions(batchId: string, params?: Partial<TransactionSearchParams>): Promise<TransactionListResponse> {
    const searchParams: TransactionSearchParams = {
      batchId,
      page: 1,
      pageSize: 10,
      ...params
    };
    
    return this.getTransactions(searchParams);
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================




  /**
   * Get transactions using correct Value.io API endpoint
   */
  public async getTransactions(params: TransactionSearchParams): Promise<TransactionListResponse> {
    const cacheKey = this.getCacheKey('transactions', params);
    const cacheTTL = parseInt(process.env.VALUE_IO_CACHE_TTL_TRANSACTIONS || '600');
    
    const cached = this.getCachedData<TransactionListResponse>(cacheKey, cacheTTL);
    if (cached) {
      return cached;
    }

    try {
      // Require both destination ID and batch ID for the correct endpoint
      let destinationId = params.destinationId;
      const batchId = params.batchId;
      
      if (!batchId) {
        throw new Error('Batch ID is required for fetching transactions');
      }
      
      // Validate batch ID format - Value.io uses numeric batch IDs or MongoDB ObjectIds
      // Valid formats: numeric (e.g., "164349502") or 24-char hex ObjectId
      const isNumeric = /^\d+$/.test(batchId);
      const isObjectId = /^[a-f0-9]{24}$/i.test(batchId);
      
      if (!isNumeric && !isObjectId) {
        throw new Error(`Invalid batch ID format: ${batchId}`);
      }
      
      if (!destinationId) {
        this.log('info', 'No destination ID provided, fetching ProPay destinations');
        const destinations = await this.getProPayDestinations();
        const firstDestination = destinations.data.destinations?.[0];
        if (!firstDestination) {
          throw new Error('No ProPay destinations found');
        }
        destinationId = firstDestination.identifier;
        this.log('info', 'Using first ProPay destination', { destinationId });
      }


      this.log('info', 'Fetching transactions using correct API endpoint', { 
        destinationId,
        batchId,
        params 
      });
      
      // Calculate offset from page and pageSize
      const limit = params.pageSize;
      const offset = (params.page - 1) * params.pageSize;

      // Use correct transactions endpoint: /destinations/{identifier}/transactions/{batchId}
      const url = `${this.config.baseUrl}/destinations/${destinationId}/transactions/${batchId}?limit=${limit}&offset=${offset}`;
      
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: this.getAuthHeaders('GET'),
      });

      if (!response.ok) {
        await this.handleApiError(response, 'getTransactions');
      }

      const apiResponse: ValueIOResponse<any> = await response.json();
      // Handle the actual API response structure - transactions might be directly in data or nested
      let allTransactions = apiResponse.data.transactions || apiResponse.data || [];
      
      // Apply client-side filters (API may not support all filters)
      let filteredTransactions = this.filterTransactions(allTransactions, params);
      
      // Apply sorting
      filteredTransactions = this.sortTransactions(filteredTransactions, params);
      
      // Create batch summary if batch ID provided
      const batchSummary = this.createBatchSummary(batchId, allTransactions);
      
      const responseData: TransactionListResponse = {
        transactions: filteredTransactions,
        total: filteredTransactions.length,
        page: params.page,
        pageSize: params.pageSize,
        hasMore: filteredTransactions.length === params.pageSize, // Assume more if we got a full page
        batchSummary,
      };
      
      this.setCachedData(cacheKey, responseData);
      this.log('info', 'Transactions retrieved using correct API endpoint', { 
        destinationId,
        batchId,
        limit,
        offset,
        returned: filteredTransactions.length 
      });
      
      return responseData;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }
      throw error;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================



  /**
   * Determine batch status from transactions
   */
  private determineBatchStatus(transactions: Transaction[] = []): 'pending' | 'processing' | 'completed' | 'failed' {
    if (transactions.length === 0) return 'completed';
    
    const hasSettlement = transactions.some(t => t.transaction_type === '-CK' || t.net_amount < 0);
    const hasPositiveTransactions = transactions.some(t => t.net_amount > 0);
    
    if (hasSettlement && hasPositiveTransactions) return 'completed';
    if (hasPositiveTransactions && !hasSettlement) return 'processing';
    return 'pending';
  }

  /**
   * Filter batches by date range
   */
  private filterBatchesByDate(batches: Batch[], params: BatchSearchParams): Batch[] {
    if (!params.startDate && !params.endDate) {
      return batches;
    }
    
    return batches.filter(batch => {
      const batchDate = parse(batch.deposit_date, 'MM-dd-yyyy', new Date());
      
      if (params.startDate) {
        const startDate = parseISO(params.startDate);
        if (batchDate < startDate) return false;
      }
      
      if (params.endDate) {
        const endDate = parseISO(params.endDate);
        if (batchDate > endDate) return false;
      }
      
      return true;
    });
  }

  /**
   * Sort batches
   */
  private sortBatches(batches: Batch[], params: BatchSearchParams): Batch[] {
    const sortBy = params.sortBy || 'deposit_date';
    const sortOrder = params.sortOrder || 'desc';
    
    return [...batches].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'deposit_date':
          const dateA = parse(a.deposit_date, 'MM-dd-yyyy', new Date());
          const dateB = parse(b.deposit_date, 'MM-dd-yyyy', new Date());
          compareValue = dateA.getTime() - dateB.getTime();
          break;
        case 'deposit_amount':
          compareValue = a.deposit_amount - b.deposit_amount;
          break;
        case 'batch_id':
          compareValue = String(a.batch_id).localeCompare(String(b.batch_id));
          break;
      }
      
      return sortOrder === 'desc' ? -compareValue : compareValue;
    });
  }

  /**
   * Paginate batches
   */
  private paginateBatches(batches: Batch[], params: BatchSearchParams): Batch[] {
    const startIndex = (params.page - 1) * params.pageSize;
    const endIndex = startIndex + params.pageSize;
    return batches.slice(startIndex, endIndex);
  }

  /**
   * Filter transactions
   */
  private filterTransactions(transactions: Transaction[], params: TransactionSearchParams): Transaction[] {
    let filtered = transactions;
    
    // Filter out check-related types by default unless specifically requested
    const checkTypes = ['-CK', 'PCK', '+CK', 'PCK+'];
    
    if (params.transactionType && params.transactionType !== 'all') {
      // If a specific type is selected, only show that type
      filtered = filtered.filter(transaction => {
        const type = transaction.transaction_type;
        switch (params.transactionType) {
          case '+CC': return type === '+SP' || type === '+CC';
          case '+ACH': return type === '+ACH' || type === '+EW';
          case '-ACH': return type === '-ACH';
          case 'checks': return checkTypes.includes(type); // New option to show only check types
          default: return type === params.transactionType;
        }
      });
    } else {
      // By default (when 'all' is selected or no type specified), exclude check types
      filtered = filtered.filter(transaction => !checkTypes.includes(transaction.transaction_type));
    }
    
    if (params.searchTerm) {
      const searchTerm = params.searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => {
        return transaction.payer_name.toLowerCase().includes(searchTerm) ||
               transaction.invoice_number.toLowerCase().includes(searchTerm) ||
               transaction.gateway_transaction_id?.toLowerCase().includes(searchTerm) ||
               transaction.transaction_number.toString().includes(searchTerm);
      });
    }
    
    if (params.minAmount !== undefined) {
      filtered = filtered.filter(t => Math.abs(t.authorization_amount) >= params.minAmount!);
    }
    
    if (params.maxAmount !== undefined) {
      filtered = filtered.filter(t => Math.abs(t.authorization_amount) <= params.maxAmount!);
    }
    
    if (params.currency) {
      filtered = filtered.filter(t => t.authorization_currency === params.currency);
    }
    
    return filtered;
  }

  /**
   * Sort transactions
   */
  private sortTransactions(transactions: Transaction[], params: TransactionSearchParams): Transaction[] {
    const sortOrder = params.sortOrder || 'desc';
    
    return [...transactions].sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }

  /**
   * Paginate transactions
   */
  private paginateTransactions(transactions: Transaction[], params: TransactionSearchParams): Transaction[] {
    const startIndex = (params.page - 1) * params.pageSize;
    const endIndex = startIndex + params.pageSize;
    return transactions.slice(startIndex, endIndex);
  }

  /**
   * Create batch summary from transactions
   */
  private createBatchSummary(batchId: string, transactions: Transaction[]): any {
    return {
      batch_id: batchId,
      deposit_date: transactions[0]?.fund_date?.split(' ')[0] || new Date().toISOString().split('T')[0],
      deposit_amount: transactions
        .filter(t => t.net_amount > 0)
        .reduce((sum, t) => sum + t.net_amount, 0),
      settlement_currency: transactions[0]?.settlement_currency || 'USD',
      transaction_count: transactions.length,
    };
  }

  // =============================================================================
  // CACHE MANAGEMENT
  // =============================================================================

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear();
    this.log('info', 'All cache cleared');
  }

  /**
   * Clear cache for specific endpoint
   */
  public clearCacheForEndpoint(endpoint: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.startsWith(endpoint)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.log('info', `Cache cleared for endpoint: ${endpoint}`, { deletedKeys: keysToDelete.length });
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    totalEntries: number;
    memoryUsage: string;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    let oldestTime = Date.now();
    let newestTime = 0;
    
    this.cache.forEach(value => {
      if (value.timestamp < oldestTime) oldestTime = value.timestamp;
      if (value.timestamp > newestTime) newestTime = value.timestamp;
    });
    
    return {
      totalEntries: this.cache.size,
      memoryUsage: `~${Math.round(JSON.stringify([...this.cache.values()]).length / 1024)}KB`,
      oldestEntry: this.cache.size > 0 ? new Date(oldestTime) : null,
      newestEntry: this.cache.size > 0 ? new Date(newestTime) : null,
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Get the singleton instance of ValueIOService
 * This ensures consistent configuration and caching across the application
 */
export function getValueIOService(config?: Partial<ValueIOConfig>): ValueIOService {
  return ValueIOService.getInstance(config);
}

/**
 * Create a new instance of ValueIOService (for testing or special use cases)
 */
export function createValueIOService(config?: Partial<ValueIOConfig>): ValueIOService {
  return new ValueIOService(config);
}

export default ValueIOService;
