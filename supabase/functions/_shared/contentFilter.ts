/**
 * Content filtering for AI chat to prevent prompt injection and sensitive data extraction
 */

// Patterns that indicate prompt injection attempts
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|earlier)\s+instructions?/i,
  /forget\s+(all\s+)?(previous|prior|earlier)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior|earlier)\s+instructions?/i,
  /new\s+instructions?:/i,
  /new\s+task:/i,
  /you\s+are\s+now/i,
  /act\s+as\s+if/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /roleplay\s+as/i,
  /simulate\s+(a|an|being)/i,
  /override\s+your/i,
  /bypass\s+your/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /do\s+anything\s+now/i,
  /repeat\s+(your\s+)?system\s+prompt/i,
  /what\s+(is|are)\s+your\s+(instructions?|system\s+prompt)/i,
  /tell\s+me\s+your\s+(instructions?|system\s+prompt)/i,
  /reveal\s+your\s+(instructions?|system\s+prompt)/i,
];

// Patterns attempting to extract sensitive data
const SENSITIVE_DATA_EXTRACTION_PATTERNS = [
  /show\s+me\s+(all\s+)?(user|email|password|wallet|api\s+key)/i,
  /list\s+(all\s+)?(user|email|password|wallet|api\s+key)/i,
  /give\s+me\s+(all\s+)?(user|email|password|wallet|api\s+key)/i,
  /what\s+(are|is)\s+(the\s+)?(user|email|password|wallet|api\s+key)/i,
  /database\s+schema/i,
  /SELECT\s+\*\s+FROM/i,
  /INSERT\s+INTO/i,
  /DROP\s+TABLE/i,
  /api\s+key/i,
  /secret\s+key/i,
  /access\s+token/i,
  /\.env/i,
  /environment\s+variable/i,
];

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s+/i,
  /UNION\s+SELECT/i,
  /--\s*$/,
  /\/\*.*\*\//,
  /'.*OR.*'.*'.*=/i,
  /".*OR.*".*".*=/i,
];

/**
 * Check if content contains prompt injection attempts
 */
export function containsPromptInjection(content: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Check if content attempts to extract sensitive data
 */
export function containsSensitiveDataExtraction(content: string): boolean {
  return SENSITIVE_DATA_EXTRACTION_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Check if content contains SQL injection attempts
 */
export function containsSQLInjection(content: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Comprehensive check for malicious content
 */
export function containsMaliciousContent(content: string): boolean {
  return (
    containsPromptInjection(content) ||
    containsSensitiveDataExtraction(content) ||
    containsSQLInjection(content)
  );
}

/**
 * Sanitize content by removing dangerous patterns
 */
export function sanitizeForAI(content: string): string {
  let sanitized = content;
  
  // Remove SQL-like syntax
  sanitized = sanitized.replace(/;\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s+/gi, '');
  sanitized = sanitized.replace(/UNION\s+SELECT/gi, '');
  sanitized = sanitized.replace(/--\s*$/gm, '');
  
  // Remove potential command injection
  sanitized = sanitized.replace(/`.*`/g, '');
  sanitized = sanitized.replace(/\$\(.*\)/g, '');
  
  return sanitized.trim();
}
