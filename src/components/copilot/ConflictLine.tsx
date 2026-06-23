"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import type { ConsistencyIssue } from "@/types/project";

interface ConflictPoint {
  x: number;
  y: number;
}

interface ConflictLineProps {
  issue: ConsistencyIssue | null;
  isVisible: boolean;
  onClose?: () => void;
}

/** 从 data-card-id 属性定位左面板卡片中心 */
function findCardCenter(cardId: string): ConflictPoint | null {
  const el = document.querySelector(`[data-card-id="${cardId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** 从 data-conflict-text 属性定位右面板冲突文本 */
function findConflictTextCenter(): ConflictPoint | null {
  const el = document.querySelector("[data-conflict-text='true']");
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** 生成二次贝塞尔曲线路径 */
function makeBezierPath(from: ConflictPoint, to: ConflictPoint): string {
  const cx = (from.x + to.x) / 2;
  const cy = Math.min(from.y, to.y) - 60;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

export function ConflictLine({ issue, isVisible, onClose }: ConflictLineProps) {
  const [from, setFrom] = useState<ConflictPoint | null>(null);
  const [to, setTo] = useState<ConflictPoint | null>(null);
  const [mounted, setMounted] = useState(false);
  const shakeCountRef = useRef(0);

  useEffect(() => setMounted(true), []);

  const measurePositions = useCallback(() => {
    if (!issue) return;
    const fromPt = findCardCenter(issue.sourceId);
    const toPt = findConflictTextCenter();
    if (fromPt) setFrom(fromPt);
    if (toPt) setTo(toPt);
  }, [issue]);

  useEffect(() => {
    if (!isVisible || !issue) return;
    // 等 DOM 稳定后测量
    const t1 = setTimeout(measurePositions, 50);
    const t2 = setTimeout(measurePositions, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isVisible, issue, measurePositions]);

  // 震动目标卡片
  useEffect(() => {
    if (!isVisible || !issue) return;
    const el = document.querySelector(`[data-card-id="${issue.sourceId}"]`);
    if (!el) return;
    el.classList.add("conflict-shake");
    const t = setTimeout(() => el.classList.remove("conflict-shake"), 1200);
    return () => clearTimeout(t);
  }, [isVisible, issue]);

  if (!mounted) return null;

  const path = from && to ? makeBezierPath(from, to) : null;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50"
          onClick={onClose}
          style={{ pointerEvents: onClose ? "auto" : "none" }}
        >
          {/* SVG 红线 */}
          {path && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ overflow: "visible" }}
            >
              <defs>
                <filter id="glow-red">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 发光底色 */}
              <motion.path
                d={path}
                fill="none"
                stroke="rgba(220,53,69,0.25)"
                strokeWidth={8}
                strokeLinecap="round"
                filter="url(#glow-red)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />

              {/* 主线 */}
              <motion.path
                d={path}
                fill="none"
                stroke="var(--color-conflict)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="6 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.65, delay: 0.05, ease: "easeOut" }}
              />

              {/* 箭头终点 */}
              {to && (
                <motion.circle
                  cx={to.x}
                  cy={to.y}
                  r={5}
                  fill="var(--color-conflict)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                />
              )}

              {/* 起点 */}
              {from && (
                <motion.circle
                  cx={from.x}
                  cy={from.y}
                  r={4}
                  fill="none"
                  stroke="var(--color-conflict)"
                  strokeWidth={2}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.4, 1] }}
                  transition={{ delay: 0, duration: 0.4 }}
                />
              )}
            </svg>
          )}

          {/* 冲突说明浮层 */}
          {issue && from && to && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="absolute pointer-events-auto rounded-lg p-3 max-w-xs text-xs shadow-2xl"
              style={{
                left: Math.max(8, Math.min((from.x + to.x) / 2 - 120, window.innerWidth - 256)),
                top: Math.min(from.y, to.y) - 80,
                background: "var(--bg-panel)",
                border: "1px solid var(--color-conflict)",
                boxShadow: "0 0 24px rgba(220,53,69,0.3)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--color-conflict)] animate-pulse" />
                <span className="font-semibold" style={{ color: "var(--color-conflict)" }}>
                  一致性冲突
                </span>
              </div>
              <p style={{ color: "var(--text-secondary)" }}>{issue.reason}</p>
              {issue.suggestion && (
                <p className="mt-1.5 pt-1.5 border-t" style={{
                  borderColor: "var(--border)",
                  color: "var(--gold-dim)"
                }}>
                  建议：{issue.suggestion}
                </p>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="mt-2 w-full text-center text-[10px] py-1 rounded transition-colors"
                  style={{
                    background: "var(--color-conflict)" + "22",
                    color: "var(--color-conflict)",
                  }}
                >
                  我知道了
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
