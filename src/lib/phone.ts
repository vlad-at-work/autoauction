/**
 * Shared phone number utilities
 */

/**
 * Normalize phone number to 11-digit Russian format (7XXXXXXXXXX).
 * - Strips non-digit characters (including + prefix)
 * - Converts 8xxx to 7xxx
 * - Adds 7 prefix to 10-digit numbers
 * Returns null if the number cannot be normalized.
 */
export function normalizePhone(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.trim().replace(/\D/g, '');

  // If it was +7 or 7, keep as is. If it starts with 8, convert to 7
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.slice(1);
  }

  // If it's 10 digits, assume Russian number and add 7
  if (cleaned.length === 10) {
    cleaned = '7' + cleaned;
  }

  // Validate: should be 11 digits starting with 7
  if (cleaned.length !== 11 || !cleaned.startsWith('7')) {
    return null;
  }

  return cleaned;
}
