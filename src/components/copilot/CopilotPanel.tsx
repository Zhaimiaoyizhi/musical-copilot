"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, AlertTriangle, ChevronDown, ChevronUp, Check, RotateCcw } from "lucide-react";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { assembleSceneContext, getCalledAssetIds } from "@/lib/context/assembleContext";
import { getAdapter } from "@/lib/llm";
import { stripMarkdown, NO_MARKDOWN_SYSTEM } from "@/lib/utils/markdown";
import { ContextChips } from "./ContextChips";
import { ReasoningFlow } from "./ReasoningFlow";
import { mockReasoningSteps } from "@/lib/mock/mockProject";
import { ScriptEditor } from "./ScriptEditor";
import { ConflictLine } from "./ConflictLine";
import type { SceneContext, ConsistencyIssue, ScriptBlock } from "@/types/project";

// ─── 原始文本解析为 ScriptBlock ───────────────────────────────
function parseRawScript(raw: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("【") || line.startsWith("第")) {
      blocks.push({ type: "scene_heading", text: line });
    } else if (line.startsWith("（") || line.startsWith("(")) {
      blocks.push({ type: "stage_direction", text: line.replace(/^[（(]|[）)]$/g, "") });
    } else if (line.startsWith("♪") || line.startsWith("♫")) {
      blocks.push({ type: "lyrics", text: line.replace(/^[♪♫]\s*/, "") });
    } else if (/^[一-龥]{1,6}$/.test(line)) {
      // 1-6 个中文字符的行 → 角色名
      blocks.push({ type: "role_name", text: line });
    } else {
      blocks.push({ type: "dialogue", text: line });
    }
  }
  return blocks;
}

// ─── Demo 固定数据 ────────────────────────────────────────────
const DEMO_CONFLICT_TEXT = "三年前旧礼堂事故的主角就是我母亲";

// 错误示例台词（用于一致性检查演示）
const BAD_SCRIPT_BLOCKS = [
  { type: "scene_heading" as const, text: "第一幕第二场：排练室外走廊" },
  {
    type: "stage_direction" as const,
    text:
      "灯光微暗，走廊尽头隐约可见旧礼堂的封锁线。林夏从排练室走出，看到沈澈站在走廊拐角。",
  },
  { type: "role_name" as const, text: "林夏" },
  { type: "dialogue" as const, text: "你刚才为什么一听到旧礼堂就不说话？" },
  { type: "role_name" as const, text: "沈澈" },
  { type: "dialogue" as const, text: "有些地方不适合好奇。" },
  { type: "role_name" as const, text: "周遥" },
  { type: "dialogue" as const, text: "林夏，别问了，许老师会不高兴。" },
  { type: "role_name" as const, text: "林夏" },
  {
    type: "dialogue" as const,
    text: `原来${DEMO_CONFLICT_TEXT}！`,
  },
  {
    type: "stage_direction" as const,
    text: "短促的音乐动机响起，林夏停在原地。",
  },
];

const GOOD_SCRIPT_BLOCKS = [
  { type: "scene_heading" as const, text: "第一幕第二场：排练室外走廊" },
  {
    type: "stage_direction" as const,
    text:
      "灯光微暗，走廊尽头隐约可见旧礼堂的封锁线。林夏从排练室走出，看到沈澈站在走廊拐角。",
  },
  { type: "role_name" as const, text: "林夏" },
  { type: "dialogue" as const, text: "你刚才为什么一听到旧礼堂就不说话？" },
  { type: "role_name" as const, text: "沈澈" },
  { type: "dialogue" as const, text: "有些地方不适合好奇。" },
  { type: "role_name" as const, text: "周遥" },
  { type: "dialogue" as const, text: "林夏，别问了，许老师会不高兴。" },
  { type: "role_name" as const, text: "林夏" },
  { type: "dialogue" as const, text: "三年前到底发生了什么？" },
  { type: "role_name" as const, text: "沈澈" },
  {
    type: "dialogue" as const,
    text: "你只需要知道，那里会毁掉想站上舞台的人。",
  },
  {
    type: "stage_direction" as const,
    text: "短促的音乐动机响起，林夏停在原地。",
  },
];

