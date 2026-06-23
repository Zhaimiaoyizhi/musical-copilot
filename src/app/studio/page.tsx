"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { StudioShell } from "@/components/layout/StudioShell";
import { LeftPanel } from "@/components/layout/LeftPanel";
import { TimelineScore } from "@/components/timeline/TimelineScore";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { exportJSON, exportDocx, printPDF } from "@/lib/export";
import { useDemoScript } from "@/lib/demo/useDemoScript";
import {
  Sparkles, Download, FileJson, FileText, Printer,
  ChevronDown, Zap, Users, MapPin, Music2, Wand2,
} from "lucide-react";

// ─── 资产生成步骤定义 ────────────────────────────────────────────
const GEN_STEPS = [
  { tab: "worldbook" as const,  label: "世界书卡片", count: "5张",  icon: MapPin,   delay: 1000 },
  { tab: "character" as const,  label: "角色卡",     count: "5张",  icon: Users,    delay: 900  },
  { tab: "state"     as const,  label: "状态数据库", count: "4条",  icon: Zap,      delay: 800  },
  { tab: "scene"     as const,  label: "场景卡",     count: "5张",  icon: Sparkles, delay: 700  },
];

// ─── 中间：时间轴面板 ─────────────────────────────────────────
function CenterPanel() {
  const project           = useProjectStore((s) => s.project);
  const assetsGenerated   = useUIStore((s) => s.assetsGenerated);
  const setAssetsGenerated = useUIStore((s) => s.setAssetsGenerated);
  const setAnimationPhase = useUIStore((s) => s.setAnimationPhase);
  const setLeftPanelTab   = useUIStore((s) => s.setLeftPanelTab);
  const addLog            = useUIStore((s) => s.addLog);
  const autoGenerate      = useUIStore((s) => s.autoGenerate);
  const setAutoGenerate   = useUIStore((s) => s.setAutoGenerate);
  const [scanning, setScanning] = useState(false);

  // 演示模式：项目加载完成后自动触发生成
  useEffect(() => {
    if (autoGenerate && project && !assetsGenerated && !scanning) {
      setAutoGenerate(false);
      // 短暂延迟让 UI 先渲染完
      const t = setTimeout(() => handleGenerate(), 600);
      return () => clearTimeout(t);
    }
  }, [autoGenerate, project, assetsGenerated]); // eslint-disable-line

  const handleGenerate = async () => {
    if (!project || scanning) return;
    setScanning(true);
    setAnimationPhase("generating_assets");
    addLog("开始生成核心资产...");

    // ① 扫描提示
    await sleep(600);
    addLog("正在分析故事输入...");
    await sleep(700);

    // ② 逐类型生成，自动切换左面板 Tab
    for (const step of GEN_STEPS) {
      setLeftPanelTab(step.tab);
      addLog(`${step.label}生成中... (${step.count})`);
      await sleep(step.delay);
    }

    // ③ 时间轴出现
    addLog("乐谱式时间轴生成中... (5场景 × 4轨道)");
    setAssetsGenerated(true);
    setAnimationPhase("assets_ready");
    await sleep(400);
    addLog("✓ 所有核心资产就绪 — 点击时间轴场景节点开始创作");
    setScanning(false);
  };

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {!assetsGenerated ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col items-center justify-center staff-lines relative"
          >
            {/* 扫描光效 */}
            {scanning && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="absolute inset-x-0 h-px"
                  style={{ background: "linear-gradient(to right, transparent, var(--gold), transparent)" }}
                  initial={{ top: "0%" }}
                  animate={{ top: "100%" }}
                  transition={{ duration: 1.8, ease: "linear", repeat: Infinity }}
                />
              </motion.div>
            )}

            <div className="text-center space-y-8 relative z-10">
              <div className="space-y-3">
                <h2
                  className="text-4xl font-bold"
                  style={{ color: "var(--gold)", fontFamily: '"Playfair Display", serif' }}
                >
                  乐谱式时间轴
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {project ? project.title : "正在加载项目..."}
                </p>
              </div>

              {/* 四轨预览条 */}
              <div className="flex flex-col gap-2 mx-auto w-72">
                {[
                  { color: "var(--track-event)",     label: "事件轨", w: "90%",  Icon: Zap     },
                  { color: "var(--track-character)",  label: "人物轨", w: "75%",  Icon: Users   },
                  { color: "var(--track-scene)",      label: "场景轨", w: "62%",  Icon: MapPin  },
                  { color: "var(--track-music)",      label: "音乐轨", w: "48%",  Icon: Music2  },
                ].map((t, i) => (
                  <motion.div
                    key={t.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12, type: "spring", stiffness: 200 }}
                    className="flex items-center gap-3"
                  >
                    <t.Icon size={14} style={{ color: t.color, flexShrink: 0 }} />
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{
                        width: scanning ? t.w : "20%",
                        background: `linear-gradient(to right, ${t.color}cc, ${t.color}40)`,
                      }}
                    />
                    <span className="text-xs" style={{ color: t.color }}>{t.label}</span>
                  </motion.div>
                ))}
              </div>

              {project && (
                <motion.button
                  whileHover={{ scale: scanning ? 1 : 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGenerate}
                  disabled={scanning}
                  className="relative px-10 py-3.5 rounded-xl font-semibold text-sm overflow-hidden"
                  style={{
                    background: scanning ? "var(--gold-dim)" : "var(--gold)",
                    color: "var(--bg-curtain)",
                    boxShadow: scanning ? "none" : "0 0 24px rgba(201,169,110,0.3)",
                  }}
                >
                  {scanning && (
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)" }}
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  <Sparkles className="inline mr-2" size={16} />
                  {scanning ? "正在生成核心资产..." : "生成核心资产"}
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 overflow-hidden"
          >
            <TimelineScore />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 导出菜单 ─────────────────────────────────────────────────
function ExportMenu() {
  const [open, setOpen] = useState(false);
  const project = useProjectStore((s) => s.project);

  if (!project) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors"
        style={{
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          background: open ? "var(--bg-card)" : "transparent",
        }}
      >
        <Download size={12} />
        导出
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* 遮罩 */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1.5 rounded-lg border py-1 z-50 min-w-[140px]"
              style={{ background: "var(--bg-panel)", borderColor: "var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
            >
              {[
                {
                  icon: FileJson,
                  label: "项目 JSON",
                  desc: "完整数据备份",
                  action: () => { exportJSON(project); setOpen(false); },
                },
                {
                  icon: FileText,
                  label: "剧本 .docx",
                  desc: "Word 格式",
                  action: () => { exportDocx(project); setOpen(false); },
                },
                {
                  icon: Printer,
                  label: "打印 / PDF",
                  desc: "浏览器打印",
                  action: () => { printPDF(); setOpen(false); },
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <item.icon size={13} style={{ color: "var(--gold-dim)", flexShrink: 0 }} />
                  <div>
                    <p className="font-medium" style={{ color: "var(--text-primary)" }}>{item.label}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 10 }}>{item.desc}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 底部状态栏 ───────────────────────────────────────────────
function BottomBar() {
  const logs     = useUIStore((s) => s.logMessages);
  const phase    = useUIStore((s) => s.animationPhase);
  const useMock  = useSettingsStore((s) => s.useMock);
  const selEventId = useUIStore((s) => s.selectedTimelineEventId);
  const project  = useProjectStore((s) => s.project);
  const isGenerating = phase === "generating_assets";
  const lastLog  = logs[logs.length - 1];

  const selectedEvent = project?.timelineEvents.find((e) => e.id === selEventId);

  return (
    <div className="flex items-center gap-3 text-xs w-full">
      {/* 状态指示灯 */}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          background: isGenerating ? "var(--color-warning)" : "var(--color-confirm)",
          boxShadow: isGenerating ? "0 0 6px var(--color-warning)" : "none",
          animation: isGenerating ? "pulse 1s infinite" : "none",
        }}
      />

      {/* 日志消息 */}
      <span className="truncate flex-1" style={{ color: "var(--text-muted)" }}>
        {lastLog || "就绪"}
      </span>

      {/* 当前选中场景 */}
      {selectedEvent && (
        <span
          className="shrink-0 px-2 py-0.5 rounded"
          style={{ background: "var(--bg-card)", color: "var(--gold-dim)" }}
        >
          {selectedEvent.title}
        </span>
      )}

      {/* Mock/LLM 模式 */}
      <span
        className="shrink-0 px-2 py-0.5 rounded border text-[10px] font-medium"
        style={{
          borderColor: useMock ? "var(--border)" : "var(--color-confirm)",
          color: useMock ? "var(--text-muted)" : "var(--color-confirm)",
        }}
      >
        {useMock ? "Mock" : "LLM"}
      </span>
    </div>
  );
}

// ─── 工具栏额外按钮（传给 StudioShell） ─────────────────────────
function ToolbarExtra() {
  return <ExportMenu />;
}

// ─── 演示进度浮层 ─────────────────────────────────────────────
const DEMO_STEPS = [
  "资产生成动画",
  "选中场景节点",
  "上下文芯片飞入",
  "生成剧本中",
  "一致性检查",
  "冲突红线展示",
  "修复冲突",
  "演示完成 🎭",
];

function DemoProgressOverlay() {
  const isDemoRunning = useUIStore((s) => s.isDemoRunning);
  const demoStep      = useUIStore((s) => s.demoStep);
  const setIsDemoRunning = useUIStore((s) => s.setIsDemoRunning);

  if (!isDemoRunning && demoStep === 0) return null;

  return (
    <AnimatePresence>
      {(isDemoRunning || demoStep > 0) && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="fixed bottom-14 right-4 z-50 rounded-xl border p-4 w-56 shadow-2xl"
          style={{ background: "var(--bg-panel)", borderColor: "var(--gold-dim)", boxShadow: "0 0 24px rgba(201,169,110,0.2)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wand2 size={13} style={{ color: "var(--gold)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>一键演示</span>
            </div>
            {!isDemoRunning && (
              <button onClick={() => { useUIStore.getState().setDemoStep(0); useUIStore.getState().setIsDemoRunning(false); }}
                className="text-[10px] opacity-50 hover:opacity-80" style={{ color: "var(--text-muted)" }}>✕</button>
            )}
          </div>

          <div className="space-y-1.5">
            {DEMO_STEPS.map((label, i) => {
              const done    = i < demoStep;
              const current = i === demoStep && isDemoRunning;
              const pending = i > demoStep;
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[9px]"
                    style={{
                      background: done ? "var(--color-confirm)" : current ? "var(--gold)" : "var(--border)",
                      color: done || current ? "white" : "var(--text-muted)",
                    }}>
                    {done ? "✓" : current ? (
                      <span className="animate-pulse">●</span>
                    ) : i + 1}
                  </div>
                  <span className="text-xs truncate" style={{
                    color: done ? "var(--color-confirm)" : current ? "var(--gold)" : "var(--text-muted)",
                    fontWeight: current ? 600 : "normal",
                  }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 进度条 */}
          <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--gold)" }}
              animate={{ width: `${(demoStep / (DEMO_STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────
export default function StudioPage() {
  const setProject    = useProjectStore((s) => s.setProject);
  const project       = useProjectStore((s) => s.project);
  const loadSettings  = useSettingsStore((s) => s.loadFromStorage);

  // 挂载演示脚本（空渲染钩子）
  useDemoScript();

  // 启动时加载设置 + 项目
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!project) {
      import("@/lib/mock/mockProject")
        .then(({ mockProject }) => setProject(mockProject))
        .catch(console.error);
    }
  }, [project, setProject]);

  return (
    <>
      <StudioShell
        leftPanel={<LeftPanel />}
        centerPanel={<CenterPanel />}
        rightPanel={<CopilotPanel />}
        bottomBar={<BottomBar />}
        toolbarExtra={<ToolbarExtra />}
      />
      <DemoProgressOverlay />
    </>
  );
}

// ─── 小工具 ───────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
