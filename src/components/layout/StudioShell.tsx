"use client";

import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useRouter } from "next/navigation";

interface StudioShellProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomBar?: React.ReactNode;
  /** 插入顶部工具栏右侧的额外内容 */
  toolbarExtra?: React.ReactNode;
}

export function StudioShell({
  leftPanel,
  centerPanel,
  rightPanel,
  bottomBar,
  toolbarExtra,
}: StudioShellProps) {
  const leftOpen = useUIStore((s) => s.leftPanelOpen);
  const rightOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleLeft = useUIStore((s) => s.toggleLeftPanel);
  const toggleRight = useUIStore((s) => s.toggleRightPanel);
  const router = useRouter();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* 顶部标题栏 */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--bg-panel)] shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLeft}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] transition-colors text-[var(--text-secondary)]"
          >
            {leftOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
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
            {rightOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </div>
      </header>

      {/* 主体三栏 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左面板 */}
        <aside
          className={cn(
            "border-r border-[var(--border)] bg-[var(--bg-panel)] transition-all duration-300 overflow-hidden shrink-0",
            leftOpen ? "w-[320px]" : "w-0"
          )}
        >
          <div className="w-[320px] h-full overflow-y-auto">
            {leftPanel}
          </div>
        </aside>

        {/* 中间时间轴 */}
        <main className="flex-1 overflow-hidden bg-[var(--bg-curtain)]">
          {centerPanel}
        </main>

        {/* 右面板 */}
        <aside
          className={cn(
            "border-l border-[var(--border)] bg-[var(--bg-panel)] transition-all duration-300 overflow-hidden shrink-0",
            rightOpen ? "w-[400px]" : "w-0"
          )}
        >
          <div className="w-[400px] h-full overflow-y-auto">
            {rightPanel}
          </div>
        </aside>
      </div>

      {/* 底部状态栏 */}
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
