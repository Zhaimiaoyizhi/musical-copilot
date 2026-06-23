"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  RefObject,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Check, Copy, Pencil, Sparkles, X } from "lucide-react";
import type { ScriptBlock } from "@/types/project";
import { getAdapter } from "@/lib/llm";
import { useSettingsStore } from "@/lib/store/settingsStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScriptEditorProps {
  blocks: ScriptBlock[];
  isStreaming?: boolean;
  highlightConflictText?: string;
  onConflictRef?: (el: HTMLElement | null) => void;
  onBlocksChange?: (blocks: ScriptBlock[]) => void;
}

interface StreamedBlock extends ScriptBlock {
  /** how many chars are currently visible (used only while streaming) */
  displayedChars: number;
}

interface FloatingMenuPos {
  x: number;
  y: number;
  blockIndex: number;
  selectedText: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHAR_INTERVAL_MS = 30;
const CHARS_PER_TICK = 3;

/** Block-type → base Tailwind classes */
const BLOCK_CLS: Record<ScriptBlock["type"], string> = {
  scene_heading: "text-xs uppercase tracking-wider font-semibold mb-2 mt-1",
  role_name: "text-sm font-bold mt-2 mb-0.5",
  dialogue: "text-sm leading-relaxed mb-1",
  stage_direction: "text-xs italic mb-1.5",
  lyrics: "text-sm italic leading-relaxed mb-1 pl-3 border-l-2",
};

/** Block-type → inline colour / border style */
function blockInlineStyle(type: ScriptBlock["type"]): React.CSSProperties {
  switch (type) {
    case "scene_heading":
      return { color: "var(--text-muted)" };
    case "role_name":
      return { color: "var(--gold)" };
    case "dialogue":
      return { color: "var(--text-primary)" };
    case "stage_direction":
      return { color: "var(--text-secondary)" };
    case "lyrics":
      return { color: "#b8860b", borderColor: "#b8860b" };
  }
}

/** Blocks where AI rewrite is available */
const REWRITABLE_TYPES: ScriptBlock["type"][] = ["dialogue", "lyrics"];

// ---------------------------------------------------------------------------
// Helper: highlight conflict text inside a string
// ---------------------------------------------------------------------------

function renderWithConflict(
  text: string,
  conflict: string | undefined,
  conflictRefSetter: (el: HTMLElement | null) => void
): React.ReactNode {
  if (!conflict || !text.includes(conflict)) return text;

  const parts = text.split(conflict);
  return (
    <>
      {parts[0]}
      <span
        ref={conflictRefSetter}
        data-conflict-text="true"
        style={{
          color: "var(--color-conflict)",
          textShadow: "0 0 8px rgba(220,53,69,0.6)",
          animation: "pulse-conflict 1.2s infinite",
        }}
      >
        {conflict}
      </span>
      {parts.slice(1).join(conflict)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Hook: typewriter reveal for streaming mode
// ---------------------------------------------------------------------------

function useTypewriter(
  blocks: ScriptBlock[],
  isStreaming: boolean
): StreamedBlock[] {
  const [streamedBlocks, setStreamedBlocks] = useState<StreamedBlock[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isStreaming || blocks.length === 0) {
      setStreamedBlocks(
        blocks.map((b) => ({ ...b, displayedChars: b.text.length }))
      );
      return;
    }

    // Start fresh
    setStreamedBlocks(blocks.map((b) => ({ ...b, displayedChars: 0 })));

    let blockIdx = 0;
    let charIdx = 0;

    intervalRef.current = setInterval(() => {
      setStreamedBlocks((prev) => {
        if (blockIdx >= blocks.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }

        const updated = [...prev];
        const target = blocks[blockIdx].text.length;

        charIdx += CHARS_PER_TICK;

        if (charIdx >= target) {
          // finish current block, move to next
          updated[blockIdx] = { ...blocks[blockIdx], displayedChars: target };
          charIdx = 0;
          blockIdx++;
          if (blockIdx < blocks.length) {
            updated[blockIdx] = { ...blocks[blockIdx], displayedChars: 0 };
          } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        } else {
          updated[blockIdx] = {
            ...blocks[blockIdx],
            displayedChars: charIdx,
          };
        }

        return updated;
      });
    }, CHAR_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [blocks, isStreaming]);

  return streamedBlocks;
}

// ---------------------------------------------------------------------------
// Sub-component: Floating AI-rewrite menu (portal)
// ---------------------------------------------------------------------------

interface FloatingMenuProps {
  pos: FloatingMenuPos;
  isRewrting: boolean;
  onRewrite: () => void;
  onClose: () => void;
}

function FloatingMenu({ pos, isRewrting, onRewrite, onClose }: FloatingMenuProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="floating-menu"
        initial={{ opacity: 0, scale: 0.9, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.12 }}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          background: "#1a1522",
          border: "1px solid var(--gold)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={onRewrite}
          disabled={isRewrting}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: isRewrting ? "var(--text-muted)" : "var(--gold)",
            background: "none",
            border: "none",
            cursor: isRewrting ? "not-allowed" : "pointer",
            padding: 0,
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          <Sparkles size={12} />
          {isRewrting ? "改写中…" : "AI改写"}
        </button>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            color: "var(--text-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ScriptEditor({
  blocks,
  isStreaming = false,
  highlightConflictText,
  onConflictRef,
  onBlocksChange,
}: ScriptEditorProps) {
  // ── state ──────────────────────────────────────────────────────────────────
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBlocks, setEditedBlocks] = useState<ScriptBlock[]>(blocks);
  const [copied, setCopied] = useState(false);
  const [floatingMenu, setFloatingMenu] = useState<FloatingMenuPos | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewritingBlockIdx, setRewritingBlockIdx] = useState<number | null>(null);

  // refs
  const conflictRef = useRef<HTMLElement | null>(null);
  const editDivsRef = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // settings
  const useMock = useSettingsStore((s) => s.useMock);

  // typewriter hook
  const streamedBlocks = useTypewriter(blocks, isStreaming);

  // keep editedBlocks in sync when blocks prop changes
  useEffect(() => {
    setEditedBlocks(blocks);
  }, [blocks]);

  // notify parent of conflict ref
  useEffect(() => {
    onConflictRef?.(conflictRef.current);
  }, [onConflictRef, streamedBlocks]);

  // ── copy to clipboard ──────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    const text = blocks
      .map((b) => {
        if (b.type === "stage_direction") return `（${b.text}）`;
        if (b.type === "scene_heading") return b.text.toUpperCase();
        return b.text;
      })
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [blocks]);

