/**
 * Token Security Utilities
 * Helper functions to prevent token exposure
 */

/**
 * Mask a token for safe logging (shows only first 4 and last 4 chars)
 */
export function maskToken(token: string | undefined): string {
  if (!token) {
    return '[no token]';
  }
  if (token.length <= 8) {
    return '[token]';
  }
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

/**
 * Sanitize error messages to remove any potential token leaks
 */
export function sanitizeErrorMessage(error: unknown, token?: string): string {
  let message = error instanceof Error ? error.message : String(error);

  // Remove any token patterns from error messages
  if (token) {
    message = message.replace(
      new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      '[REDACTED_TOKEN]'
    );
  }

  // Remove common token patterns
  message = message.replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_TOKEN]');
  message = message.replace(/github_pat_[a-zA-Z0-9_]{82}/g, '[REDACTED_TOKEN]');
  message = message.replace(/token\s+[a-zA-Z0-9_-]{20,}/gi, 'token [REDACTED_TOKEN]');

  return message;
}

/**
 * Safe logger that never logs tokens
 */
export function safeLog(message: string, token?: string): void {
  const sanitized = token
    ? message.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[TOKEN]')
    : message;
  console.log(sanitized);
}
