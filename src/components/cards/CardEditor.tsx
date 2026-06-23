"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useProjectStore } from "@/lib/store/projectStore"
import type {
  WorldBookCard,
  CharacterCard,
  StateRecord,
  SceneCard,
} from "@/types/project"

export interface CardEditorProps {
  open: boolean
  onClose: () => void
  cardType: "worldbook" | "character" | "state" | "scene" | null
  cardId: string | null
}

const CARD_TYPE_LABEL: Record<string, string> = {
  worldbook: "世界书卡片",
  character: "角色卡片",
  state: "状态记录",
  scene: "场景卡片",
}

// --- Field helpers ---

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// ============================================================
// Worldbook editor
// ============================================================
function WorldbookEditor({
  card,
  onSave,
}: {
  card: WorldBookCard
  onSave: (updates: Partial<WorldBookCard>) => void
}) {
  const [title, setTitle] = useState(card.title)
  const [summary, setSummary] = useState(card.summary)
  const [content, setContent] = useState(card.content)
  const [keywords, setKeywords] = useState(card.keywords.join(", "))
  const [constraintLevel, setConstraintLevel] = useState(card.constraintLevel)

  useEffect(() => {
    setTitle(card.title)
    setSummary(card.summary)
    setContent(card.content)
    setKeywords(card.keywords.join(", "))
    setConstraintLevel(card.constraintLevel)
  }, [card])

  const handleSave = () => {
    onSave({
      title,
      summary,
      content,
      keywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      constraintLevel,
      status: "changed",
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldRow label="标题">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="世界书卡片标题"
        />
      </FieldRow>
      <FieldRow label="摘要">
        <Input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="一句话摘要"
        />
      </FieldRow>
      <FieldRow label="内容">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="详细内容..."
          className="min-h-[120px]"
        />
      </FieldRow>
      <FieldRow label="关键词（逗号分隔）">
        <Input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="关键词1, 关键词2, ..."
        />
      </FieldRow>
      <FieldRow label="约束等级">
        <select
          value={constraintLevel}
          onChange={(e) =>
            setConstraintLevel(e.target.value as "normal" | "hard")
          }
          className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--gold-dim)]"
        >
          <option value="normal">普通</option>
          <option value="hard">硬约束</option>
        </select>
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-lg bg-[var(--gold)] text-[var(--bg-curtain)] text-sm font-semibold hover:bg-[var(--gold-dim)] transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Character editor
// ============================================================
function CharacterEditor({
  card,
  onSave,
}: {
  card: CharacterCard
  onSave: (updates: Partial<CharacterCard>) => void
}) {
  const [name, setName] = useState(card.name)
  const [summary, setSummary] = useState(card.summary)
  const [identity, setIdentity] = useState(card.identity)
  const [coreDesire, setCoreDesire] = useState(card.coreDesire)
  const [speechStyle, setSpeechStyle] = useState(card.speechStyle)
  const [relationships, setRelationships] = useState(card.relationships.join("\n"))

  useEffect(() => {
    setName(card.name)
    setSummary(card.summary)
    setIdentity(card.identity)
    setCoreDesire(card.coreDesire)
    setSpeechStyle(card.speechStyle)
    setRelationships(card.relationships.join("\n"))
  }, [card])

  const handleSave = () => {
    onSave({
      name,
      summary,
      identity,
      coreDesire,
      speechStyle,
      relationships: relationships
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
      status: "changed",
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldRow label="姓名">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="角色名"
        />
      </FieldRow>
      <FieldRow label="摘要">
        <Input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="一句话描述"
        />
      </FieldRow>
      <FieldRow label="身份背景">
        <Input
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          placeholder="角色身份与背景"
        />
      </FieldRow>
      <FieldRow label="核心欲望">
        <Input
          value={coreDesire}
          onChange={(e) => setCoreDesire(e.target.value)}
          placeholder="最深层的驱动欲望"
        />
      </FieldRow>
      <FieldRow label="说话风格">
        <Input
          value={speechStyle}
          onChange={(e) => setSpeechStyle(e.target.value)}
          placeholder="语言特点与习惯"
        />
      </FieldRow>
      <FieldRow label="人物关系（每行一条）">
        <Textarea
          value={relationships}
          onChange={(e) => setRelationships(e.target.value)}
          placeholder={"角色A——关系描述\n角色B——关系描述"}
          className="min-h-[80px]"
        />
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-lg bg-[var(--gold)] text-[var(--bg-curtain)] text-sm font-semibold hover:bg-[var(--gold-dim)] transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  )
}

// ============================================================
// State editor
// ============================================================
function StateEditor({
  card,
  onSave,
}: {
  card: StateRecord
  onSave: (updates: Partial<StateRecord>) => void
}) {
  const [entityName, setEntityName] = useState(card.entityName)
  const [visibleSummary, setVisibleSummary] = useState(card.visibleSummary)
  const [beforeState, setBeforeState] = useState(card.beforeState)
  const [afterState, setAfterState] = useState(card.afterState)
  const [lockedFacts, setLockedFacts] = useState(
    (card.lockedFacts ?? []).join("\n")
  )

  useEffect(() => {
    setEntityName(card.entityName)
    setVisibleSummary(card.visibleSummary)
    setBeforeState(card.beforeState)
    setAfterState(card.afterState)
    setLockedFacts((card.lockedFacts ?? []).join("\n"))
  }, [card])

  const handleSave = () => {
    onSave({
      entityName,
      visibleSummary,
      beforeState,
      afterState,
      lockedFacts: lockedFacts
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      status: "changed",
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldRow label="实体名称">
        <Input
          value={entityName}
          onChange={(e) => setEntityName(e.target.value)}
          placeholder="角色/道具/事件名称"
        />
      </FieldRow>
      <FieldRow label="可见摘要">
        <Input
          value={visibleSummary}
          onChange={(e) => setVisibleSummary(e.target.value)}
          placeholder="简短描述状态变化"
        />
      </FieldRow>
      <FieldRow label="变化前状态">
        <Textarea
          value={beforeState}
          onChange={(e) => setBeforeState(e.target.value)}
          placeholder="场景开始前的状态..."
          className="min-h-[60px]"
        />
      </FieldRow>
      <FieldRow label="变化后状态">
        <Textarea
          value={afterState}
          onChange={(e) => setAfterState(e.target.value)}
          placeholder="场景结束后的状态..."
          className="min-h-[60px]"
        />
      </FieldRow>
      <FieldRow label="锁定事实（每行一条）">
        <Textarea
          value={lockedFacts}
          onChange={(e) => setLockedFacts(e.target.value)}
          placeholder={"不可更改的事实条目\n每行一条"}
          className="min-h-[60px]"
        />
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-lg bg-[var(--gold)] text-[var(--bg-curtain)] text-sm font-semibold hover:bg-[var(--gold-dim)] transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Scene editor
// ============================================================
function SceneEditor({
  card,
  onSave,
}: {
  card: SceneCard
  onSave: (updates: Partial<SceneCard>) => void
}) {
  const [title, setTitle] = useState(card.title)
  const [location, setLocation] = useState(card.location)
  const [dramaticGoal, setDramaticGoal] = useState(card.dramaticGoal)
  const [coreConflict, setCoreConflict] = useState(card.coreConflict)
  const [requiredBeats, setRequiredBeats] = useState(
    card.requiredBeats.join("\n")
  )
  const [forbiddenReveal, setForbiddenReveal] = useState(
    card.forbiddenReveal.join("\n")
  )

  useEffect(() => {
    setTitle(card.title)
    setLocation(card.location)
    setDramaticGoal(card.dramaticGoal)
    setCoreConflict(card.coreConflict)
    setRequiredBeats(card.requiredBeats.join("\n"))
    setForbiddenReveal(card.forbiddenReveal.join("\n"))
  }, [card])

  const handleSave = () => {
    onSave({
      title,
      location,
      dramaticGoal,
      coreConflict,
      requiredBeats: requiredBeats
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean),
      forbiddenReveal: forbiddenReveal
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      status: "changed",
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldRow label="场景标题">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="场景标题"
        />
      </FieldRow>
      <FieldRow label="地点">
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="场景发生的地点"
        />
      </FieldRow>
      <FieldRow label="戏剧目标">
        <Input
          value={dramaticGoal}
          onChange={(e) => setDramaticGoal(e.target.value)}
          placeholder="本场景要达成的叙事目标"
        />
      </FieldRow>
      <FieldRow label="核心冲突">
        <Input
          value={coreConflict}
          onChange={(e) => setCoreConflict(e.target.value)}
          placeholder="核心戏剧冲突"
        />
      </FieldRow>
      <FieldRow label="必要情节节拍（每行一条）">
        <Textarea
          value={requiredBeats}
          onChange={(e) => setRequiredBeats(e.target.value)}
          placeholder={"必须发生的情节节点\n每行一条"}
          className="min-h-[80px]"
        />
      </FieldRow>
      <FieldRow label="禁止揭示（每行一条）">
        <Textarea
          value={forbiddenReveal}
          onChange={(e) => setForbiddenReveal(e.target.value)}
          placeholder={"本场景中不得透露的信息\n每行一条"}
          className="min-h-[60px]"
        />
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-lg bg-[var(--gold)] text-[var(--bg-curtain)] text-sm font-semibold hover:bg-[var(--gold-dim)] transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Main CardEditor
// ============================================================
export function CardEditor({ open, onClose, cardType, cardId }: CardEditorProps) {
  const project = useProjectStore((s) => s.project)
  const updateWorldbookCard = useProjectStore((s) => s.updateWorldbookCard)
  const updateCharacterCard = useProjectStore((s) => s.updateCharacterCard)
  const updateStateRecord = useProjectStore((s) => s.updateStateRecord)
  const updateSceneCard = useProjectStore((s) => s.updateSceneCard)

  if (!open || !cardType || !cardId || !project) return null

  const typeLabel = CARD_TYPE_LABEL[cardType] ?? "卡片"

  const renderEditor = () => {
    if (cardType === "worldbook") {
      const card = project.worldbookCards.find((c) => c.id === cardId)
      if (!card) return <p className="text-sm text-[var(--text-muted)]">未找到卡片</p>
      return (
        <WorldbookEditor
          card={card}
          onSave={(updates) => {
            updateWorldbookCard(cardId, updates)
            onClose()
          }}
        />
      )
    }

    if (cardType === "character") {
      const card = project.characterCards.find((c) => c.id === cardId)
      if (!card) return <p className="text-sm text-[var(--text-muted)]">未找到卡片</p>
      return (
        <CharacterEditor
          card={card}
          onSave={(updates) => {
            updateCharacterCard(cardId, updates)
            onClose()
          }}
        />
      )
    }

    if (cardType === "state") {
      const card = project.stateRecords.find((r) => r.id === cardId)
      if (!card) return <p className="text-sm text-[var(--text-muted)]">未找到记录</p>
      return (
        <StateEditor
          card={card}
          onSave={(updates) => {
            updateStateRecord(cardId, updates)
            onClose()
          }}
        />
      )
    }

    if (cardType === "scene") {
      const card = project.sceneCards.find((s) => s.id === cardId)
      if (!card) return <p className="text-sm text-[var(--text-muted)]">未找到卡片</p>
      return (
        <SceneEditor
          card={card}
          onSave={(updates) => {
            updateSceneCard(cardId, updates)
            onClose()
          }}
        />
      )
    }

    return null
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑 {typeLabel}</DialogTitle>
        </DialogHeader>

        <div className="py-2">{renderEditor()}</div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[var(--text-secondary)]"
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
