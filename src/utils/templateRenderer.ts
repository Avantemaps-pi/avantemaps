import { NotificationMetadata } from '@/types/notification';

/**
 * Renders a notification template by replacing variables with actual values
 * @param template - The template string with {{variable}} placeholders
 * @param metadata - The metadata object containing variable values
 * @returns The rendered message with variables replaced
 */
export const renderTemplate = (
  template: string,
  metadata: NotificationMetadata = {}
): string => {
  let rendered = template;
  
  // Replace all {{variable}} placeholders with actual values from metadata
  const variableRegex = /\{\{(\w+)\}\}/g;
  
  rendered = rendered.replace(variableRegex, (match, variableName) => {
    const value = metadata[variableName as keyof NotificationMetadata];
    
    // If the value exists in metadata, use it; otherwise keep the placeholder
    if (value !== undefined && value !== null) {
      return String(value);
    }
    
    return match; // Keep original placeholder if no value found
  });
  
  return rendered;
};

/**
 * Extracts variable names from a template string
 * @param template - The template string with {{variable}} placeholders
 * @returns Array of variable names found in the template
 */
export const extractTemplateVariables = (template: string): string[] => {
  const variableRegex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = variableRegex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
};

/**
 * Validates that all required variables in a template are provided in metadata
 * @param template - The template string
 * @param metadata - The metadata object
 * @returns Object with isValid boolean and array of missing variables
 */
export const validateTemplateVariables = (
  template: string,
  metadata: NotificationMetadata
): { isValid: boolean; missingVariables: string[] } => {
  const requiredVariables = extractTemplateVariables(template);
  const missingVariables = requiredVariables.filter(
    (variable) => metadata[variable as keyof NotificationMetadata] === undefined
  );
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables,
  };
};
