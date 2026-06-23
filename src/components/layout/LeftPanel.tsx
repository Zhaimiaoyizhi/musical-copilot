"use client"

import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import { useProjectStore } from "@/lib/store/projectStore"
import { useUIStore } from "@/lib/store/uiStore"
import { WorldbookCard } from "@/components/cards/WorldbookCard"
import { CharacterCard } from "@/components/cards/CharacterCard"
import { StateCard } from "@/components/cards/StateCard"
import { SceneCardComp } from "@/components/cards/SceneCardComp"
import { CardEditor } from "@/components/cards/CardEditor"

type TabKey = "worldbook" | "character" | "state" | "scene"

const TABS: { key: TabKey; label: string }[] = [
  { key: "worldbook", label: "世界书" },
  { key: "character", label: "角色卡" },
  { key: "state", label: "状态库" },
  { key: "scene", label: "场景卡" },
]

// 骨架屏卡片（生成中状态）
function SkeletonCard({ i }: { i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.12, type: "spring", stiffness: 200 }}
      className="rounded-xl p-3 border space-y-2"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded" style={{ background: "var(--border)", animation: "pulse 1.4s infinite" }} />
        <div className="h-2 w-16 rounded" style={{ background: "var(--border)", animation: "pulse 1.4s infinite" }} />
      </div>
      <div className="h-3 w-full rounded" style={{ background: "var(--border)", animation: "pulse 1.4s 0.1s infinite" }} />
      <div className="h-2 w-3/4 rounded" style={{ background: "var(--border)", animation: "pulse 1.4s 0.2s infinite" }} />
    </motion.div>
  )
}

export function LeftPanel() {
  const project = useProjectStore((s) => s.project)
  const leftPanelTab = useUIStore((s) => s.leftPanelTab)
  const setLeftPanelTab = useUIStore((s) => s.setLeftPanelTab)
  const editingCardId = useUIStore((s) => s.editingCardId)
  const editingCardType = useUIStore((s) => s.editingCardType)
  const setEditingCard = useUIStore((s) => s.setEditingCard)
  const assetsGenerated = useUIStore((s) => s.assetsGenerated)
  const animationPhase = useUIStore((s) => s.animationPhase)

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xs text-[var(--text-muted)]">暂无项目</p>
      </div>
    )
  }

  // Card counts per tab
  const counts: Record<TabKey, number> = {
    worldbook: project.worldbookCards.length,
    character: project.characterCards.length,
    state: project.stateRecords.length,
    scene: project.sceneCards.length,
  }

  const handleEditCard = (id: string, type: TabKey) => {
    setEditingCard(id, type)
  }

  const handleCloseEditor = () => {
    setEditingCard(null, null)
  }

  const isGenerating = animationPhase === "generating_assets"

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--border)] bg-[var(--bg-panel)] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setLeftPanelTab(tab.key)}
            className={cn(
              "relative flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              leftPanelTab === tab.key
                ? "text-[var(--gold)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "text-[9px] px-1 rounded-full leading-none",
                leftPanelTab === tab.key
                  ? "bg-[var(--gold)]/15 text-[var(--gold)]"
                  : "bg-[var(--border)]/50 text-[var(--text-muted)]"
              )}
            >
              {counts[tab.key]}
            </span>
            {leftPanelTab === tab.key && (
              <motion.div
                layoutId="left-panel-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--gold)] rounded-t"
              />
            )}
          </button>
        ))}
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
        <AnimatePresence mode="wait">
          {leftPanelTab === "worldbook" && (
            <motion.div
              key="worldbook"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {/* 生成中显示骨架屏；已完成显示真实卡片 */}
              {isGenerating && !assetsGenerated
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} i={i} />)
                : project.worldbookCards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  <WorldbookCard
                    card={card}
                    onEdit={() => handleEditCard(card.id, "worldbook")}
                  />
                </motion.div>
              ))}
              {!isGenerating && project.worldbookCards.length === 0 && (
                <EmptyState label="暂无世界书卡片" />
              )}
            </motion.div>
          )}

          {leftPanelTab === "character" && (
            <motion.div
              key="character"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {project.characterCards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  <CharacterCard
                    card={card}
                    onEdit={() => handleEditCard(card.id, "character")}
                  />
                </motion.div>
              ))}
              {project.characterCards.length === 0 && (
                <EmptyState label="暂无角色卡片" />
              )}
            </motion.div>
          )}

          {leftPanelTab === "state" && (
            <motion.div
              key="state"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {project.stateRecords.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  <StateCard
                    card={card}
                    onEdit={() => handleEditCard(card.id, "state")}
                  />
                </motion.div>
              ))}
              {project.stateRecords.length === 0 && (
                <EmptyState label="暂无状态记录" />
              )}
            </motion.div>
          )}

          {leftPanelTab === "scene" && (
            <motion.div
              key="scene"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {project.sceneCards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  <SceneCardComp
                    card={card}
                    onEdit={() => handleEditCard(card.id, "scene")}
                  />
                </motion.div>
              ))}
              {project.sceneCards.length === 0 && (
                <EmptyState label="暂无场景卡片" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card editor dialog */}
      <CardEditor
        open={!!editingCardId && !!editingCardType}
        onClose={handleCloseEditor}
        cardType={
          editingCardType as "worldbook" | "character" | "state" | "scene" | null
        }
        cardId={editingCardId}
      />
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-8 flex items-center justify-center">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  )
}
