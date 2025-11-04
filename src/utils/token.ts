import { createHmac } from 'crypto';

const base64UrlEncode = (input: string): string =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const base64UrlDecode = (input: string): string => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  return Buffer.from(normalized + '='.repeat(padding), 'base64').toString();
};

interface TokenPayload {
  id: number;
  email: string;
  role: 'user' | 'admin';
  exp: number;
}

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET || process.env.APP_SECRET;
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }
  return secret;
};

export const generateToken = (
  payload: Omit<TokenPayload, 'exp'>,
  expiresInSeconds = 60 * 60 * 12 // 12 hours
): string => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const tokenPayload: TokenPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = createHmac('sha256', getSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = createHmac('sha256', getSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (expectedSignature !== signature) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Failed to verify token:', error);
    return null;
  }
};

export type { TokenPayload };
