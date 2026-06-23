import type {
  Project,
  SceneContext,
  WorldBookCard,
  CharacterCard,
  StateRecord,
} from "@/types/project";

/**
 * 根据时间轴事件 ID 组装单场上下文包。
 * 硬约束世界书条目默认进入，其他按关键词匹配。
 */
export function assembleSceneContext(
  project: Project,
  eventId: string
): SceneContext | null {
  const event = project.timelineEvents.find((e) => e.id === eventId);
  if (!event) return null;

  const sceneCard = project.sceneCards.find(
    (s) => s.id === event.sceneCardId
  );
  if (!sceneCard) return null;

  // 登场角色卡
  const characterCards: CharacterCard[] = project.characterCards.filter((c) =>
    event.characterIds.includes(c.id)
  );

  // 状态记录：绑定当前场景
  const stateRecords: StateRecord[] = project.stateRecords.filter(
    (r) =>
      r.sceneId === event.stateSnapshotId ||
      r.sceneId === sceneCard.id ||
      r.sceneId === event.id
  );

  // 世界书：硬约束全选 + 关键词匹配
  const searchText = [
    event.title,
    event.location,
    event.eventSummary,
    sceneCard.location,
    sceneCard.dramaticGoal,
    sceneCard.coreConflict,
    ...sceneCard.keywords,
    ...event.characterIds,
  ]
    .join(" ")
    .toLowerCase();

  const worldbookCards: WorldBookCard[] = project.worldbookCards.filter(
    (card) => {
      if (!card.enabled) return false;
      if (card.constraintLevel === "hard") return true;
      return card.keywords.some((kw) =>
        searchText.includes(kw.toLowerCase())
      );
    }
  );

  return {
    sceneCard,
    timelineEvent: event,
    worldbookCards,
    characterCards,
    stateRecords,
  };
}

/** 从 SceneContext 提取所有被调用资产的 ID 列表 */
export function getCalledAssetIds(ctx: SceneContext): string[] {
  return [
    ctx.sceneCard.id,
    ...ctx.worldbookCards.map((c) => c.id),
    ...ctx.characterCards.map((c) => c.id),
    ...ctx.stateRecords.map((r) => r.id),
  ];
}
