"use client"

import { Music2, Users, MapPin, Zap } from "lucide-react"
import type { TrackType, TrackNode, TimelineEvent } from "@/types/project"
import { TimelineNode, COLUMN_WIDTH, ROW_HEIGHT } from "./TimelineNode"
import { useSortable, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { TimelineSelectionType } from "@/lib/store/uiStore"

// ─── 五线谱 SVG ────────────────────────────────────────────────
function StaffLines({ color, height }: { color: string; height: number }) {
  const pad = 22
  const avail = height - pad * 2
  const gap = avail / 4

  return (
    <svg className="absolute inset-0 pointer-events-none" width="100%" height={height} preserveAspectRatio="none">
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1="0" x2="100%" y1={pad + i * gap} y2={pad + i * gap}
          stroke={color} strokeWidth={0.8} strokeOpacity={0.16} />
      ))}
    </svg>
  )
}

// ─── 轨道配置 ──────────────────────────────────────────────────
const TRACK_CONFIG: Record<TrackType, { label: string; color: string; staffColor: string; Icon: React.ElementType }> = {
  event:     { label: "事件轨", color: "var(--track-event)",     staffColor: "#8b2252", Icon: Zap    },
  character: { label: "人物轨", color: "var(--track-character)", staffColor: "#6a3d7d", Icon: Users  },
  scene:     { label: "场景轨", color: "var(--track-scene)",     staffColor: "#2d6a6a", Icon: MapPin },
  music:     { label: "音乐轨", color: "var(--track-music)",     staffColor: "#b8860b", Icon: Music2 },
}

// ─── 高亮规则 ───────────────────────────────────────────────────
/**
 * 根据三态选中，计算单个节点的高亮级别：
 * - "primary"  : 被精确选中的那张卡片（节点模式）
 * - "active"   : 列模式 → 同列 / 行模式 → 同行
 * - "dim"      : 有选中但不属于当前节点/列/行
 * - "normal"   : 无任何选中
 */
function getNodeHighlight(
  nodeId: string,
  eventId: string,
  trackType: TrackType,
  selType: TimelineSelectionType,
  selNodeId: string | null,
  selEventId: string | null,
  selTrackType: string | null,
): "primary" | "active" | "dim" | "normal" {
  if (!selType) return "normal"

  if (selType === "node") {
    if (nodeId === selNodeId) return "primary"
    return "dim"
  }
  if (selType === "column") {
    if (eventId === selEventId) return "active"
    return "dim"
  }
  if (selType === "row") {
    if (trackType === selTrackType) return "active"
    return "dim"
  }
  return "normal"
}

// ─── 可拖拽事件轨节点 ──────────────────────────────────────────
function SortableNode({
  node, event, highlight,
  onNodeClick, onUpdateNode, columnIndex,
}: {
  node: TrackNode
  event: TimelineEvent
  highlight: "primary" | "active" | "dim" | "normal"
  onNodeClick: (nodeId: string, eventId: string) => void
  onUpdateNode: (id: string, data: { title: string; summary: string }) => void
  columnIndex: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: event.id })

  return (
    <TimelineNode
      id={node.id}
      eventId={event.id}
      title={node.title}
      summary={node.summary}
      trackType="event"
      status={event.status}
      highlight={highlight}
      conflictLevel={event.conflictLevel}
      index={columnIndex}
      isDragging={isDragging}
      onClick={() => onNodeClick(node.id, event.id)}
      onUpdate={onUpdateNode}
      dragRef={setNodeRef}
      dragStyle={{ transform: CSS.Transform.toString(transform), transition }}
      dragHandleListeners={listeners as Record<string, unknown>}
      dragHandleAttributes={attributes as unknown as Record<string, unknown>}
    />
  )
}

// ─── TimelineTrack ─────────────────────────────────────────────
interface TimelineTrackProps {
  trackType:   TrackType
  nodes:       TrackNode[]
  events:      TimelineEvent[]
  selType:     TimelineSelectionType
  selNodeId:   string | null
  selEventId:  string | null
  selTrackType: string | null
  onRowHeaderClick: () => void
  onNodeClick:  (nodeId: string, eventId: string) => void
  onUpdateNode: (id: string, data: { title: string; summary: string }) => void
}

export function TimelineTrack({
  trackType, nodes, events,
  selType, selNodeId, selEventId, selTrackType,
  onRowHeaderClick, onNodeClick, onUpdateNode,
}: TimelineTrackProps) {
  const cfg = TRACK_CONFIG[trackType]
  const { Icon } = cfg
  const isRowActive = selType === "row" && selTrackType === trackType
  const nodesByEventId = new Map(nodes.map((n) => [n.eventId, n]))

  return (
    <div className="flex relative" style={{ height: ROW_HEIGHT, borderBottom: "1px solid var(--border)" }}>

      {/* ── 行表头（可点击 → 行选中）─── */}
      <button
        onClick={onRowHeaderClick}
        className="flex items-center gap-2.5 px-4 shrink-0 border-r transition-all duration-200 text-left"
        style={{
          width: 130,
          borderColor: "var(--border)",
          background: isRowActive
            ? `color-mix(in srgb, ${cfg.color} 15%, var(--bg-panel))`
            : "var(--bg-panel)",
          boxShadow: isRowActive ? `inset 3px 0 0 ${cfg.color}` : undefined,
          cursor: "pointer",
        }}
        title="点击选中整行"
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all"
          style={{
            background: isRowActive ? cfg.color + "35" : cfg.color + "15",
            border: `1.5px solid ${cfg.color}${isRowActive ? "" : "44"}`,
            boxShadow: isRowActive ? `0 0 12px ${cfg.color}50` : "none",
          }}
        >
          <Icon size={15} style={{ color: cfg.color }} />
        </div>
        <span className="text-xs font-medium" style={{ color: isRowActive ? cfg.color : "var(--text-secondary)" }}>
          {cfg.label}
        </span>
      </button>

      {/* ── 节点区 ─────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        <StaffLines color={cfg.staffColor} height={ROW_HEIGHT} />

        <div
          className="flex items-center h-full px-2"
          style={{ minWidth: events.length * COLUMN_WIDTH }}
        >
          {trackType === "event" ? (
            <SortableContext items={events.map((e) => e.id)} strategy={horizontalListSortingStrategy}>
              {events.map((event, ci) => {
                const node = nodesByEventId.get(event.id)
                if (!node) return <div key={event.id} style={{ width: COLUMN_WIDTH }} />
                const hl = getNodeHighlight(node.id, event.id, trackType, selType, selNodeId, selEventId, selTrackType)
                return (
                  <div key={event.id} style={{ width: COLUMN_WIDTH, display: "flex", justifyContent: "center" }}>
                    <SortableNode node={node} event={event} highlight={hl}
                      onNodeClick={onNodeClick} onUpdateNode={onUpdateNode} columnIndex={ci} />
                  </div>
                )
              })}
            </SortableContext>
          ) : (
            events.map((event, ci) => {
              const node = nodesByEventId.get(event.id)
              if (!node) return <div key={event.id} style={{ width: COLUMN_WIDTH }} />
              const hl = getNodeHighlight(node.id, event.id, trackType, selType, selNodeId, selEventId, selTrackType)
              return (
                <div key={node.id} style={{ width: COLUMN_WIDTH, display: "flex", justifyContent: "center" }}>
                  <TimelineNode
                    id={node.id} eventId={event.id} title={node.title} summary={node.summary}
                    trackType={trackType} status={event.status} highlight={hl}
                    musicType={event.musicType} index={ci}
                    onClick={() => onNodeClick(node.id, event.id)}
                    onUpdate={onUpdateNode}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
