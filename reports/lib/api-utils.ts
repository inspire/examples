import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { APIError } from '@/types/value-io';

export class APIResponse {
  static success<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(data, { status });
  }

  static error(error: string, message: string, status: number = 500): NextResponse {
    const apiError: APIError = {
      error,
      message,
      statusCode: status,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(apiError, { status });
  }

  static validationError(error: ZodError): NextResponse {
    const firstError = error.errors[0];
    return APIResponse.error(
      'VALIDATION_ERROR',
      `${firstError.path.join('.')}: ${firstError.message}`,
      400
    );
  }

  static unauthorized(message: string = 'Unauthorized'): NextResponse {
    return APIResponse.error('UNAUTHORIZED', message, 401);
  }

  static notFound(resource: string): NextResponse {
    return APIResponse.error('NOT_FOUND', `${resource} not found`, 404);
  }

  static rateLimited(retryAfter?: number): NextResponse {
    const response = APIResponse.error(
      'RATE_LIMITED',
      'Too many requests. Please try again later.',
      429
    );
    
    if (retryAfter) {
      response.headers.set('Retry-After', retryAfter.toString());
    }
    
    return response;
  }
}

export function parseQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  const searchParams = request.nextUrl.searchParams;
  const params: Record<string, any> = {};
  
  searchParams.forEach((value, key) => {
    // Handle numeric values
    if (key === 'page' || key === 'pageSize' || key === 'minAmount' || key === 'maxAmount') {
      const num = Number(value);
      if (!isNaN(num)) {
        params[key] = num;
      }
    } else {
      params[key] = value;
    }
  });
  
  return schema.parse(params);
}

export function validateDateRange(startDate?: string, endDate?: string): void {
  if (!startDate || !endDate) return;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 0) {
    throw new Error('End date must be after start date');
  }
  
  if (daysDiff > 90) {
    throw new Error('Date range cannot exceed 90 days');
  }
}

export function sanitizePII(data: any): any {
  if (typeof data === 'string') {
    // Check if it looks like a credit card number
    if (/^\d{13,19}$/.test(data)) {
      return data.substring(0, 6) + '******' + data.substring(data.length - 4);
    }
    // Check if it looks like an SSN
    if (/^\d{3}-?\d{2}-?\d{4}$/.test(data)) {
      return '***-**-' + data.substring(data.length - 4);
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizePII(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'payer_name') {
        // Keep only first letter of first name and full last name
        const names = (value as string).split(' ');
        if (names.length > 1) {
          sanitized[key] = names[0][0] + '*** ' + names[names.length - 1];
        } else {
          sanitized[key] = names[0][0] + '***';
        }
      } else if (key === 'card_number' || key === 'account_number') {
        const val = value as string;
        sanitized[key] = '****' + val.substring(val.length - 4);
      } else {
        sanitized[key] = sanitizePII(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitStore[identifier];
  
  if (!record || now > record.resetTime) {
    rateLimitStore[identifier] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `${ip}:${userAgent}`;
}

export async function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<NextResponse> {
  try {
    const result = await handler();
    return APIResponse.success(result);
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof ZodError) {
      return APIResponse.validationError(error);
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return APIResponse.unauthorized(error.message);
      }
      
      if (error.message.includes('not found')) {
        return APIResponse.notFound(error.message.replace(' not found', ''));
      }
      
      return APIResponse.error('INTERNAL_ERROR', error.message);
    }
    
    return APIResponse.error('UNKNOWN_ERROR', 'An unexpected error occurred');
  }
}

export function logAPIRequest(
  method: string,
  path: string,
  params?: any,
  userId?: string
): void {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    method,
    path,
    params: sanitizePII(params),
    userId,
  };
  
  // In production, send to proper logging service
  if (process.env.NODE_ENV === 'development') {
    console.log('API Request:', log);
  }
}

export function generateMockData<T>(
  schema: ZodSchema<T>,
  count: number = 10
): T[] {
  // This is a placeholder for mock data generation
  // In practice, you'd use a library like faker.js
  const results: T[] = [];
  
  for (let i = 0; i < count; i++) {
    // Create mock data based on schema
    // This is simplified - real implementation would analyze the schema
    results.push({} as T);
  }
  
  return results;
}