// ============================================================
// 音乐剧 Studio | 剧本 Copilot — 核心类型定义
// ============================================================

// --- 世界书 ---
export type WorldBookCardType =
  | "background"
  | "time_place"
  | "rule"
  | "prestory"
  | "hard_constraint";

export type AssetStatus =
  | "draft"
  | "confirmed"
  | "changed"
  | "conflict"
  | "disabled";

export interface WorldBookCard {
  id: string;
  projectId: string;
  title: string;
  type: WorldBookCardType;
  summary: string;
  content: string;
  keywords: string[];
  constraintLevel: "normal" | "hard";
  enabled: boolean;
  confirmed: boolean;
  status: AssetStatus;
}

// --- 角色卡 ---
export type RoleType =
  | "protagonist"
  | "rival"
  | "ally"
  | "mentor"
  | "ensemble";

export interface CharacterCard {
  id: string;
  projectId: string;
  name: string;
  roleType: RoleType;
  summary: string;
  identity: string;
  appearance: string;
  coreDesire: string;
  conflictRole: string;
  relationships: string[];
  speechStyle: string;
  performanceHint?: string;
  keywords: string[];
  color: string; // 角色专属色
  enabled: boolean;
  confirmed: boolean;
  status: AssetStatus;
}

// --- 时间轴事件 ---
export type TrackType = "event" | "character" | "scene" | "music";

export interface TimelineEvent {
  id: string;
  projectId: string;
  act: number;
  scene: number;
  title: string;
  eventSummary: string;
  characterIds: string[];
  location: string;
  musicNode?: string;
  sceneCardId: string;
  stateSnapshotId: string;
  conflictLevel: "low" | "medium" | "high";
  musicType: "none" | "solo" | "duet" | "ensemble";
  order: number;
  status: AssetStatus;
  confirmed: boolean;
  enabled: boolean;
}

// --- 时间轴轨道节点 (四轨展示用) ---
export interface TrackNode {
  id: string;
  eventId: string; // 关联的 TimelineEvent
  trackType: TrackType;
  title: string;
  summary: string;
  linkedCharacters: string[];
  keywords: string[];
}

// --- 状态记录 ---
export type EntityType = "character" | "relationship" | "prop" | "event";

export interface StateRecord {
  id: string;
  projectId: string;
  sceneId: string;
  sceneLabel: string;
  entityType: EntityType;
  entityName: string;
  beforeState: string;
  afterState: string;
  visibleSummary: string;
  lockedFacts?: string[];
  keywords: string[];
  enabled: boolean;
  confirmed: boolean;
  status: AssetStatus;
}

// --- 场景卡 ---
export type SceneType =
  | "opening"
  | "conflict"
  | "turning_point"
  | "song"
  | "transition"
  | "finale";

export interface SceneCard {
  id: string;
  projectId: string;
  act: number;
  sceneNumber: number;
  title: string;
  sceneType: SceneType;
  location: string;
  summary: string;
  involvedCharacters: string[];
  dramaticGoal: string;
  coreConflict: string;
  requiredBeats: string[];
  forbiddenReveal: string[];
  musicNode?: {
    type: "none" | "solo" | "duet" | "ensemble";
    purpose: string;
    emotion: string;
  };
  startStateSummary: string;
  endStateTarget: string;
  keywords: string[];
  enabled: boolean;
  confirmed: boolean;
  status: AssetStatus;
}

// --- 剧本文本 ---
export interface ScriptScene {
  id: string;
  projectId: string;
  sceneCardId: string;
  act: number;
  scene: number;
  rawText: string;
  formattedBlocks: ScriptBlock[];
}

export interface ScriptBlock {
  type: "role_name" | "dialogue" | "stage_direction" | "lyrics" | "scene_heading";
  text: string;
  characterId?: string;
}

// --- 一致性问题 ---
export interface ConsistencyIssue {
  id: string;
  projectId: string;
  sceneId: string;
  sourceType: "worldbook" | "character" | "state" | "sceneCard";
  sourceId: string;
  sourceField?: string;
  scriptText: string;
  reason: string;
  suggestion: string;
  severity: "low" | "medium" | "high";
}

// --- 场景上下文 ---
export interface SceneContext {
  sceneCard: SceneCard;
  timelineEvent: TimelineEvent;
  worldbookCards: WorldBookCard[];
  characterCards: CharacterCard[];
  stateRecords: StateRecord[];
}

// --- 状态回写 ---
export interface StatePatch {
  sceneId: string;
  recordId: string;
  changeSummary: string;
  beforeState: string;
  suggestedAfterState: string;
  reason: string;
  confirmed: boolean;
}

// --- 人物动机推演 ---
export interface ReasoningStep {
  label: string;
  content: string;
  type: "desire" | "obstacle" | "emotion" | "action" | "dialogue";
}

// --- 项目 ---
export interface Project {
  id: string;
  title: string;
  storyInput: string;
  worldbookCards: WorldBookCard[];
  characterCards: CharacterCard[];
  timelineEvents: TimelineEvent[];
  trackNodes: TrackNode[];
  stateRecords: StateRecord[];
  sceneCards: SceneCard[];
  scriptScenes: ScriptScene[];
  consistencyIssues: ConsistencyIssue[];
  createdAt: string;
  updatedAt: string;
}

// --- 动画阶段 ---
export type AnimationPhase =
  | "idle"
  | "generating_assets"
  | "assets_ready"
  | "calling_assets"
  | "assets_called"
  | "reasoning"
  | "generating_script"
  | "script_ready"
  | "checking_consistency"
  | "consistency_done";
