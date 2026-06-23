"use client"

import { Map, Users, Zap, Sparkles } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

type ChipType = "worldbook" | "character" | "state" | "scene"

interface AssetChipProps {
  type: ChipType
  label: string
  id: string
  isActive?: boolean
  onClick?: () => void
}

const TYPE_CONFIG: Record<
  ChipType,
  {
    icon: React.ElementType
    borderColor: string
    textColor: string
    bgColor: string
    glowColor: string
  }
> = {
  worldbook: {
    icon: Map,
    borderColor: "border-[var(--gold-dim)]",
    textColor: "text-[var(--gold-dim)]",
    bgColor: "bg-[var(--gold-dim)]/5",
    glowColor: "shadow-[0_0_8px_rgba(160,133,80,0.5)]",
  },
  character: {
    icon: Users,
    borderColor: "border-[var(--track-character)]",
    textColor: "text-[var(--track-character)]",
    bgColor: "bg-[var(--track-character)]/5",
    glowColor: "shadow-[0_0_8px_rgba(106,61,125,0.6)]",
  },
  state: {
    icon: Zap,
    borderColor: "border-[var(--track-scene)]",
    textColor: "text-[var(--track-scene)]",
    bgColor: "bg-[var(--track-scene)]/5",
    glowColor: "shadow-[0_0_8px_rgba(45,106,106,0.6)]",
  },
  scene: {
    icon: Sparkles,
    borderColor: "border-[var(--track-event)]",
    textColor: "text-[var(--track-event)]",
    bgColor: "bg-[var(--track-event)]/5",
    glowColor: "shadow-[0_0_8px_rgba(139,34,82,0.6)]",
  },
}

export function AssetChip({ type, label, id: _id, isActive, onClick }: AssetChipProps) {
  const config = TYPE_CONFIG[type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium cursor-default select-none transition-all",
        config.borderColor,
        config.textColor,
        config.bgColor,
        isActive && config.glowColor,
        onClick && "cursor-pointer hover:opacity-80"
      )}
    >
      <Icon size={10} className="shrink-0" />
      <span className="max-w-[80px] truncate">{label}</span>
    </motion.div>
  )
}
