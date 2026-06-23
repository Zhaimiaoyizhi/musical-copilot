"use client"

import { User, Heart, Package, Zap, ArrowRight, Check, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StateRecord, EntityType } from "@/types/project"
import { useProjectStore } from "@/lib/store/projectStore"
import { CardBase } from "./CardBase"
import { StatusBadge } from "@/components/shared/StatusBadge"

interface StateCardProps {
  card: StateRecord
  onEdit?: () => void
}

const ENTITY_CONFIG: Record<
  EntityType,
  { icon: React.ElementType; label: string; color: string }
> = {
  character: {
    icon: User,
    label: "角色",
    color: "text-[var(--track-character)]",
  },
  relationship: {
    icon: Heart,
    label: "关系",
    color: "text-[var(--color-conflict)]",
  },
  prop: {
    icon: Package,
    label: "道具",
    color: "text-[var(--gold-dim)]",
  },
  event: {
    icon: Zap,
    label: "事件",
    color: "text-[var(--track-event)]",
  },
}

export function StateCard({ card, onEdit }: StateCardProps) {
  const updateStateRecord = useProjectStore((s) => s.updateStateRecord)
  const entityConfig = ENTITY_CONFIG[card.entityType]
  const Icon = entityConfig.icon

  const handleConfirmToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newConfirmed = !card.confirmed
    updateStateRecord(card.id, {
      confirmed: newConfirmed,
      status: newConfirmed ? "confirmed" : "changed",
    })
  }

  const handleEnableToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateStateRecord(card.id, {
      enabled: !card.enabled,
      status: !card.enabled ? (card.confirmed ? "confirmed" : "draft") : "disabled",
    })
  }

  return (
    <CardBase
      status={card.enabled ? card.status : "disabled"}
      onClick={onEdit}
    >
      {/* Top row: entity type + name + scene label */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <Icon size={12} className={cn("shrink-0", entityConfig.color)} />
        <span className={cn("text-xs font-medium", entityConfig.color)}>
          {entityConfig.label}
        </span>
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          {card.entityName}
        </span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card-hover)] text-[var(--text-muted)] border border-[var(--border)] leading-none shrink-0">
          {card.sceneLabel}
        </span>
      </div>

      {/* Visible summary */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-2">
        {card.visibleSummary}
      </p>

      {/* Before → After flow */}
      <div className="flex items-start gap-1.5 mb-2 p-1.5 rounded-lg bg-[var(--bg-curtain)]/50 border border-[var(--border)]">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[var(--text-muted)] mb-0.5">前</p>
          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 leading-snug">
            {card.beforeState}
          </p>
        </div>
        <ArrowRight size={12} className="text-[var(--text-muted)] shrink-0 mt-3" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[var(--text-muted)] mb-0.5">后</p>
          <p className="text-[11px] text-[var(--color-confirm)] line-clamp-1 leading-snug">
            {card.afterState}
          </p>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={card.enabled ? card.status : "disabled"} />

        <div className="flex items-center gap-1">
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