// ─── 主组件 ──────────────────────────────────────────────────
export function CopilotPanel() {
  const project = useProjectStore((s) => s.project);
  const setActiveSceneContext = useProjectStore((s) => s.setActiveSceneContext);
  const setCalledAssets = useUIStore((s) => s.setCalledAssetIds);
  const addLog = useUIStore((s) => s.addLog);
  const selectedEventId = useUIStore((s) => s.selectedTimelineEventId);
  const animationPhase = useUIStore((s) => s.animationPhase);
  const setAnimationPhase = useUIStore((s) => s.setAnimationPhase);

  const [ctx, setCtx] = useState<SceneContext | null>(null);
  const [isAssembling, setIsAssembling] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [reasoningDone, setReasoningDone] = useState(false);

  // 生成状态
  const [generateStep, setGenerateStep] = useState<
    "idle" | "streaming" | "done" | "checking" | "conflict" | "fixed"
  >("idle");
  const [currentBlocks, setCurrentBlocks] = useState<ScriptBlock[]>(GOOD_SCRIPT_BLOCKS);
  const [conflictIssue, setConflictIssue] = useState<ConsistencyIssue | null>(null);
  const [conflictVisible, setConflictVisible] = useState(false);
  const [, setConflictTextRef] = useState<HTMLElement | null>(null);

  // 折叠控制
  const [chipsExpanded, setChipsExpanded] = useState(true);
  const [reasoningExpanded, setReasoningExpanded] = useState(true);

  // 当选中事件变化时，重新组装上下文
  useEffect(() => {
    if (!selectedEventId || !project) {
      setCtx(null);
      setCalledAssets([]);
      setActiveSceneContext(null);
      setGenerateStep("idle");
      setShowReasoning(false);
      setReasoningDone(false);
      return;
    }

    setIsAssembling(true);
    setGenerateStep("idle");
    setShowReasoning(false);
    setReasoningDone(false);
    setConflictVisible(false);

    // 短暂延迟模拟"组装中"状态
    const t = setTimeout(() => {
      const assembled = assembleSceneContext(project, selectedEventId);
      setCtx(assembled);
      setActiveSceneContext(assembled);
      if (assembled) {
        const ids = getCalledAssetIds(assembled);
        setCalledAssets(ids);
        addLog(`已组装上下文芯片 ${ids.length} 项`);

        // 显示推演
        setTimeout(() => {
          setShowReasoning(true);
        }, 500);
      }
      setIsAssembling(false);
    }, 600);

    return () => clearTimeout(t);
  }, [selectedEventId, project, setActiveSceneContext, setCalledAssets, addLog]);

  const handleGenerate = useCallback(async () => {
    if (!ctx) return;
    const useMock = useSettingsStore.getState().useMock;
    setAnimationPhase("generating_script");
    setGenerateStep("streaming");
    addLog(useMock ? "Mock 模式：开始流式生成剧本..." : "LLM 模式：调用 API 生成剧本...");

    if (useMock) {
      // Mock：直接展示预录剧本
      setCurrentBlocks(GOOD_SCRIPT_BLOCKS);
      await new Promise((r) =>
        setTimeout(r, GOOD_SCRIPT_BLOCKS.reduce((acc, b) => acc + b.text.length, 0) * 25 + 500)
      );
    } else {
      // LLM 真实流式生成
      try {
        const adapter = getAdapter();
        const userPrompt = `当前场景：${ctx.sceneCard.title}（第${ctx.timelineEvent.act}幕第${ctx.timelineEvent.scene}场）
地点：${ctx.sceneCard.location}
戏剧目标：${ctx.sceneCard.dramaticGoal}
核心冲突：${ctx.sceneCard.coreConflict}
登场角色：${ctx.characterCards.map((c) => c.name).join("、")}
必须发生：${ctx.sceneCard.requiredBeats.join("；")}
禁止透露：${ctx.sceneCard.forbiddenReveal.join("；")}

请用中文写出本场完整剧本。
- 场景标题写在第一行，用【】包裹
- 舞台提示用（）括号
- 角色名单独一行，后面跟台词
- 歌词用♪符号开头`;
        const messages = [
          { role: "system" as const, content: NO_MARKDOWN_SYSTEM },
          { role: "user" as const, content: userPrompt },
        ];
        let rawText = "";
        const stream = adapter.stream(messages);
        for await (const chunk of stream) {
          rawText += chunk;
        }
        // 清洗 Markdown 格式后解析
        const cleaned = stripMarkdown(rawText);
        const blocks: ScriptBlock[] = parseRawScript(cleaned);
        setCurrentBlocks(blocks.length > 0 ? blocks : GOOD_SCRIPT_BLOCKS);
      } catch (err) {
        addLog(`LLM 调用失败，回退 Mock：${String(err)}`);
        setCurrentBlocks(GOOD_SCRIPT_BLOCKS);
      }
    }

    setGenerateStep("done");
    setAnimationPhase("script_ready");
    addLog("✓ 剧本生成完毕");
  }, [ctx, addLog, setAnimationPhase]);

  const handleCheck = useCallback(async () => {
    if (generateStep !== "done" && generateStep !== "conflict") return;
    setAnimationPhase("checking_consistency");
    setGenerateStep("checking");
    addLog("正在执行一致性检查...");
    await new Promise((r) => setTimeout(r, 1200));

    // Demo：切换到含冲突的剧本，然后展示冲突
    setCurrentBlocks(BAD_SCRIPT_BLOCKS);

    const issue: ConsistencyIssue = {
      id: "ci_01",
      projectId: "proj_demo_01",
      sceneId: "sc_02",
      sourceType: "worldbook",
      sourceId: "wb_05",
      sourceField: "content",
      scriptText: DEMO_CONFLICT_TEXT,
      reason:
        "林夏在第一幕中说出了与母亲有关的事故信息，违反了世界书硬约束：第一幕结束前林夏不能知道事故与母亲有关。",
      suggestion: '将台词改为疑问式：「旧礼堂那次事故……和我有什么关系吗？」',
      severity: "high",
    };

    await new Promise((r) => setTimeout(r, 500));
    setConflictIssue(issue);
    setGenerateStep("conflict");
    setConflictVisible(true);
    setAnimationPhase("consistency_done");
    addLog("⚠ 发现 1 项一致性冲突：林夏提前知道母亲秘密");
  }, [generateStep, addLog, setAnimationPhase]);

  const handleFix = useCallback(() => {
    setCurrentBlocks(GOOD_SCRIPT_BLOCKS);
    setConflictVisible(false);
    setConflictIssue(null);
    setGenerateStep("fixed");
    setCalledAssets([]);
    addLog("已修改剧本，冲突已解除");
  }, [setCalledAssets, addLog]);

  const handleReset = useCallback(() => {
    setGenerateStep("idle");
    setConflictVisible(false);
    setConflictIssue(null);
  }, []);

  // 使用 mock 推演步骤（后续可改为从 LLM 生成）
  const reasoningSteps = mockReasoningSteps;

  const selectedChar = ctx?.characterCards[0];

  return (
    <>
      {/* ConflictLine overlay */}
      {conflictIssue && (
        <ConflictLine
          issue={conflictIssue}
          isVisible={conflictVisible}
          onClose={() => setConflictVisible(false)}
        />
      )}

      <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between shrink-0">
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--gold)", fontFamily: '"Playfair Display", serif' }}
          >
            Copilot 生成面板
          </h3>
          {generateStep !== "idle" && (
            <button
              onClick={handleReset}
              className="p-1 rounded opacity-40 hover:opacity-80 transition-opacity"
              title="重置"
            >
              <RotateCcw size={13} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!ctx ? (
            /* ── 空状态 ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <p
                className="text-xs text-center leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                在时间轴中点击场景节点
                <br />
                资产将飞入此面板
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={selectedEventId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              {/* ── 当前场景信息 ── */}
              <div
                className="rounded-lg p-2.5 border shrink-0"
                style={{
                  background: "var(--bg-card)",
                  borderColor: isAssembling ? "var(--gold-dim)" : "var(--border)",
                  transition: "border-color 0.3s",
                }}
              >
                {isAssembling ? (
                  <p className="text-xs animate-pulse" style={{ color: "var(--gold-dim)" }}>
                    正在组装场景上下文...
                  </p>
                ) : (
                  <>
                    <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                      当前场景
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--gold)" }}
                    >
                      {ctx.sceneCard.title}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      第{ctx.timelineEvent.act}幕 · 第{ctx.timelineEvent.scene}场 ·{" "}
                      {ctx.sceneCard.location}
                    </p>
                  </>
                )}
              </div>

              {/* ── 上下文芯片 ── */}
              {!isAssembling && (
                <div
                  className="rounded-lg border p-2.5 shrink-0"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <button
                    className="flex items-center justify-between w-full mb-2"
                    onClick={() => setChipsExpanded((v) => !v)}
                  >
                    <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      上下文芯片
                    </span>
                    {chipsExpanded ? (
                      <ChevronUp size={12} style={{ color: "var(--text-muted)" }} />
                    ) : (
                      <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
                    )}
                  </button>
                  <AnimatePresence>
                    {chipsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <ContextChips ctx={ctx} isAnimating={isAssembling} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── 人物动机推演 ── */}
              {showReasoning && selectedChar && (
                <div
                  className="rounded-lg border p-2.5 shrink-0"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <button
                    className="flex items-center justify-between w-full mb-2"
                    onClick={() => setReasoningExpanded((v) => !v)}
                  >
                    <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      人物动机推演
                    </span>
                    {reasoningExpanded ? (
                      <ChevronUp size={12} style={{ color: "var(--text-muted)" }} />
                    ) : (
                      <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
                    )}
                  </button>
                  <AnimatePresence>
                    {reasoningExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <ReasoningFlow
                          steps={reasoningSteps}
                          characterName={selectedChar.name}
                          characterColor={selectedChar.color}
                          autoPlay
                          onComplete={() => setReasoningDone(true)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── 操作按钮 ── */}
              <div className="flex flex-col gap-2 shrink-0">
                {/* 生成剧本 */}
                <motion.button
                  data-demo="btn-generate-script"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGenerate}
                  disabled={generateStep === "streaming" || generateStep === "checking"}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background:
                      generateStep === "done" || generateStep === "conflict" || generateStep === "fixed"
                        ? "var(--color-confirm)" + "33"
                        : "var(--gold)",
                    color:
                      generateStep === "done" || generateStep === "conflict" || generateStep === "fixed"
                        ? "var(--color-confirm)"
                        : "var(--bg-curtain)",
                    border:
                      generateStep === "done" || generateStep === "fixed"
                        ? "1px solid var(--color-confirm)"
                        : "none",
                    opacity: generateStep === "streaming" || generateStep === "checking" ? 0.6 : 1,
                  }}
                >
                  {generateStep === "streaming" ? (
                    <span className="flex items-center gap-2">
                      <span className="flex gap-0.5">
                        {[0,1,2].map(i => (
                          <motion.span key={i} className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ background: "var(--bg-curtain)" }}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                        ))}
                      </span>
                      生成对话中...
                    </span>
                  ) : generateStep === "done" || generateStep === "fixed" ? (
                    <>
                      <Check size={14} />
                      剧本已生成
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      生成剧本
                    </>
                  )}
                </motion.button>

                {/* 一致性检查 */}
                {(generateStep === "done" || generateStep === "conflict" || generateStep === "fixed") && (
                  <motion.button
                    data-demo="btn-check-consistency"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCheck}
                    disabled={(generateStep as string) === "checking" || generateStep === "fixed"}
                    className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background:
                        generateStep === "conflict"
                          ? "var(--color-conflict)" + "20"
                          : "var(--bg-card)",
                      color:
                        generateStep === "conflict"
                          ? "var(--color-conflict)"
                          : "var(--text-secondary)",
                      border:
                        generateStep === "conflict"
                          ? "1px solid var(--color-conflict)"
                          : "1px solid var(--border)",
                    }}
                  >
                    {(generateStep as string) === "checking" ? (
                      <span className="flex items-center gap-2">
                        <span className="flex gap-0.5">
                          {[0,1,2].map(i => (
                            <motion.span key={i} className="inline-block w-1 h-1 rounded-full"
                              style={{ background: "currentColor" }}
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
                          ))}
                        </span>
                        一致性检查中...
                      </span>
                    ) : generateStep === "conflict" ? (
                      <>
                        <AlertTriangle size={13} />
                        发现 1 项冲突 — 点击查看
                      </>
                    ) : (
                      "触发一致性检查"
                    )}
                  </motion.button>
                )}

                {/* 修改剧本（冲突时显示） */}
                {generateStep === "conflict" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex gap-2"
                  >
                    <button
                      data-demo="btn-fix-conflict"
                      onClick={handleFix}
                      className="flex-1 py-2 rounded-lg text-xs border transition-colors"
                      style={{
                        borderColor: "var(--color-confirm)",
                        color: "var(--color-confirm)",
                        background: "var(--color-confirm)" + "12",
                      }}
                    >
                      修改剧本
                    </button>
                    <button
                      onClick={() => {
                        useUIStore.getState().setLeftPanelTab("worldbook");
                        useUIStore.getState().addLog("跳转至世界书面板，可修改硬约束设定");
                      }}
                      className="flex-1 py-2 rounded-lg text-xs border transition-colors"
                      style={{
                        borderColor: "var(--gold-dim)",
                        color: "var(--gold-dim)",
                        background: "var(--gold-dim)" + "12",
                      }}
                    >
                      修改资产
                    </button>
                  </motion.div>
                )}

                {generateStep === "fixed" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-center py-1"
                    style={{ color: "var(--color-confirm)" }}
                  >
                    ✓ 冲突已解除，演示链路完成
                  </motion.div>
                )}
              </div>

              {/* ── 剧本文本 ── */}
              {generateStep !== "idle" && (
                <div className="shrink-0">
                  <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    剧本文本
                  </p>
                  <ScriptEditor
                    blocks={currentBlocks}
                    isStreaming={generateStep === "streaming"}
                    highlightConflictText={
                      generateStep === "conflict" || conflictVisible
                        ? DEMO_CONFLICT_TEXT
                        : undefined
                    }
                    onConflictRef={setConflictTextRef}
                    onBlocksChange={(blocks) => setCurrentBlocks(blocks)}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
