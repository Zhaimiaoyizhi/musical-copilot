"use client"

import { Check, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CharacterCard, RoleType } from "@/types/project"
import { useProjectStore } from "@/lib/store/projectStore"
import { useUIStore } from "@/lib/store/uiStore"
import { CardBase } from "./CardBase"
import { StatusBadge } from "@/components/shared/StatusBadge"

interface CharacterCardProps {
  card: CharacterCard
  onEdit?: () => void
}

const ROLE_LABEL: Record<RoleType, string> = {
  protagonist: "主角",
  rival: "对手",
  ally: "盟友",
  mentor: "导师",
  ensemble: "群像",
}

const ROLE_COLOR: Record<RoleType, string> = {
  protagonist: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  rival: "bg-[var(--color-conflict)]/15 text-[var(--color-conflict)]",
  ally: "bg-[var(--track-scene)]/20 text-[var(--track-scene)]",
  mentor: "bg-[var(--gold-dim)]/15 text-[var(--gold-dim)]",
  ensemble: "bg-[var(--track-character)]/15 text-[var(--track-character)]",
}

export function CharacterCard({ card, onEdit }: CharacterCardProps) {
  const updateCharacterCard = useProjectStore((s) => s.updateCharacterCard)
  const calledAssetIds = useUIStore((s) => s.calledAssetIds)
  const isHighlighted = calledAssetIds.includes(card.id)

  const handleConfirmToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newConfirmed = !card.confirmed
    updateCharacterCard(card.id, {
      confirmed: newConfirmed,
      status: newConfirmed ? "confirmed" : "changed",
    })
  }

  const handleEnableToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateCharacterCard(card.id, {
      enabled: !card.enabled,
      status: !card.enabled ? (card.confirmed ? "confirmed" : "draft") : "disabled",
    })
  }

  const avatarInitial = card.name.slice(0, 1)

  return (
    <CardBase
      status={card.enabled ? card.status : "disabled"}
      isHighlighted={isHighlighted}
      onClick={onEdit}
      className={cn(
        isHighlighted && "ring-1 ring-[var(--gold)] ring-offset-0"
      )}
    >
      {/* Top row: avatar + name + role badge */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
          style={{ backgroundColor: card.color }}
        >
          {avatarInitial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              {card.name}
            </span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none",
                ROLE_COLOR[card.roleType]
              )}
            >
              {ROLE_LABEL[card.roleType]}
            </span>
          </div>
        </div>
        {isHighlighted && (
          <span className="text-[10px] text-[var(--gold)] font-medium animate-pulse shrink-0">
            已调用
          </span>
        )}
      </div>

      {/* Core desire */}
      <p className="text-xs italic text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-1">
        "{card.coreDesire}"
      </p>

      {/* Speech style */}
      <p className="text-xs text-[var(--text-muted)] leading-snug line-clamp-1 mb-2">
        说话风格：{card.speechStyle}
      </p>

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
