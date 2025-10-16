
// A list of inappropriate words and patterns to filter
const inappropriateWords = [
  // Common profanity (basic list - expand as needed)
  'damn', 'hell', 'crap', 'bastard', 'bitch', 'ass',
  // Add more as needed
];

// SQL injection patterns to detect
const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
  /(--|\;|\/\*|\*\/)/g,
  /(\bOR\b.*=.*)/gi,
  /(\bUNION\b.*\bSELECT\b)/gi,
];

// Prompt injection patterns
const promptInjectionPatterns = [
  /ignore\s+(previous|all|above)\s+(instructions|prompts|rules)/gi,
  /forget\s+(everything|all|previous)/gi,
  /you\s+are\s+now/gi,
  /new\s+(instructions|role|task)/gi,
  /system\s*:/gi,
];

// Sensitive data extraction attempts
const sensitiveDataPatterns = [
  /show\s+me\s+(the\s+)?(database|schema|table|user|email|password)/gi,
  /what\s+(is|are)\s+.*\s*(email|password|api\s*key|token|secret)/gi,
  /give\s+me\s+(user|admin|database)/gi,
];

/**
 * Filter inappropriate content from a string
 * @param content The content to filter
 * @returns Filtered content with inappropriate words replaced by asterisks
 */
export const filterInappropriateContent = (content: string): string => {
  if (!content) return content;
  
  let filteredContent = content;
  
  // Simple implementation that replaces inappropriate words with asterisks
  inappropriateWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filteredContent = filteredContent.replace(regex, '*'.repeat(word.length));
  });
  
  return filteredContent;
};

/**
 * Check if content contains inappropriate language
 * @param content The content to check
 * @returns Boolean indicating if inappropriate content was found
 */
export const containsInappropriateContent = (content: string): boolean => {
  if (!content) return false;
  
  // Check if any inappropriate words are present
  const hasInappropriateWords = inappropriateWords.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    return regex.test(content);
  });
  
  if (hasInappropriateWords) return true;
  
  // Check for SQL injection attempts
  const hasSQLInjection = sqlInjectionPatterns.some(pattern => pattern.test(content));
  if (hasSQLInjection) return true;
  
  // Check for prompt injection attempts
  const hasPromptInjection = promptInjectionPatterns.some(pattern => pattern.test(content));
  if (hasPromptInjection) return true;
  
  // Check for sensitive data extraction attempts
  const hasSensitiveDataAttempt = sensitiveDataPatterns.some(pattern => pattern.test(content));
  if (hasSensitiveDataAttempt) return true;
  
  return false;
};

/**
 * Check if content is safe to send to AI
 * @param content The content to check
 * @returns Boolean indicating if content is safe
 */
export const isSafeForAI = (content: string): boolean => {
  return !containsInappropriateContent(content);
};