  // ── edit mode ──────────────────────────────────────────────────────────────
  const handleEnterEdit = () => {
    setEditedBlocks([...blocks]);
    setIsEditMode(true);
    setFloatingMenu(null);
  };

  const handleSaveEdit = () => {
    // parse contentEditable divs back to ScriptBlock[]
    const updated: ScriptBlock[] = editedBlocks.map((block, i) => {
      const el = editDivsRef.current[i];
      const text = el?.innerText ?? block.text;
      return { ...block, text };
    });
    setIsEditMode(false);
    onBlocksChange?.(updated);
  };

  // ── text selection → floating menu ────────────────────────────────────────
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isEditMode || isStreaming) return;

      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        setFloatingMenu(null);
        return;
      }

      const selectedText = selection.toString();

      // Determine which block was the anchor of the selection
      const anchorNode = selection.anchorNode;
      if (!anchorNode || !containerRef.current) {
        setFloatingMenu(null);
        return;
      }

      // Walk up to find the block container with data-block-index
      let el: Node | null = anchorNode;
      let blockIndex = -1;
      while (el && el !== containerRef.current) {
        if (el instanceof HTMLElement) {
          const idx = el.getAttribute("data-block-index");
          if (idx !== null) {
            blockIndex = parseInt(idx, 10);
            break;
          }
        }
        el = el.parentNode;
      }

      if (blockIndex === -1) {
        setFloatingMenu(null);
        return;
      }

      const blockType = blocks[blockIndex]?.type;
      if (!REWRITABLE_TYPES.includes(blockType)) {
        setFloatingMenu(null);
        return;
      }

      // Position near the end of the selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setFloatingMenu({
        x: rect.right + 8,
        y: rect.top - 4,
        blockIndex,
        selectedText,
      });
    },
    [isEditMode, isStreaming, blocks]
  );

  // dismiss floating menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // If clicking inside the floating menu itself, don't dismiss
      const target = e.target as HTMLElement;
      if (target.closest("[data-floating-menu]")) return;
      setFloatingMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── AI rewrite ─────────────────────────────────────────────────────────────
  const handleAIRewrite = useCallback(async () => {
    if (!floatingMenu) return;
    const { blockIndex, selectedText } = floatingMenu;
    setFloatingMenu(null);
    setIsRewriting(true);
    setRewritingBlockIdx(blockIndex);

    try {
      if (useMock) {
        // Mock: fake rewrite
        await new Promise((r) => setTimeout(r, 600));
        const mockResult =
          selectedText.slice(0, Math.floor(selectedText.length * 0.8)) +
          "（改写版）";
        const updated = blocks.map((b, i) =>
          i === blockIndex
            ? { ...b, text: b.text.replace(selectedText, mockResult) }
            : b
        );
        onBlocksChange?.(updated);
      } else {
        const adapter = getAdapter();
        const prompt = `请将以下台词改写，保持角色语气和戏剧功能，使其更加自然流畅：\n\n${selectedText}`;
        const gen = adapter.stream([{ role: "user", content: prompt }]);

        let rewritten = "";
        for await (const chunk of gen) {
          rewritten += chunk;
        }

        const updated = blocks.map((b, i) =>
          i === blockIndex
            ? { ...b, text: b.text.replace(selectedText, rewritten.trim()) }
            : b
        );
        onBlocksChange?.(updated);
      }
    } catch (err) {
      console.error("[ScriptEditor] AI rewrite failed:", err);
    } finally {
      setIsRewriting(false);
      setRewritingBlockIdx(null);
    }
  }, [floatingMenu, useMock, blocks, onBlocksChange]);

  // ── render helpers ─────────────────────────────────────────────────────────

  const conflictRefSetter = useCallback(
    (el: HTMLElement | null) => {
      conflictRef.current = el;
      onConflictRef?.(el);
    },
    [onConflictRef]
  );

  if (streamedBlocks.length === 0 && blocks.length === 0) return null;

  const displayBlocks = isStreaming ? streamedBlocks : (isEditMode ? editedBlocks : blocks);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-xl p-4 space-y-0.5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
      }}
    >
      {/* ── toolbar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
          zIndex: 10,
        }}
      >
        {!isStreaming && !isEditMode && (
          <>
            {/* copy */}
            <button
              onClick={handleCopy}
              title="复制剧本"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: 6,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border)",
                cursor: "pointer",
                color: copied ? "var(--color-confirm)" : "var(--text-muted)",
                transition: "color 0.2s",
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>

            {/* edit mode toggle */}
            <button
              onClick={handleEnterEdit}
              title="编辑剧本"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 6,
                background: "rgba(201,169,110,0.12)",
                border: "1px solid var(--gold)",
                cursor: "pointer",
                color: "var(--gold)",
                fontSize: 11,
                fontFamily: "sans-serif",
              }}
            >
              <Pencil size={11} />
              编辑
            </button>
          </>
        )}

        {isEditMode && (
          <button
            onClick={handleSaveEdit}
            title="保存编辑"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(45,139,87,0.18)",
              border: "1px solid var(--color-confirm)",
              cursor: "pointer",
              color: "var(--color-confirm)",
              fontSize: 11,
              fontFamily: "sans-serif",
            }}
          >
            <Check size={11} />
            完成
          </button>
        )}
      </div>

      {/* ── script blocks ─────────────────────────────────────────────────── */}
      <div ref={containerRef} onMouseUp={handleMouseUp}>
        {displayBlocks.map((block, i) => {
          const sb = block as StreamedBlock;
          const displayedChars =
            isStreaming && sb.displayedChars !== undefined
              ? sb.displayedChars
              : block.text.length;

          const displayText = block.text.slice(0, displayedChars);
          const isLastActiveBlock =
            isStreaming &&
            i === displayBlocks.findIndex(
              (b, idx) =>
                idx === displayBlocks.length - 1 ||
                (b as StreamedBlock).displayedChars < b.text.length
            );

          const showCursor =
            isStreaming && displayedChars < block.text.length;

          const prefix =
            block.type === "stage_direction" ? "（" : undefined;
          const suffix =
            block.type === "stage_direction" ? "）" : undefined;

          const isBeingRewritten = rewritingBlockIdx === i;

          if (isEditMode) {
            return (
              <AnimatePresence key={`edit-${i}`}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={BLOCK_CLS[block.type]}
                  style={{
                    ...blockInlineStyle(block.type),
                    outline: "none",
                    borderBottom: "1px dashed var(--border)",
                    paddingBottom: 2,
                    minHeight: 20,
                    cursor: "text",
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => {
                    editDivsRef.current[i] = el;
                  }}
                  data-block-index={i}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    const updated = [...editedBlocks];
                    updated[i] = { ...updated[i], text: el.innerText };
                    setEditedBlocks(updated);
                  }}
                >
                  {block.text}
                </motion.div>
              </AnimatePresence>
            );
          }

          // View mode
          const isVisible = !isStreaming || displayedChars > 0;

          return (
            <AnimatePresence key={`view-${i}`}>
              {isVisible && (
                <motion.div
                  initial={isStreaming ? { opacity: 0, y: 4 } : { opacity: 1 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={BLOCK_CLS[block.type]}
                  style={{
                    ...blockInlineStyle(block.type),
                    opacity: isBeingRewritten ? 0.5 : 1,
                    transition: "opacity 0.3s",
                  }}
                  data-block-index={i}
                >
                  {prefix}
                  {renderWithConflict(
                    displayText,
                    highlightConflictText,
                    conflictRefSetter
                  )}
                  {suffix}
                  {/* typewriter cursor */}
                  {showCursor && (
                    <span
                      className="inline-block align-middle ml-0.5 animate-pulse"
                      style={{
                        width: 2,
                        height: "0.9em",
                        background: "var(--gold)",
                        borderRadius: 1,
                        display: "inline-block",
                        verticalAlign: "middle",
                      }}
                    />
                  )}
                  {isBeingRewritten && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        color: "var(--gold)",
                        fontFamily: "sans-serif",
                        opacity: 0.8,
                      }}
                    >
                      ✦ 改写中…
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          );
        })}
      </div>

      {/* ── floating AI-rewrite menu ──────────────────────────────────────── */}
      {floatingMenu && !isEditMode && !isStreaming && (
        <div data-floating-menu="true">
          <FloatingMenu
            pos={floatingMenu}
            isRewrting={isRewriting}
            onRewrite={handleAIRewrite}
            onClose={() => setFloatingMenu(null)}
          />
        </div>
      )}
    </motion.div>
  );
}

export default ScriptEditor;
