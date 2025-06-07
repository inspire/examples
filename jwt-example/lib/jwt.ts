import jwt from 'jsonwebtoken';

export interface JWTPayload {
  api_key: string;
  expires_at: number;
  duration?: string;
}

export function createJWT(payload: JWTPayload): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export function isTokenExpired(payload: JWTPayload): boolean {
  return Math.floor(Date.now() / 1000) > payload.expires_at;
}
