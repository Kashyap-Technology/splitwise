/**
 * Two-letter monogram for an avatar fallback.
 *
 * Handles the shapes that actually show up in this app: null, empty string,
 * single names ("Prince"), and names with extra or missing whitespace. Returns
 * "?" when there is nothing to build from so the avatar never renders empty.
 */
export const getInitials = (name?: string | null): string => {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return "?"

  return parts
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Coerces anything the API might hand us into a finite number. Balances arrive
 * as Decimals (strings), numbers, or occasionally null depending on which
 * endpoint produced them, and NaN silently poisons every downstream sum.
 */
export const parseNum = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 0
  const n = typeof value === "number" ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

export const money = (value: number): string =>
  Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })