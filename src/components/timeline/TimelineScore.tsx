"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useProjectStore } from "@/lib/store/projectStore"
import { useUIStore } from "@/lib/store/uiStore"
import { TimelineTrack } from "./TimelineTrack"
import { COLUMN_WIDTH, ROW_HEIGHT } from "./TimelineNode"
import type { TrackType } from "@/types/project"

const TRACKS: TrackType[] = ["event", "character", "scene", "music"]
const TRACK_HEAD_W = 130
const SCROLL_STEP  = COLUMN_WIDTH

const ACT_CN   = ["一", "二", "三", "四", "五"]
const SCENE_CN = ["一", "二", "三", "四", "五", "六", "七", "八"]
function actLabel(n: number)   { return `第${ACT_CN[n - 1] ?? n}幕` }
function sceneLabel(n: number) { return `第${SCENE_CN[n - 1] ?? n}场` }

interface ActGroup { act: number; startIdx: number; count: number }
function buildActGroups(events: { act: number }[]): ActGroup[] {
  const groups: ActGroup[] = []
  events.forEach((e, i) => {
    const last = groups[groups.length - 1]
    if (!last || last.act !== e.act) groups.push({ act: e.act, startIdx: i, count: 1 })
    else last.count++
  })
  return groups
}

export function TimelineScore() {
  const project         = useProjectStore((s) => s.project)
  const reorderEvents   = useProjectStore((s) => s.reorderTimelineEvents)
  const updateTrackNode = useProjectStore((s) => s.updateTrackNode)

  // ── 三态独立选中 ────────────────────────────────────────────
  const selType     = useUIStore((s) => s.timelineSelectionType)
  const selNodeId   = useUIStore((s) => s.selectedNodeId)
  const selEventId  = useUIStore((s) => s.selectedTimelineEventId)
  const selTrackType = useUIStore((s) => s.selectedTrackType)
  const selectNode   = useUIStore((s) => s.selectNode)
  const selectColumn = useUIStore((s) => s.selectColumn)
  const selectRow    = useUIStore((s) => s.selectRow)
  const addLog       = useUIStore((s) => s.addLog)

  // ── 滚动 refs ───────────────────────────────────────────────
  const scrollRef    = useRef<HTMLDivElement>(null)
  const headerScroll = useRef<HTMLDivElement>(null)
  const dragScroll   = useRef({ active: false, startX: 0, startLeft: 0, moved: 0 })
  const [isDragScrolling, setIsDragScrolling] = useState(false)

  // ── dnd ──────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── 同步标题行滚动 ───────────────────────────────────────────
  const syncScroll = useCallback(() => {
    if (!scrollRef.current || !headerScroll.current) return
    headerScroll.current.scrollLeft = scrollRef.current.scrollLeft
  }, [])

  // ── 拖拽背景滚动 ─────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragScroll.current = { active: true, startX: e.clientX, startLeft: scrollRef.current?.scrollLeft ?? 0, moved: 0 }
    setIsDragScrolling(false)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragScroll.current.active || !scrollRef.current) return
    const dx = e.clientX - dragScroll.current.startX
    dragScroll.current.moved = Math.abs(dx)
    if (dragScroll.current.moved > 4) setIsDragScrolling(true)
    scrollRef.current.scrollLeft = dragScroll.current.startLeft - dx
    syncScroll()
  }, [syncScroll])

  const handleMouseUp = useCallback(() => {
    dragScroll.current.active = false
    setTimeout(() => setIsDragScrolling(false), 0)
  }, [])

  // ── 方向键滚动 ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return
      if (!scrollRef.current) return
      if (e.key === "ArrowLeft")  { e.preventDefault(); scrollRef.current.scrollLeft -= SCROLL_STEP; syncScroll() }
      if (e.key === "ArrowRight") { e.preventDefault(); scrollRef.current.scrollLeft += SCROLL_STEP; syncScroll() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [syncScroll])

  // ── 列表头点击 ───────────────────────────────────────────────
  const handleColumnHeaderClick = useCallback((eventId: string) => {
    if (dragScroll.current.moved > 4) return
    selectColumn(eventId)
    const event = project?.timelineEvents.find((e) => e.id === eventId)
    if (event) addLog(`已选中列：${actLabel(event.act)}${sceneLabel(event.scene)} — ${event.title}`)
  }, [selectColumn, project, addLog])

  // ── 行表头点击 ───────────────────────────────────────────────
  const handleRowHeaderClick = useCallback((trackType: TrackType) => {
    selectRow(trackType)
    const labels: Record<TrackType, string> = {
      event: "事件轨", character: "人物轨", scene: "场景轨", music: "音乐轨"
    }
    addLog(`已选中行：${labels[trackType]}`)
  }, [selectRow, addLog])

  // ── 卡片点击 ─────────────────────────────────────────────────
  const handleNodeClick = useCallback((nodeId: string, eventId: string, trackType: TrackType) => {
    if (dragScroll.current.moved > 4) return
    selectNode(nodeId, eventId)
    const event = project?.timelineEvents.find((e) => e.id === eventId)
    if (event) addLog(`已选中：${event.title} · ${trackType}轨`)
  }, [selectNode, project, addLog])

  // ── 节点编辑保存 ─────────────────────────────────────────────
  const handleUpdateNode = useCallback((id: string, data: { title: string; summary: string }) => {
    updateTrackNode(id, data)
    addLog(`已保存节点：${data.title}`)
  }, [updateTrackNode, addLog])

  // ── dnd 排序结束 ────────────────────────────────────────────
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !project) return
    const events = project.timelineEvents
    const from = events.findIndex((e) => e.id === active.id)
    const to   = events.findIndex((e) => e.id === over.id)
    if (from === -1 || to === -1) return
    reorderEvents(from, to)
    addLog(`已重排：${events[from].title} → 第 ${to + 1} 位`)
  }, [project, reorderEvents, addLog])

  const handleScrollbarScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft
    syncScroll()
  }, [syncScroll])

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>等待项目加载...</p>
      </div>
    )
  }

  const sortedEvents = [...project.timelineEvents].sort((a, b) => a.order - b.order)
  const actGroups    = buildActGroups(sortedEvents)
  const totalW       = sortedEvents.length * COLUMN_WIDTH
  const fullW        = totalW + TRACK_HEAD_W + 32

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full select-none" style={{ background: "var(--bg-curtain)" }}>

        {/* ── 工具栏 ─────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-2 border-b shrink-0 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
        >
          <span style={{ color: "var(--text-muted)" }}>乐谱式时间轴</span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span style={{ color: "var(--text-secondary)" }}>{sortedEvents.length} 场景</span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span style={{ color: "var(--text-muted)" }}>点击行/列表头高亮 · 点击卡片选中 · 双击编辑 · ← → 键滚动</span>
          {selType === "column" && selEventId && (
            <span style={{ color: "var(--gold)" }}>
              ◈ {project.timelineEvents.find((e) => e.id === selEventId)?.title}（整列）
            </span>
          )}
          {selType === "row" && selTrackType && (
            <span style={{ color: "var(--gold)" }}>
              ◈ {{ event: "事件轨", character: "人物轨", scene: "场景轨", music: "音乐轨" }[selTrackType]}（整行）
            </span>
          )}
        </div>

        {/* ── 幕/场标题行 ─────────────────────────────────────── */}
        <div className="flex shrink-0" style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border)" }}>
          {/* 轨道头占位 */}
          <div
            className="shrink-0 flex items-end pb-2 px-4"
            style={{ width: TRACK_HEAD_W, borderRight: "1px solid var(--border)" }}
          >
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>轨道 / 幕场</span>
          </div>

          {/* 同步滚动的幕/场标题 */}
          <div ref={headerScroll} className="flex-1 overflow-hidden">
            <div style={{ minWidth: totalW, display: "flex" }}>
              {actGroups.map((group) => (
                <div
                  key={group.act}
                  style={{ width: group.count * COLUMN_WIDTH, borderRight: "2px solid rgba(201,169,110,0.2)" }}
                >
                  {/* 幕标题 */}
                  <div
                    className="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest border-b"
                    style={{ borderColor: "var(--border)", color: "var(--gold)", background: "rgba(201,169,110,0.04)" }}
                  >
                    {actLabel(group.act)}
                  </div>

                  {/* 场标题（可点击 → 列选中） */}
                  <div className="flex">
                    {sortedEvents.slice(group.startIdx, group.startIdx + group.count).map((evt) => {
                      const isColSelected = selType === "column" && selEventId === evt.id
                      return (
                        <div
                          key={evt.id}
                          style={{ width: COLUMN_WIDTH, borderRight: "1px solid var(--border)" }}
                          className="px-3 py-1.5 text-xs cursor-pointer transition-all"
                          onClick={() => handleColumnHeaderClick(evt.id)}
                        >
                          <span
                            className="font-medium transition-colors rounded px-1 py-0.5"
                            style={{
                              color: isColSelected ? "var(--bg-curtain)" : "var(--text-secondary)",
                              background: isColSelected ? "var(--gold)" : "transparent",
                            }}
                          >
                            {sceneLabel(evt.scene)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 轨道区 ───────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-hidden overflow-y-hidden"
            style={{ cursor: isDragScrolling ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div style={{ minWidth: fullW, display: "flex", flexDirection: "column" }}>
              {TRACKS.map((trackType) => (
                <TimelineTrack
                  key={trackType}
                  trackType={trackType}
                  nodes={project.trackNodes.filter((n) => n.trackType === trackType)}
                  events={sortedEvents}
                  // 三态传入
                  selType={selType}
                  selNodeId={selNodeId}
                  selEventId={selEventId}
                  selTrackType={selTrackType}
                  onRowHeaderClick={() => handleRowHeaderClick(trackType)}
                  onNodeClick={(nodeId, eventId) => handleNodeClick(nodeId, eventId, trackType)}
                  onUpdateNode={handleUpdateNode}
                />
              ))}
              <div style={{ height: 16 }} />
            </div>
          </div>

          {/* 底部滚动条（唯一可见滚动条，驱动内容区） */}
          <div
            className="shrink-0 overflow-x-auto overflow-y-hidden"
            style={{ height: 14, paddingLeft: TRACK_HEAD_W }}
            onScroll={handleScrollbarScroll}
          >
            <div style={{ width: totalW, height: 1 }} />
          </div>
        </div>
      </div>
    </DndContext>
  )
}
