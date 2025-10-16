/**
 * Secure Logger Utility
 * Prevents sensitive data from being logged to console
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const SENSITIVE_KEYS = [
  'password',
  'token',
  'accessToken',
  'access_token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'auth',
  'creditCard',
  'ssn',
  'walletAddress',
  'privateKey',
  'pi_wallet_address',
];

/**
 * Sanitizes an object by redacting sensitive fields
 */
function sanitize(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    return data.length > 100 ? `${data.substring(0, 100)}...[truncated]` : data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some(sensitive => 
        lowerKey.includes(sensitive.toLowerCase())
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Secure logger that sanitizes sensitive data before logging
 */
export const secureLog = {
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.info(`[INFO] ${message}`, data ? sanitize(data) : '');
    }
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data ? sanitize(data) : '');
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? sanitize(error) : '');
  },
  
  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, data ? sanitize(data) : '');
    }
  },
};
