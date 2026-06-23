"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Flame, Shield, Zap, MessageSquare } from "lucide-react";
import type { ReasoningStep } from "@/types/project";

const STEP_ICONS = {
  desire: Heart,
  obstacle: Shield,
  emotion: Flame,
  action: Zap,
  dialogue: MessageSquare,
};

const STEP_COLORS = {
  desire: "var(--gold)",
  obstacle: "var(--track-event)",
  emotion: "var(--track-music)",
  action: "var(--track-character)",
  dialogue: "var(--track-scene)",
};

const STEP_LABELS = {
  desire: "核心欲望",
  obstacle: "当前阻碍",
  emotion: "情绪变化",
  action: "行动选择",
  dialogue: "台词/行动",
};

interface ReasoningFlowProps {
  steps: ReasoningStep[];
  characterName: string;
  characterColor: string;
  autoPlay?: boolean;
  onComplete?: () => void;
}

export function ReasoningFlow({
  steps,
  characterName,
  characterColor,
  autoPlay = true,
  onComplete,
}: ReasoningFlowProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (!isPlaying) return;
    if (visibleCount >= steps.length) {
      onComplete?.();
      return;
    }
    const timer = setTimeout(
      () => setVisibleCount((n) => n + 1),
      visibleCount === 0 ? 300 : 520
    );
    return () => clearTimeout(timer);
  }, [visibleCount, isPlaying, steps.length, onComplete]);

  const handleReplay = () => {
    setVisibleCount(0);
    setIsPlaying(true);
  };

  return (
    <div className="space-y-0">
      {/* 角色标题 */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: characterColor }}
        >
          {characterName[0]}
        </div>
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
          {characterName} · 动机推演
        </span>
        {visibleCount >= steps.length && (
          <button
            onClick={handleReplay}
            className="ml-auto text-[10px] px-2 py-0.5 rounded border transition-colors"
            style={{
              borderColor: "var(--gold-dim)",
              color: "var(--gold-dim)",
            }}
          >
            重播
          </button>
        )}
      </div>

      {/* Step 流 */}
      <div className="relative">
        <AnimatePresence>
          {steps.slice(0, visibleCount).map((step, i) => {
            const Icon = STEP_ICONS[step.type] || Zap;
            const color = STEP_COLORS[step.type] || "var(--text-secondary)";
            const label = STEP_LABELS[step.type] || step.type;

            return (
              <motion.div
                key={`${step.type}-${i}`}
                initial={{ opacity: 0, x: -12, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <div className="flex gap-2.5 pb-3">
                  {/* 左侧时间线 */}
                  <div className="flex flex-col items-center shrink-0">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: color + "22",
                        border: `1.5px solid ${color}`,
                      }}
                    >
                      <Icon size={13} style={{ color }} />
                    </motion.div>
                    {/* 连接线 */}
                    {i < visibleCount - 1 && (
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        style={{
                          width: 1.5,
                          flex: 1,
                          minHeight: 16,
                          background: `linear-gradient(to bottom, ${color}60, ${color}20)`,
                          transformOrigin: "top",
                        }}
                      />
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 pt-0.5 pb-1">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                      style={{ color }}
                    >
                      {label}
                    </p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.18 }}
                      className="text-xs leading-relaxed"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {step.content}
                    </motion.p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* 未显示的步骤占位（灰色骨架） */}
        {steps.slice(visibleCount).map((step, i) => {
          const Icon = STEP_ICONS[step.type] || Zap;
          return (
            <div key={`placeholder-${i}`} className="flex gap-2.5 pb-3 opacity-20">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ border: "1.5px solid var(--border)" }}
                >
                  <Icon size={13} style={{ color: "var(--text-muted)" }} />
                </div>
                {i < steps.slice(visibleCount).length - 1 && (
                  <div
                    style={{ width: 1.5, flex: 1, minHeight: 16, background: "var(--border)" }}
                  />
                )}
              </div>
              <div className="flex-1 pt-0.5">
                <div className="h-2 w-16 rounded bg-current mb-1.5" style={{ color: "var(--border)" }} />
                <div className="h-2 w-full rounded bg-current" style={{ color: "var(--border)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
