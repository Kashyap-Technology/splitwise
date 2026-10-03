import { getInitials } from '@/lib/initials'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export type PersonAvatarTone = 'blue' | 'rose' | 'emerald' | 'slate' | 'amber'

const TONES: Record<PersonAvatarTone, string> = {
  blue: 'bg-blue-50 text-blue-600',
  rose: 'bg-rose-50 text-rose-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-500',
  amber: 'bg-amber-50 text-amber-600',
}

const SIZES = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
} as const

/**
 * Avatar for a person, with an initials fallback.
 *
 * Settlement screens need to answer "who am I paying?" at a glance, which means
 * every member has to render consistently wherever they appear. Sizing and tone
 * live here so a member looks the same in a balance row, a payer picker and a
 * settlement receipt instead of drifting apart per call site.
 */
export function PersonAvatar({
  name,
  src,
  size = 'md',
  tone = 'blue',
  ring = false,
  className,
}: {
  name?: string | null
  src?: string | null
  size?: keyof typeof SIZES
  tone?: PersonAvatarTone
  ring?: boolean
  className?: string
}) {
  return (
    <Avatar
      className={cn(
        SIZES[size],
        'border border-slate-100 shrink-0',
        ring && 'ring-2 ring-white',
        className,
      )}
    >
      {src ? <AvatarImage src={src} alt={name ?? 'User'} className="object-cover" /> : null}
      <AvatarFallback className={cn('font-bold', TONES[tone])}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}