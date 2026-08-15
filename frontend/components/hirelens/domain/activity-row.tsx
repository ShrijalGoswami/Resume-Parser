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
      {/*
        Up to three lines below `sm`, one line above it.

        The row is icon + summary + timestamp on a single line, which leaves the
        summary 199px at 390 — 5 of 8 entries were cut, the worst showing 199 of
        the 416px it needed ("Summarise the Senior Backend Engineer pipelin…").
        A feed you cannot read is decoration.

        Three rather than two because two still cut the longest entry (60px of
        text into a 40px box). The clamp is a ceiling, not a fixed height, so
        this costs nothing on the rows that do not need it: measured at 390,
        short entries stay 40px, most grow to 56px, and only the longest reaches
        76px. It also bounds the damage a pathologically long summary can do.

        `line-clamp-1` rather than `truncate` at `sm` and up: both render one
        line with an ellipsis, but `truncate` sets `white-space: nowrap`, which
        would fight the clamp's `-webkit-box` display rather than replace it.
        Nothing truncates at `sm`+ anyway (0 of 8 rows at 768 and wider), so
        that branch is visually identical to what it replaced.
      */}
      <span className="hl-small line-clamp-3 min-w-0 flex-1 text-hl-fg-secondary sm:line-clamp-1">
        {event.summary}
      </span>
      <span className="hl-caption shrink-0 text-hl-fg-tertiary">{relativeTime(event.created_at)}</span>
    </li>
  )
}
