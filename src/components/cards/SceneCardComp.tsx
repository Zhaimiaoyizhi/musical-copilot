"use client"

import { Music, Check, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SceneCard, SceneType } from "@/types/project"
import { useProjectStore } from "@/lib/store/projectStore"
import { CardBase } from "./CardBase"
import { StatusBadge } from "@/components/shared/StatusBadge"

interface SceneCardCompProps {
  card: SceneCard
  onEdit?: () => void
  isSelected?: boolean
}

const SCENE_TYPE_CONFIG: Record<
  SceneType,
  { label: string; color: string; bg: string }
> = {
  opening: {
    label: "开场",
    color: "text-[var(--color-draft)]",
    bg: "bg-[var(--color-draft)]/10",
  },
  conflict: {
    label: "冲突",
    color: "text-[var(--color-conflict)]",
    bg: "bg-[var(--color-conflict)]/10",
  },
  turning_point: {
    label: "转折",
    color: "text-[var(--color-warning)]",
    bg: "bg-[var(--color-warning)]/10",
  },
  song: {
    label: "歌曲",
    color: "text-[var(--track-music)]",
    bg: "bg-[var(--track-music)]/10",
  },
  transition: {
    label: "过渡",
    color: "text-[var(--text-muted)]",
    bg: "bg-[var(--text-muted)]/10",
  },
  finale: {
    label: "结尾",
    color: "text-[var(--gold)]",
    bg: "bg-[var(--gold)]/10",
  },
}

const ACT_CHINESE = ["一", "二", "三", "四", "五"]
const SCENE_CHINESE = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]

function toChineseAct(act: number) {
  return ACT_CHINESE[act - 1] ?? String(act)
}

function toChineseScene(scene: number) {
  return SCENE_CHINESE[scene - 1] ?? String(scene)
}

export function SceneCardComp({ card, onEdit, isSelected }: SceneCardCompProps) {
  const updateSceneCard = useProjectStore((s) => s.updateSceneCard)
  const project = useProjectStore((s) => s.project)

  const sceneTypeConfig = SCENE_TYPE_CONFIG[card.sceneType]
  const hasMusicNode = card.musicNode && card.musicNode.type !== "none"

  const handleConfirmToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newConfirmed = !card.confirmed
    updateSceneCard(card.id, {
      confirmed: newConfirmed,
      status: newConfirmed ? "confirmed" : "changed",
    })
  }

  const handleEnableToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateSceneCard(card.id, {
      enabled: !card.enabled,
      status: !card.enabled ? (card.confirmed ? "confirmed" : "draft") : "disabled",
    })
  }

  // Get character colors for dots
  const characterColors = card.involvedCharacters
    .slice(0, 3)
    .map((charId) => {
      const charCard = project?.characterCards.find((c) => c.id === charId)
      return charCard?.color ?? "#6b6060"
    })

  const extraCount = card.involvedCharacters.length - 3

  return (
    <CardBase
      status={card.enabled ? card.status : "disabled"}
      isSelected={isSelected}
      onClick={onEdit}
    >
      {/* Top row: act/scene number + type badge + music icon */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-card-hover)] leading-none font-medium shrink-0">
          第{toChineseAct(card.act)}幕·第{toChineseScene(card.sceneNumber)}场
        </span>
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-medium leading-none",
            sceneTypeConfig.bg,
            sceneTypeConfig.color
          )}
        >
          {sceneTypeConfig.label}
        </span>
        {hasMusicNode && (
          <span title={card.musicNode?.purpose}>
            <Music
              size={11}
              className="text-[var(--track-music)] shrink-0"
            />
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-[var(--gold)] leading-snug mb-1 line-clamp-1">
        {card.title}
      </p>

      {/* Dramatic goal */}
      <p className="text-xs text-[var(--text-secondary)] leading-snug line-clamp-1 mb-0.5">
        {card.dramaticGoal}
      </p>

      {/* Core conflict */}
      <p className="text-xs text-[var(--text-muted)] leading-snug line-clamp-1 mb-2">
        {card.coreConflict}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <StatusBadge status={card.enabled ? card.status : "disabled"} />

          {/* Character dots */}
          {characterColors.length > 0 && (
            <div className="flex items-center gap-0.5">
              {characterColors.map((color, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border border-[var(--bg-card)] ring-1 ring-[var(--bg-card)]"
                  style={{
                    backgroundColor: color,
                    marginLeft: i > 0 ? "-3px" : "0",
                    zIndex: characterColors.length - i,
                    position: "relative",
                  }}
                />
              ))}
              {extraCount > 0 && (
                <span className="text-[10px] text-[var(--text-muted)] ml-0.5">
                  +{extraCount}
                </span>
              )}
            </div>
          )}
        </div>

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
