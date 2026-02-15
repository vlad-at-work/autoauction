/**
 * Utilities for inquiry display and management
 */

/**
 * Get the short ID (first 6 characters) for display
 */
export function getShortId(id: string): string {
  return id.slice(0, 6).toUpperCase();
}

/**
 * Generate a consistent color based on the inquiry ID
 * Returns a tailwind-compatible color class
 */
export function getIdColorClass(id: string): { bg: string; text: string; border: string } {
  // Use first 6 chars to generate a hash
  const hash = id
    .slice(0, 6)
    .split('')
    .reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

  // Define color palette (tailwind classes)
  const colors = [
    { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-300' },
    { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
    { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' },
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
    { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
    { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-300' },
    { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  ];

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Generate a hex color from inquiry ID for inline styles
 */
export function getIdHexColor(id: string): string {
  const hash = id
    .slice(0, 6)
    .split('')
    .reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

  // Generate HSL with fixed saturation and lightness for consistent visibility
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

/**
 * Anonymize dealer name for display to other dealers
 */
export function anonymizeDealerName(index: number): string {
  return `Дилер ${String.fromCharCode(65 + (index % 26))}`; // Дилер A, Дилер B, etc.
}

/**
 * Format price with Russian locale
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('ru-RU');
}

/**
 * Format relative time in Russian
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays === 1) return 'вчера';
  return `${diffDays} дн. назад`;
}
