"use client"

import { Globe, MapPin, Scale, Clock, Shield, Check, EyeOff, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorldBookCard, WorldBookCardType } from "@/types/project"
import { useProjectStore } from "@/lib/store/projectStore"
import { useUIStore } from "@/lib/store/uiStore"
import { CardBase } from "./CardBase"
import { StatusBadge } from "@/components/shared/StatusBadge"

interface WorldbookCardProps {
  card: WorldBookCard
  onEdit?: () => void
}

const TYPE_CONFIG: Record<
  WorldBookCardType,
  { icon: React.ElementType; label: string; color: string }
> = {
  background: {
    icon: Globe,
    label: "背景",
    color: "text-[var(--color-draft)]",
  },
  time_place: {
    icon: MapPin,
    label: "时地",
    color: "text-[var(--track-scene)]",
  },
  rule: {
    icon: Scale,
    label: "规则",
    color: "text-[var(--gold-dim)]",
  },
  prestory: {
    icon: Clock,
    label: "前史",
    color: "text-[var(--track-character)]",
  },
  hard_constraint: {
    icon: Shield,
    label: "约束",
    color: "text-[var(--color-conflict)]",
  },
}

export function WorldbookCard({ card, onEdit }: WorldbookCardProps) {
  const updateWorldbookCard = useProjectStore((s) => s.updateWorldbookCard)
  const calledAssetIds = useUIStore((s) => s.calledAssetIds)
  const isHighlighted = calledAssetIds.includes(card.id)

  const typeConfig = TYPE_CONFIG[card.type]
  const Icon = typeConfig.icon

  const handleConfirmToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newConfirmed = !card.confirmed
    updateWorldbookCard(card.id, {
      confirmed: newConfirmed,
      status: newConfirmed ? "confirmed" : "changed",
    })
  }

  const handleEnableToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateWorldbookCard(card.id, {
      enabled: !card.enabled,
      status: !card.enabled ? (card.confirmed ? "confirmed" : "draft") : "disabled",
    })
  }

  return (
    <CardBase
      status={card.enabled ? card.status : "disabled"}
      isHighlighted={isHighlighted}
      onClick={onEdit}
      data-card-id={card.id}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon size={12} className={cn("shrink-0", typeConfig.color)} />
          <span className={cn("text-xs font-medium", typeConfig.color)}>
            {typeConfig.label}
          </span>
          {card.constraintLevel === "hard" && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--color-conflict)]/15 text-[var(--color-conflict)] font-medium leading-none">
              硬约束
            </span>
          )}
        </div>

        {/* Highlighted indicator */}
        {isHighlighted && (
          <span className="text-[10px] text-[var(--gold)] font-medium animate-pulse shrink-0">
            已调用
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-[var(--gold)] leading-snug mb-1 line-clamp-1">
        {card.title}
      </p>

      {/* Summary */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-2">
        {card.summary}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={card.enabled ? card.status : "disabled"} />

        <div className="flex items-center gap-1">
          {/* Confirm toggle */}
          <button
            onClick={handleConfirmToggle}
            title={card.confirmed ? "取消确认" : "确认"}
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center transition-all",
              "hover:bg-[var(--bg-card-hover)]",
              card.confirmed
                ? "text-[var(--color-confirm)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Check size={12} />
          </button>

          {/* Enable toggle */}
          <button
            onClick={handleEnableToggle}
            title={card.enabled ? "禁用" : "启用"}
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center transition-all",
              "hover:bg-[var(--bg-card-hover)]",
              card.enabled
                ? "text-[var(--text-secondary)] hover:text-[var(--color-warning)]"
                : "text-[var(--text-muted)]"
            )}
          >
            {card.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        </div>
      </div>
    </CardBase>
  )
}
