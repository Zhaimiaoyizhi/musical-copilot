"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "motion/react"
import { Music2, Users, MapPin, Zap, Check, X } from "lucide-react"
import type { TrackType, AssetStatus } from "@/types/project"

export const COLUMN_WIDTH = 224
export const NODE_WIDTH   = 208
export const ROW_HEIGHT   = 160

const TRACK_COLORS: Record<TrackType, { base: string; glow: string; text: string }> = {
  event:     { base: "var(--track-event)",     glow: "rgba(139,34,82,0.5)",    text: "#f5b8ce" },
  character: { base: "var(--track-character)", glow: "rgba(106,61,125,0.5)",   text: "#c9a8e8" },
  scene:     { base: "var(--track-scene)",     glow: "rgba(45,106,106,0.5)",   text: "#7ee0c8" },
  music:     { base: "var(--track-music)",     glow: "rgba(184,134,11,0.5)",   text: "#f0d080" },
}

const TRACK_ICONS: Record<TrackType, React.ElementType> = {
  event: Zap, character: Users, scene: MapPin, music: Music2,
}

interface TimelineNodeProps {
  id:          string
  eventId:     string
  title:       string
  summary:     string
  trackType:   TrackType
  status?:     AssetStatus
  /**
   * 高亮级别（由父层计算传入，替代旧的多个 bool）：
   * - "primary" : 精确选中（卡片模式下被点中的那张）
   * - "active"  : 列 / 行模式下属于选中范围
   * - "dim"     : 有选中但不在当前范围
   * - "normal"  : 无任何选中
   */
  highlight:   "primary" | "active" | "dim" | "normal"
  conflictLevel?: "low" | "medium" | "high"
  musicType?:  "none" | "solo" | "duet" | "ensemble"
  index?:      number
  isDragging?: boolean
  onClick:     () => void
  onUpdate:    (id: string, data: { title: string; summary: string }) => void
  dragHandleListeners?: Record<string, unknown>
  dragHandleAttributes?: Record<string, unknown>
  dragRef?: (node: HTMLDivElement | null) => void
  dragStyle?: React.CSSProperties
}

