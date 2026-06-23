import { create } from "zustand";
import type { AnimationPhase } from "@/types/project";

type LeftPanelTab = "worldbook" | "character" | "state" | "scene";

/**
 * 三种互斥的时间轴选中类型：
 * - node   : 点击卡片本身  → 仅该卡片高亮
 * - column : 点击列表头    → 整列高亮
 * - row    : 点击行表头    → 整行高亮
 */
export type TimelineSelectionType = "node" | "column" | "row" | null;

interface UIState {
  // 左面板
  leftPanelTab: LeftPanelTab;
  setLeftPanelTab: (tab: LeftPanelTab) => void;
  leftPanelOpen: boolean;
  toggleLeftPanel: () => void;

  // 右面板
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;

  // ── 时间轴三态独立选中 ─────────────────────────────────────
  /** 当前选中的来源类型，互斥 */
  timelineSelectionType: TimelineSelectionType;

  /** 选中的具体卡片 id（type==="node" 时有效） */
  selectedNodeId: string | null;

  /**
   * 选中的事件 id（type==="column" 时 = 列表头点击；type==="node" 时 = 该卡片所属事件，供 CopilotPanel 用）
   * type==="row" 时为 null。
   */
  selectedTimelineEventId: string | null;

  /** 选中的轨道类型（type==="row" 时有效） */
  selectedTrackType: string | null;

  /** 点击卡片：仅高亮该卡片，同时更新 selectedTimelineEventId 供右侧面板用 */
  selectNode: (nodeId: string, eventId: string) => void;
  /** 点击列表头：高亮整列 */
  selectColumn: (eventId: string) => void;
  /** 点击行表头：高亮整行 */
  selectRow: (trackType: string) => void;
  /** 清除所有选中 */
  clearTimelineSelection: () => void;

  // 动画阶段
  animationPhase: AnimationPhase;
  setAnimationPhase: (phase: AnimationPhase) => void;

  // 被调用的资产 ID（飞入动画）
  calledAssetIds: string[];
  setCalledAssetIds: (ids: string[]) => void;

  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  isChecking: boolean;
  setIsChecking: (v: boolean) => void;
  assetsGenerated: boolean;
  setAssetsGenerated: (v: boolean) => void;
  /** 演示模式：Studio 启动后自动触发生成 */
  autoGenerate: boolean;
  setAutoGenerate: (v: boolean) => void;

  editingCardId: string | null;
  editingCardType: string | null;
  setEditingCard: (id: string | null, type?: string | null) => void;

  highlightedConflictId: string | null;
  setHighlightedConflictId: (id: string | null) => void;

  logMessages: string[];
  addLog: (msg: string) => void;
  clearLogs: () => void;

  /** 演示脚本控制 */
  isDemoRunning: boolean;
  demoStep: number;
  setIsDemoRunning: (v: boolean) => void;
  setDemoStep: (n: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftPanelTab: "worldbook",
  leftPanelOpen: true,
  rightPanelOpen: true,

  timelineSelectionType: null,
  selectedNodeId: null,
  selectedTimelineEventId: null,
  selectedTrackType: null,

  animationPhase: "idle",
  calledAssetIds: [],
  isGenerating: false,
  isChecking: false,
  assetsGenerated: false,
  autoGenerate: false,
  editingCardId: null,
  editingCardType: null,
  highlightedConflictId: null,
  logMessages: [],

  setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),

  selectNode: (nodeId, eventId) => set({
    timelineSelectionType: "node",
    selectedNodeId: nodeId,
    selectedTimelineEventId: eventId,
    selectedTrackType: null,
  }),
  selectColumn: (eventId) => set({
    timelineSelectionType: "column",
    selectedNodeId: null,
    selectedTimelineEventId: eventId,
    selectedTrackType: null,
  }),
  selectRow: (trackType) => set({
    timelineSelectionType: "row",
    selectedNodeId: null,
    selectedTimelineEventId: null,
    selectedTrackType: trackType,
  }),
  clearTimelineSelection: () => set({
    timelineSelectionType: null,
    selectedNodeId: null,
    selectedTimelineEventId: null,
    selectedTrackType: null,
  }),

  setAnimationPhase: (phase) => set({ animationPhase: phase }),
  setCalledAssetIds: (ids) => set({ calledAssetIds: ids }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setIsChecking: (v) => set({ isChecking: v }),
  setAssetsGenerated: (v) => set({ assetsGenerated: v }),
  setAutoGenerate: (v) => set({ autoGenerate: v }),
  setEditingCard: (id, type = null) => set({ editingCardId: id, editingCardType: type }),
  setHighlightedConflictId: (id) => set({ highlightedConflictId: id }),
  addLog: (msg) =>
    set((s) => ({
      logMessages: [...s.logMessages.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`],
    })),
  clearLogs: () => set({ logMessages: [] }),

  isDemoRunning: false,
  demoStep: 0,
  setIsDemoRunning: (v) => set({ isDemoRunning: v }),
  setDemoStep: (n) => set({ demoStep: n }),
}));
