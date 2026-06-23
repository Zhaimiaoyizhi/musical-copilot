"use client"

import { cn } from "@/lib/utils"
import type { AssetStatus } from "@/types/project"

interface StatusBadgeProps {
  status: AssetStatus
  className?: string
}

const STATUS_CONFIG: Record<
  AssetStatus,
  { dot: string; label: string; bg: string; text: string; pulse?: boolean }
> = {
  draft: {
    dot: "bg-[var(--color-draft)]",
    label: "草稿",
    bg: "bg-[var(--color-draft)]/10",
    text: "text-[var(--color-draft)]",
  },
  confirmed: {
    dot: "bg-[var(--color-confirm)]",
    label: "已确认",
    bg: "bg-[var(--color-confirm)]/10",
    text: "text-[var(--color-confirm)]",
  },
  changed: {
    dot: "bg-[var(--color-warning)]",
    label: "已修改",
    bg: "bg-[var(--color-warning)]/10",
    text: "text-[var(--color-warning)]",
  },
  conflict: {
    dot: "bg-[var(--color-conflict)]",
    label: "冲突",
    bg: "bg-[var(--color-conflict)]/10",
    text: "text-[var(--color-conflict)]",
    pulse: true,
  },
  disabled: {
    dot: "bg-[var(--text-muted)]",
    label: "已禁用",
    bg: "bg-[var(--text-muted)]/10",
    text: "text-[var(--text-muted)]",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          config.dot,
          config.pulse && "animate-pulse"
        )}
      />
      {config.label}
    </span>
  )
}