export function TimelineNode({
  id, title, summary, trackType, status = "confirmed",
  highlight = "normal",
  conflictLevel, musicType, index = 0, isDragging = false,
  onClick, onUpdate,
  dragHandleListeners, dragHandleAttributes, dragRef, dragStyle,
}: TimelineNodeProps) {
  const tc   = TRACK_COLORS[trackType]
  const Icon = TRACK_ICONS[trackType]

  const [editing,     setEditing]     = useState(false)
  const [editTitle,   setEditTitle]   = useState(title)
  const [editSummary, setEditSummary] = useState(summary)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setEditTitle(title) },   [title])
  useEffect(() => { setEditSummary(summary) }, [summary])

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(true)
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [])

  const commitEdit = useCallback(() => {
    setEditing(false)
    onUpdate(id, { title: editTitle.trim() || title, summary: editSummary.trim() || summary })
  }, [id, editTitle, editSummary, title, summary, onUpdate])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setEditTitle(title)
    setEditSummary(summary)
  }, [title, summary])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit() }
    if (e.key === "Escape") cancelEdit()
  }, [commitEdit, cancelEdit])

  // ── 视觉样式计算 ────────────────────────────────────────────
  const opacity =
    status === "disabled" ? 0.22 :
    isDragging             ? 1 :
    highlight === "dim"    ? 0.25 : 1

  const borderColor =
    highlight === "primary" ? "var(--gold)" :
    highlight === "active"  ? tc.base :
    status === "conflict"   ? "var(--color-conflict)" :
    status === "changed"    ? "var(--color-warning)" :
    "var(--border)"

  const boxShadow =
    highlight === "primary"
      ? `0 0 24px ${tc.glow}, 0 0 0 1.5px var(--gold)`
    : highlight === "active"
      ? `0 0 14px ${tc.glow}`
    : isDragging
      ? "0 12px 40px rgba(0,0,0,0.7)"
    : undefined

  const bgColor =
    highlight === "primary"
      ? `color-mix(in srgb, ${tc.base} 22%, var(--bg-card))`
    : highlight === "active"
      ? `color-mix(in srgb, ${tc.base} 12%, var(--bg-card))`
    : "var(--bg-card)"

  const titleColor =
    highlight === "primary" || highlight === "active" ? tc.text : "var(--text-primary)"

  return (
    <div
      ref={dragRef}
      style={{ ...dragStyle, width: NODE_WIDTH, opacity, transition: "opacity 0.2s" }}
      className="relative group"
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: isDragging ? 1.04 : 1 }}
        transition={{ delay: index * 0.04, type: "spring", stiffness: 280, damping: 24 }}
        whileHover={!editing ? { y: -2 } : {}}
        onClick={editing ? undefined : onClick}
        onDoubleClick={startEdit}
        className="rounded-xl cursor-pointer select-none overflow-hidden"
        style={{
          height: ROW_HEIGHT - 24,
          border: `1.5px solid ${borderColor}`,
          background: bgColor,
          boxShadow,
          transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
        }}
      >
        {editing ? (
          /* ── 编辑模式 ─── */
          <div className="p-3 h-full flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              ref={titleRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-sm font-semibold rounded px-2 py-1 outline-none border"
              style={{
                background: "var(--bg-curtain)",
                border: `1px solid ${tc.base}`,
                color: tc.text,
                fontFamily: "inherit",
              }}
              placeholder="卡片标题"
            />
            <textarea
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="text-xs rounded px-2 py-1 outline-none border resize-none flex-1"
              style={{
                background: "var(--bg-curtain)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontFamily: "inherit",
              }}
              placeholder="摘要（Enter 保存，Esc 取消）"
            />
            <div className="flex gap-1.5 justify-end">
              <button onClick={cancelEdit} className="px-2 py-0.5 rounded text-xs border flex items-center gap-1"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <X size={10} /> 取消
              </button>
              <button onClick={commitEdit} className="px-2 py-0.5 rounded text-xs flex items-center gap-1"
                style={{ background: tc.base, color: "#fff" }}>
                <Check size={10} /> 保存
              </button>
            </div>
          </div>
        ) : (
          /* ── 展示模式 ─── */
          <div className="p-3 h-full flex flex-col justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                style={{ background: tc.base + "25", border: `1px solid ${tc.base}44` }}>
                <Icon size={12} style={{ color: tc.base }} />
              </div>

              {trackType === "music" && musicType && musicType !== "none" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                  style={{ background: tc.base + "30", color: tc.text }}>
                  {musicType === "solo" ? "独唱" : musicType === "duet" ? "二重唱" : "合唱"}
                </span>
              )}

              {trackType === "event" && conflictLevel && conflictLevel !== "low" && (
                <div className="flex gap-0.5 ml-auto">
                  {Array.from({ length: conflictLevel === "high" ? 3 : 2 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: tc.base }} />
                  ))}
                </div>
              )}

              <span className="ml-auto text-[9px] opacity-0 group-hover:opacity-50 transition-opacity"
                style={{ color: "var(--text-muted)" }}>
                双击编辑
              </span>
            </div>

            <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: titleColor }}>
              {title}
            </p>

            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--text-muted)" }}>
              {summary}
            </p>
          </div>
        )}

        {/* 选中底线 */}
        {(highlight === "primary" || highlight === "active") && !editing && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ background: highlight === "primary" ? "var(--gold)" : tc.base, transformOrigin: "left" }}
          />
        )}
      </motion.div>

      {/* 拖拽手柄 */}
      {dragHandleListeners && (
        <div
          {...dragHandleAttributes}
          {...dragHandleListeners}
          className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 px-3 py-0.5 rounded-full"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
        >
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ background: "var(--gold-dim)" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
