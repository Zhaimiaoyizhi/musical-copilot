"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ScriptBlock } from "@/types/project";

interface StreamingScriptProps {
  blocks: ScriptBlock[];
  isStreaming: boolean;
  highlightConflictText?: string; // 需要高亮的冲突台词片段
  onConflictRef?: (el: HTMLElement | null) => void;
}

// 把预录文本分块成按字释放
function textToChars(text: string): string[] {
  return text.split("");
}

// 样式映射
const BLOCK_STYLES: Record<
  ScriptBlock["type"],
  { className: string; prefix?: string; suffix?: string }
> = {
  scene_heading: {
    className: "font-semibold text-xs uppercase tracking-wider mb-2 mt-1",
    // color via style
  },
  stage_direction: {
    className: "text-xs italic mb-1.5",
    prefix: "（",
    suffix: "）",
  },
  role_name: {
    className: "text-xs font-bold mt-2 mb-0.5",
    // color via character color
  },
  dialogue: {
    className: "text-sm leading-relaxed mb-1",
  },
  lyrics: {
    className: "text-sm italic leading-relaxed mb-1 pl-3 border-l-2",
    // border via style
  },
};

interface StreamedBlock extends ScriptBlock {
  displayedChars: number;
}

export function StreamingScript({
  blocks,
  isStreaming,
  highlightConflictText,
  onConflictRef,
}: StreamingScriptProps) {
  const [streamedBlocks, setStreamedBlocks] = useState<StreamedBlock[]>([]);
  const conflictRef = useRef<HTMLSpanElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 流式释放文字
  useEffect(() => {
    if (!isStreaming || blocks.length === 0) {
      // 直接显示全部
      setStreamedBlocks(blocks.map((b) => ({ ...b, displayedChars: b.text.length })));
      return;
    }

    let blockIdx = 0;
    let charIdx = 0;

    setStreamedBlocks(blocks.map((b) => ({ ...b, displayedChars: 0 })));

    intervalRef.current = setInterval(() => {
      setStreamedBlocks((prev) => {
        if (blockIdx >= blocks.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }

        const updated = [...prev];
        const target = blocks[blockIdx].text.length;

        charIdx += 3; // 每帧释放 3 个字符
        if (charIdx >= target) {
          charIdx = 0;
          blockIdx++;
          if (blockIdx < blocks.length) {
            updated[blockIdx] = { ...blocks[blockIdx], displayedChars: 0 };
          } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }

        if (blockIdx < blocks.length) {
          updated[blockIdx] = { ...blocks[blockIdx], displayedChars: charIdx };
        }
        return updated;
      });
    }, 40);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [blocks, isStreaming]);

  // 通知父组件冲突元素引用
  useEffect(() => {
    onConflictRef?.(conflictRef.current);
  }, [onConflictRef, streamedBlocks]);

  if (streamedBlocks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg p-3 space-y-0.5"
      style={{
        background: "rgba(15,13,19,0.6)",
        border: "1px solid var(--border)",
        fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
      }}
    >
      {streamedBlocks.map((block, i) => {
        const style = BLOCK_STYLES[block.type];
        const displayText = block.text.slice(0, block.displayedChars);
        const isConflict =
          highlightConflictText && block.text.includes(highlightConflictText);

        return (
          <AnimatePresence key={i}>
            {block.displayedChars > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={style.className}
                style={
                  block.type === "scene_heading"
                    ? { color: "var(--text-secondary)" }
                    : block.type === "stage_direction"
                    ? { color: "var(--text-muted)" }
                    : block.type === "role_name"
                    ? { color: "var(--gold)" }
                    : block.type === "lyrics"
                    ? {
                        color: "var(--track-music)",
                        borderColor: "var(--track-music)",
                      }
                    : { color: "var(--text-primary)" }
                }
              >
                {style.prefix}
                {isConflict ? (
                  // 冲突文本特殊渲染
                  <span>
                    {displayText.split(highlightConflictText!)[0]}
                    <span
                      ref={(el) => {
                        conflictRef.current = el;
                        onConflictRef?.(el);
                      }}
                      data-conflict-text="true"
                      className="relative"
                      style={{
                        color: "var(--color-conflict)",
                        textShadow: "0 0 8px rgba(220,53,69,0.6)",
                        animation: "pulse-conflict 1.2s infinite",
                      }}
                    >
                      {highlightConflictText}
                    </span>
                    {displayText.split(highlightConflictText!)[1] ?? ""}
                  </span>
                ) : (
                  displayText
                )}
                {style.suffix}
                {/* 光标 */}
                {block.displayedChars < block.text.length && (
                  <span
                    className="inline-block w-0.5 h-3 ml-0.5 align-middle animate-pulse"
                    style={{ background: "var(--gold)" }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        );
      })}
    </motion.div>
  );
}
