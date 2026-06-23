"use client";

import { motion, AnimatePresence } from "motion/react";
import { Map, Users, Zap, Sparkles, Globe, Shield, Clock, Scale, MapPin } from "lucide-react";
import type { SceneContext } from "@/types/project";

// 世界书类型图标
const WB_ICONS: Record<string, React.ElementType> = {
  background: Globe,
  time_place: MapPin,
  rule: Scale,
  prestory: Clock,
  hard_constraint: Shield,
};

interface ContextChipsProps {
  ctx: SceneContext | null;
  isAnimating?: boolean;
}

interface ChipDef {
  id: string;
  label: string;
  type: "worldbook" | "character" | "state" | "scene";
  color: string;
  Icon: React.ElementType;
  isHard?: boolean;
}

function buildChips(ctx: SceneContext): ChipDef[] {
  const chips: ChipDef[] = [];

  // 场景卡
  chips.push({
    id: ctx.sceneCard.id,
    label: ctx.sceneCard.title,
    type: "scene",
    color: "var(--track-event)",
    Icon: Sparkles,
  });

  // 世界书
  ctx.worldbookCards.forEach((c) => {
    chips.push({
      id: c.id,
      label: c.title,
      type: "worldbook",
      color: c.constraintLevel === "hard" ? "var(--color-conflict)" : "var(--gold-dim)",
      Icon: WB_ICONS[c.type] || Map,
      isHard: c.constraintLevel === "hard",
    });
  });

  // 角色卡
  ctx.characterCards.forEach((c) => {
    chips.push({
      id: c.id,
      label: c.name,
      type: "character",
      color: c.color,
      Icon: Users,
    });
  });

  // 状态记录
  ctx.stateRecords.forEach((r) => {
    chips.push({
      id: r.id,
      label: r.entityName,
      type: "state",
      color: "var(--track-scene)",
      Icon: Zap,
    });
  });

  return chips;
}

export function ContextChips({ ctx, isAnimating }: ContextChipsProps) {
  if (!ctx) return null;

  const chips = buildChips(ctx);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          上下文芯片 · {chips.length} 项
        </p>
        {isAnimating && (
          <span className="text-[10px] animate-pulse" style={{ color: "var(--gold)" }}>
            ◈ 正在组装...
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {chips.map((chip, i) => (
            <motion.div
              key={chip.id}
              initial={{ opacity: 0, x: -60, scale: 0.7 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 0.38,
                delay: i * 0.07,
                type: "spring",
                stiffness: 320,
                damping: 22,
              }}
              data-chip-id={chip.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-default select-none"
              style={{
                borderColor: chip.color,
                color: chip.color,
                background: chip.color + "12",
                boxShadow: chip.isHard
                  ? `0 0 8px ${chip.color}55`
                  : undefined,
              }}
            >
              <chip.Icon size={9} className="shrink-0" />
              <span className="max-w-[90px] truncate">{chip.label}</span>
              {chip.isHard && (
                <span
                  className="text-[8px] px-1 rounded"
                  style={{
                    background: "var(--color-conflict)" + "30",
                    color: "var(--color-conflict)",
                  }}
                >
                  硬约束
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
