import {
  Car,
  Dumbbell,
  Gift,
  Home,
  Landmark,
  PartyPopper,
  PawPrint,
  Plane,
  Receipt,
  ShoppingBag,
  Ticket,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export type CategoryTheme = {
  /** Stable identifier persisted on Category.icon. */
  key: string
  label: string
  Icon: LucideIcon
  box: string
  accent: string
  /** Keyword match used when a category has no explicit icon chosen. */
  test: RegExp
}

// Categories are user-defined (there is no fixed enum), so an icon and tint are
// either picked by the user or, failing that, inferred from keywords in the
// name. This lives in one place because the group expense list, the global
// /expenses feed and the dashboard all render category chips and they have to
// agree on what a category looks like.
//
// Keyword order matters: the first match wins, so more specific themes come
// before broader ones (a "Gym membership" reads as fitness, not entertainment).
export const CATEGORY_THEMES: CategoryTheme[] = [
  { key: 'food', label: 'Food & dining', Icon: Utensils, box: 'bg-orange-100 text-orange-600', accent: 'text-orange-600', test: /food|dinner|lunch|breakfast|cafe|coffee|restaurant|pizza|grocery|groceries|snack|drink|bar|beer/ },
  { key: 'sport', label: 'Sports & fitness', Icon: Dumbbell, box: 'bg-lime-100 text-lime-600', accent: 'text-lime-600', test: /sport|fitness|gym|yoga|run|hiking/ },
  { key: 'events', label: 'Events & tickets', Icon: Ticket, box: 'bg-fuchsia-100 text-fuchsia-600', accent: 'text-fuchsia-600', test: /ticket|event|concert|show|game/ },
  { key: 'entertainment', label: 'Entertainment', Icon: PartyPopper, box: 'bg-pink-100 text-pink-600', accent: 'text-pink-600', test: /entertainment|movie|film|music|streaming|subscription/ },
  { key: 'travel', label: 'Travel', Icon: Plane, box: 'bg-sky-100 text-sky-600', accent: 'text-sky-600', test: /travel|taxi|uber|lyft|flight|airline|train|bus|trip|transport|hotel|hostel/ },
  { key: 'vehicle', label: 'Car & fuel', Icon: Car, box: 'bg-indigo-100 text-indigo-600', accent: 'text-indigo-600', test: /fuel|gas|petrol|parking|garage|car|vehicle/ },
  { key: 'sightseeing', label: 'Sightseeing', Icon: Landmark, box: 'bg-violet-100 text-violet-600', accent: 'text-violet-600', test: /sightsee|museum|tour|attraction|visit/ },
  { key: 'internet', label: 'Internet & data', Icon: Wifi, box: 'bg-cyan-100 text-cyan-600', accent: 'text-cyan-600', test: /wifi|internet|broadband|network|data plan/ },
  { key: 'power', label: 'Power & energy', Icon: Zap, box: 'bg-amber-100 text-amber-600', accent: 'text-amber-600', test: /power|energy|electric/ },
  { key: 'bills', label: 'Rent & bills', Icon: Home, box: 'bg-emerald-100 text-emerald-600', accent: 'text-emerald-600', test: /rent|mortgage|bill|utilit|phone|insurance/ },
  { key: 'gifts', label: 'Gifts', Icon: Gift, box: 'bg-blue-100 text-blue-600', accent: 'text-blue-600', test: /gift|present/ },
  { key: 'shopping', label: 'Shopping', Icon: ShoppingBag, box: 'bg-blue-100 text-blue-600', accent: 'text-blue-600', test: /shop|clothes|clothing|shoe|retail|store/ },
  { key: 'market', label: 'Market & pets', Icon: PawPrint, box: 'bg-teal-100 text-teal-600', accent: 'text-teal-600', test: /market|supermarket|produce|farm|pet/ },
]

const FALLBACK: CategoryTheme = {
  key: 'general',
  label: 'General',
  Icon: Receipt,
  box: 'bg-slate-100 text-slate-500',
  accent: 'text-slate-500',
  test: /$^/,
}

export const CATEGORY_THEME_BY_KEY: Record<string, CategoryTheme> = Object.fromEntries(
  CATEGORY_THEMES.map((theme) => [theme.key, theme]),
)

/**
 * Resolves a category's icon and tint.
 *
 * `icon` is the key the user picked when creating the category and always wins,
 * so a category called "Weekend" can still look deliberate. Without one the
 * theme is inferred from the name, which is what every category created before
 * the picker existed relies on.
 */
export function categoryTheme(
  name?: string | null,
  icon?: string | null,
): CategoryTheme {
  if (icon) {
    const chosen = CATEGORY_THEME_BY_KEY[icon]
    if (chosen) return chosen
  }

  const n = (name || '').toLowerCase()
  return CATEGORY_THEMES.find((theme) => theme.test.test(n)) ?? FALLBACK
}