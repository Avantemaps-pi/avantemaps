/**
 * Extract initials from a user's name or username.
 * - Two-word names: first letter of each word (e.g. "Jane Doe" -> "JD")
 * - Single word: first letter only (e.g. "alice" -> "A")
 * - Returns "U" as a safe fallback.
 */
export function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const trimmed = name.trim();
  if (!trimmed) return 'U';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}
