"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import type { AssetStatus } from "@/types/project"

interface CardBaseProps {
  status?: AssetStatus
  isSelected?: boolean
  isHighlighted?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
  layoutId?: string
  /** 用于 ConflictLine DOM 定位 */
  "data-card-id"?: string
}

export function CardBase({
  status,
  isSelected,
  isHighlighted,
  onClick,
  children,
  className,
  layoutId,
  "data-card-id": dataCardId,
}: CardBaseProps) {
  return (
    <motion.div
      layoutId={layoutId}
      data-card-id={dataCardId}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "relative rounded-xl border p-3 transition-all duration-200 cursor-pointer select-none",
        // Base colors
        "bg-[var(--bg-card)] border-[var(--border)]",
        "hover:bg-[var(--bg-card-hover)] hover:border-[var(--gold-dim)]",
        // Selected state
        isSelected && [
          "border-[var(--gold)]",
          "shadow-[0_0_16px_rgba(201,169,110,0.25)]",
        ],
        // Highlighted (called asset) state
        isHighlighted && [
          "border-[var(--gold)]",
          "shadow-[0_0_20px_rgba(201,169,110,0.35),inset_0_0_20px_rgba(201,169,110,0.04)]",
        ],
        // Status-based border
        status === "conflict" && !isSelected && [
          "border-[var(--color-conflict)]",
          "animate-[pulse-conflict_1.5s_infinite]",
        ],
        status === "disabled" && "opacity-50",
        // Confirmed left accent
        status === "confirmed" && !isSelected && !isHighlighted && [
          "border-l-2 border-l-[var(--color-confirm)]",
        ],
        // Changed state
        status === "changed" && !isSelected && !isHighlighted && [
          "border-l-2 border-l-[var(--color-warning)]",
        ],
        className
      )}
    >
      {children}
    </motion.div>
  )
}
