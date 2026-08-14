import {
  Sparkles,
  Search,
  FileText,
  GitCompare,
  UserCheck,
  Activity as ActivityIcon,
  type LucideIcon,
} from 'lucide-react'
import { relativeTime } from '../lib/format'
import type { ActivityEvent } from '@/types/campaign'

/** A row in the Recent AI Activity ledger (UX Spec §6). */
const iconFor: Record<string, LucideIcon> = {
  search: Search,
  report: FileText,
  comparison: GitCompare,
  agent: Sparkles,
  ai_analysis: Sparkles,
  analysis: Sparkles,
  stage_change: UserCheck,
}

export function ActivityRow({ event }: { event: ActivityEvent }) {
  const Icon = iconFor[event.type] ?? ActivityIcon
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-hl-muted text-hl-fg-tertiary">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="hl-small min-w-0 flex-1 truncate text-hl-fg-secondary">{event.summary}</span>
      <span className="hl-caption shrink-0 text-hl-fg-tertiary">{relativeTime(event.created_at)}</span>
    </li>
  )
}
