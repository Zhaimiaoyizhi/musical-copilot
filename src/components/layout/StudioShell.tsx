"use client";

import { useRef, useCallback, useState } from "react";
import { useLayoutStore } from "@/lib/store/layoutStore";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useRouter } from "next/navigation";

interface StudioShellProps {
  leftPanel: React.ReactNode;
  /** 上半中间区：场景编辑器（可选，不传时 timelinePanel 全高） */
  editorPanel?: React.ReactNode;
  /** 下半中间区：时间轴（或欢迎页） */
  timelinePanel: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomBar?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
}

// ─── 拖拽把手 ──────────────────────────────────────────────────
function ResizeHandle({
  direction,
  onMouseDown,
  className,
}: {
  direction: "col" | "row";
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        "shrink-0 relative z-10 transition-colors duration-150",
        direction === "col"
          ? "w-[3px] cursor-col-resize hover:bg-[var(--primary)]"
          : "h-[3px] cursor-row-resize hover:bg-[var(--primary)]",
        className
      )}
      style={{ background: "var(--border)" }}
    >
      {/* 扩展命中区，让拖拽更容易触发 */}
      <div
        className={cn(
          "absolute",
          direction === "col"
            ? "inset-y-0 -inset-x-[3px]"
            : "inset-x-0 -inset-y-[3px]"
        )}
      />
    </div>
  );
}

// ─── StudioShell ───────────────────────────────────────────────
export function StudioShell({
  leftPanel,
  editorPanel,
  timelinePanel,
  rightPanel,
  bottomBar,
  toolbarExtra,
}: StudioShellProps) {
  const router = useRouter();

  const {
    leftW, rightW, timelineH,
    leftPanelOpen, rightPanelOpen, timelinePanelOpen,
    setLeftW, setRightW, setTimelineH,
    toggleLeft, toggleRight,
  } = useLayoutStore();

  const [dragging, setDragging] = useState<"left" | "right" | "timeline" | null>(null);

  // ── 左面板拖拽 ──────────────────────────────────────────────
  const leftDrag = useRef({ startX: 0, startW: 0 });

  const onLeftHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    leftDrag.current = { startX: e.clientX, startW: leftW };
    setDragging("left");
    const onMove = (me: MouseEvent) => {
      setLeftW(Math.max(0, leftDrag.current.startW + (me.clientX - leftDrag.current.startX)));
    };
    const onUp = () => {
      setDragging(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [leftW, setLeftW]);

  // ── 右面板拖拽 ──────────────────────────────────────────────
  const rightDrag = useRef({ startX: 0, startW: 0 });

  const onRightHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    rightDrag.current = { startX: e.clientX, startW: rightW };
    setDragging("right");
    const onMove = (me: MouseEvent) => {
      setRightW(Math.max(0, rightDrag.current.startW - (me.clientX - rightDrag.current.startX)));
    };
    const onUp = () => {
      setDragging(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [rightW, setRightW]);

  // ── 时间轴高度拖拽 ─────────────────────────────────────────
  const timelineDrag = useRef({ startY: 0, startH: 0 });

  const onTimelineHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    timelineDrag.current = { startY: e.clientY, startH: timelineH };
    setDragging("timeline");
    const onMove = (me: MouseEvent) => {
      setTimelineH(Math.max(0, timelineDrag.current.startH - (me.clientY - timelineDrag.current.startY)));
    };
    const onUp = () => {
      setDragging(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [timelineH, setTimelineH]);

  return (
    <div className="flex flex-col h-screen overflow-hidden select-none">
      {/* ── 顶部标题栏 ─────────────────────────────────────── */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--bg-panel)] shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLeft}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] transition-colors text-[var(--text-secondary)]"
          >
            {leftPanelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <button
            onClick={() => router.push("/")}
            className="text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--gold)", fontFamily: '"Playfair Display", serif' }}
            title="返回首页（内容保留）"
          >
            Musical Studio
          </button>
          <span className="text-xs text-[var(--text-muted)]">|</span>
          <span className="text-xs text-[var(--text-secondary)]">剧本 Copilot</span>
        </div>

        <div className="flex items-center gap-3">
          {toolbarExtra}
          <a
            href="/settings"
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors"
          >
            LLM 设置
          </a>
          <button
            onClick={toggleRight}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] transition-colors text-[var(--text-secondary)]"
          >
            {rightPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </div>
      </header>

      {/* ── 主体三栏 ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左面板 */}
        <aside
          className="bg-[var(--bg-panel)] overflow-hidden shrink-0 flex"
          style={{ width: leftW, transition: dragging === "left" ? "none" : "width 0.2s ease" }}
        >
          <div className="flex-1 overflow-y-auto" style={{ minWidth: 0 }}>
            {leftPanel}
          </div>
          <ResizeHandle direction="col" onMouseDown={onLeftHandleMouseDown} />
        </aside>

        {/* 中间：编辑器 + 时间轴 */}
        <main className="flex-1 overflow-hidden bg-[var(--bg-curtain)] flex flex-col min-w-0">
          {editorPanel ? (
            <>
              {/* 编辑器区（flex-1 占满剩余空间） */}
              <div className="flex-1 overflow-hidden min-h-0">
                {editorPanel}
              </div>

              {/* 时间轴分割线 */}
              <ResizeHandle direction="row" onMouseDown={onTimelineHandleMouseDown} />

              {/* 时间轴区 */}
              <div
                className="overflow-hidden shrink-0 bg-[var(--bg-curtain)]"
                style={{
                  height: timelineH,
                  transition: dragging === "timeline" ? "none" : "height 0.2s ease",
                }}
              >
                {timelinePanelOpen && timelinePanel}
              </div>
            </>
          ) : (
            /* 无编辑器时，timelinePanel 全高（欢迎页 / 单 TimelineScore） */
            <div className="flex-1 overflow-hidden min-h-0">
              {timelinePanel}
            </div>
          )}
        </main>

        {/* 右面板 */}
        <aside
          className="bg-[var(--bg-panel)] overflow-hidden shrink-0 flex"
          style={{ width: rightW, transition: dragging === "right" ? "none" : "width 0.2s ease" }}
        >
          <ResizeHandle direction="col" onMouseDown={onRightHandleMouseDown} />
          <div className="flex-1 overflow-y-auto" style={{ minWidth: 0 }}>
            {rightPanel}
          </div>
        </aside>
      </div>

      {/* ── 底部状态栏 ─────────────────────────────────────── */}
      <footer className="h-10 flex items-center px-4 border-t border-[var(--border)] bg-[var(--bg-panel)] shrink-0 z-20">
        {bottomBar || (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <div className="w-2 h-2 rounded-full bg-[var(--color-confirm)]" />
            <span>就绪</span>
          </div>
        )}
      </footer>
    </div>
  );
}
