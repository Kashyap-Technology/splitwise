import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useTheme, type Theme } from '@/features/theme/ThemeProvider'

const OPTIONS: Array<{
  value: Theme
  label: string
  Icon: typeof Sun
}> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

/**
 * Appearance picker.
 *
 * Three states rather than a two-way toggle, because "follow the OS" is the only
 * option that stays correct when someone switches their laptop between a lit
 * room and a dark one.
 */
export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme()

  // Shows what is happening now: the system icon when the OS is driving it.
  const Current = theme === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 h-9 px-2 mb-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900"
            aria-label={`Appearance: ${theme}`}
          />
        }
      >
        <Current className="w-4 h-4 shrink-0" />
        <span>
          {theme === 'system' ? 'System' : resolved === 'dark' ? 'Dark' : 'Light'}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-40" align="start" side="top">
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="gap-2 cursor-pointer"
          >
            <Icon className="w-4 h-4 text-slate-500" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}