import { create } from "zustand";
import { persist } from "zustand/middleware";

const LEFT_DEFAULT  = 280;
const RIGHT_DEFAULT = 500;
const TIMELINE_DEFAULT = 220;
const SNAP_THRESHOLD = 80;

interface LayoutState {
  // 面板宽高
  leftW: number;
  rightW: number;
  timelineH: number;

  // 面板开关（与拖拽 snap 同步）
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  timelinePanelOpen: boolean;

  // setters
  setLeftW: (w: number) => void;
  setRightW: (w: number) => void;
  setTimelineH: (h: number) => void;

  // toggle（按钮用，恢复上次尺寸或折叠）
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleTimeline: () => void;
}

// 上次展开时的尺寸（snap 恢复用，不持久化）
let _prevLeftW  = LEFT_DEFAULT;
let _prevRightW = RIGHT_DEFAULT;
let _prevTimelineH = TIMELINE_DEFAULT;

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      leftW:  LEFT_DEFAULT,
      rightW: RIGHT_DEFAULT,
      timelineH: TIMELINE_DEFAULT,

      leftPanelOpen:    true,
      rightPanelOpen:   true,
      timelinePanelOpen: true,

      setLeftW: (w) => {
        if (w > SNAP_THRESHOLD) {
          _prevLeftW = w;
          set({ leftW: w, leftPanelOpen: true });
        } else {
          set({ leftW: 0, leftPanelOpen: false });
        }
      },

      setRightW: (w) => {
        if (w > SNAP_THRESHOLD) {
          _prevRightW = w;
          set({ rightW: w, rightPanelOpen: true });
        } else {
          set({ rightW: 0, rightPanelOpen: false });
        }
      },

      setTimelineH: (h) => {
        if (h > SNAP_THRESHOLD) {
          _prevTimelineH = h;
          set({ timelineH: h, timelinePanelOpen: true });
        } else {
          set({ timelineH: 0, timelinePanelOpen: false });
        }
      },

      toggleLeft: () => {
        const { leftPanelOpen } = get();
        if (leftPanelOpen) {
          _prevLeftW = get().leftW || LEFT_DEFAULT;
          set({ leftW: 0, leftPanelOpen: false });
        } else {
          const restored = _prevLeftW > SNAP_THRESHOLD ? _prevLeftW : LEFT_DEFAULT;
          set({ leftW: restored, leftPanelOpen: true });
        }
      },

      toggleRight: () => {
        const { rightPanelOpen } = get();
        if (rightPanelOpen) {
          _prevRightW = get().rightW || RIGHT_DEFAULT;
          set({ rightW: 0, rightPanelOpen: false });
        } else {
          const restored = _prevRightW > SNAP_THRESHOLD ? _prevRightW : RIGHT_DEFAULT;
          set({ rightW: restored, rightPanelOpen: true });
        }
      },

      toggleTimeline: () => {
        const { timelinePanelOpen } = get();
        if (timelinePanelOpen) {
          _prevTimelineH = get().timelineH || TIMELINE_DEFAULT;
          set({ timelineH: 0, timelinePanelOpen: false });
        } else {
          const restored = _prevTimelineH > SNAP_THRESHOLD ? _prevTimelineH : TIMELINE_DEFAULT;
          set({ timelineH: restored, timelinePanelOpen: true });
        }
      },
    }),
    {
      name: "musical-copilot-layout",
      partialize: (state) => ({
        leftW:             state.leftW,
        rightW:            state.rightW,
        timelineH:         state.timelineH,
        leftPanelOpen:     state.leftPanelOpen,
        rightPanelOpen:    state.rightPanelOpen,
        timelinePanelOpen: state.timelinePanelOpen,
      }),
    }
  )
);
