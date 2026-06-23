import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Project,
  WorldBookCard,
  CharacterCard,
  TimelineEvent,
  StateRecord,
  SceneCard,
  ScriptScene,
  ConsistencyIssue,
  SceneContext,
} from "@/types/project";

interface ProjectState {
  // 当前项目
  project: Project | null;
  setProject: (project: Project) => void;
  clearProject: () => void;

  // 世界书
  updateWorldbookCard: (id: string, updates: Partial<WorldBookCard>) => void;
  // 角色卡
  updateCharacterCard: (id: string, updates: Partial<CharacterCard>) => void;
  // 时间轴
  updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  reorderTimelineEvents: (fromIndex: number, toIndex: number) => void;
  updateTrackNode: (id: string, updates: { title?: string; summary?: string }) => void;
  // 状态库
  updateStateRecord: (id: string, updates: Partial<StateRecord>) => void;
  // 场景卡
  updateSceneCard: (id: string, updates: Partial<SceneCard>) => void;
  // 剧本
  updateScriptScene: (id: string, updates: Partial<ScriptScene>) => void;
  setScriptScene: (script: ScriptScene) => void;
  // 一致性问题
  setConsistencyIssues: (issues: ConsistencyIssue[]) => void;

  // 当前场景上下文
  activeSceneContext: SceneContext | null;
  setActiveSceneContext: (ctx: SceneContext | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
  project: null,
  activeSceneContext: null,

  setProject: (project) => set({ project }),
  clearProject: () => set({ project: null, activeSceneContext: null }),

  updateWorldbookCard: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          worldbookCards: state.project.worldbookCards.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        },
      };
    }),

  updateCharacterCard: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          characterCards: state.project.characterCards.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        },
      };
    }),

  updateTimelineEvent: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          timelineEvents: state.project.timelineEvents.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        },
      };
    }),

  reorderTimelineEvents: (fromIndex, toIndex) =>
    set((state) => {
      if (!state.project) return state;
      const events = [...state.project.timelineEvents];
      const [moved] = events.splice(fromIndex, 1);
      events.splice(toIndex, 0, { ...moved, status: "changed" as const });
      // 重新排序 order
      const reordered = events.map((e, i) => ({ ...e, order: i }));
      return {
        project: { ...state.project, timelineEvents: reordered },
      };
    }),

  updateTrackNode: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          trackNodes: state.project.trackNodes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        },
      };
    }),

  updateStateRecord: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          stateRecords: state.project.stateRecords.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        },
      };
    }),

  updateSceneCard: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          sceneCards: state.project.sceneCards.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        },
      };
    }),

  updateScriptScene: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          scriptScenes: state.project.scriptScenes.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        },
      };
    }),

  setScriptScene: (script) =>
    set((state) => {
      if (!state.project) return state;
      const exists = state.project.scriptScenes.find(
        (s) => s.id === script.id
      );
      return {
        project: {
          ...state.project,
          scriptScenes: exists
            ? state.project.scriptScenes.map((s) =>
                s.id === script.id ? script : s
              )
            : [...state.project.scriptScenes, script],
        },
      };
    }),

  setConsistencyIssues: (issues) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: { ...state.project, consistencyIssues: issues },
      };
    }),

  setActiveSceneContext: (ctx) => set({ activeSceneContext: ctx }),
  }),
  {
    name: "musical-copilot-project",
    // activeSceneContext 不需要持久化（运行时状态）
    partialize: (state) => ({
      project: state.project,
    }),
  }
));
