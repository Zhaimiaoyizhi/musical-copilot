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
import { ContextChips } from "@/components/copilot/ContextChips";
import { ReasoningFlow } from "@/components/copilot/ReasoningFlow";
import { mockReasoningSteps } from "@/lib/mock/mockProject";
import { ScriptEditor } from "@/components/copilot/ScriptEditor";
import { ConflictLine } from "@/components/copilot/ConflictLine";
import type { SceneContext, ConsistencyIssue, ScriptBlock } from "@/types/project";

// ─── 解析原始文本 ──────────────────────────────────────────────
function parseRawScript(raw: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith("【") || line.startsWith("第")) {
      blocks.push({ type: "scene_heading", text: line });
    } else if (line.startsWith("（") || line.startsWith("(")) {
      blocks.push({ type: "stage_direction", text: line.replace(/^[（(]|[）)]$/g, "") });
    } else if (line.startsWith("♪") || line.startsWith("♫")) {
      blocks.push({ type: "lyrics", text: line.replace(/^[♪♫]\s*/, "") });
    } else if (/^[一-龥]{1,6}$/.test(line)) {
      blocks.push({ type: "role_name", text: line });
    } else {
      blocks.push({ type: "dialogue", text: line });
    }
  }
  return blocks;
}

// ─── Demo 数据 ────────────────────────────────────────────────
const DEMO_CONFLICT_TEXT = "三年前旧礼堂事故的主角就是我母亲";

const BAD_SCRIPT_BLOCKS: ScriptBlock[] = [
  { type: "scene_heading", text: "第一幕第二场：排练室外走廊" },
  { type: "stage_direction", text: "灯光微暗，走廊尽头隐约可见旧礼堂的封锁线。林夏从排练室走出，看到沈澈站在走廊拐角。" },
  { type: "role_name", text: "林夏" },
  { type: "dialogue", text: "你刚才为什么一听到旧礼堂就不说话？" },
  { type: "role_name", text: "沈澈" },
  { type: "dialogue", text: "有些地方不适合好奇。" },
  { type: "role_name", text: "周遥" },
  { type: "dialogue", text: "林夏，别问了，许老师会不高兴。" },
  { type: "role_name", text: "林夏" },
  { type: "dialogue", text: `原来${DEMO_CONFLICT_TEXT}！` },
  { type: "stage_direction", text: "短促的音乐动机响起，林夏停在原地。" },
];

const GOOD_SCRIPT_BLOCKS: ScriptBlock[] = [
  { type: "scene_heading", text: "第一幕第二场：排练室外走廊" },
  { type: "stage_direction", text: "灯光微暗，走廊尽头隐约可见旧礼堂的封锁线。林夏从排练室走出，看到沈澈站在走廊拐角。" },
  { type: "role_name", text: "林夏" },
  { type: "dialogue", text: "你刚才为什么一听到旧礼堂就不说话？" },
  { type: "role_name", text: "沈澈" },
  { type: "dialogue", text: "有些地方不适合好奇。" },
  { type: "role_name", text: "周遥" },
  { type: "dialogue", text: "林夏，别问了，许老师会不高兴。" },
  { type: "role_name", text: "林夏" },
  { type: "dialogue", text: "三年前到底发生了什么？" },
  { type: "role_name", text: "沈澈" },
  { type: "dialogue", text: "你只需要知道，那里会毁掉想站上舞台的人。" },
  { type: "stage_direction", text: "短促的音乐动机响起，林夏停在原地。" },
];

// ─── ScriptEditorPanel ────────────────────────────────────────
export function ScriptEditorPanel() {
  const project            = useProjectStore((s) => s.project);
  const setActiveSceneContext = useProjectStore((s) => s.setActiveSceneContext);
  const setCalledAssets    = useUIStore((s) => s.setCalledAssetIds);
  const addLog             = useUIStore((s) => s.addLog);
  const selectedEventId    = useUIStore((s) => s.selectedTimelineEventId);
  const setAnimationPhase  = useUIStore((s) => s.setAnimationPhase);

  const [ctx, setCtx]                     = useState<SceneContext | null>(null);
  const [isAssembling, setIsAssembling]   = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [reasoningDone, setReasoningDone] = useState(false);
  const [generateStep, setGenerateStep]   = useState<"idle"|"streaming"|"done"|"checking"|"conflict"|"fixed">("idle");
  const [currentBlocks, setCurrentBlocks] = useState<ScriptBlock[]>(GOOD_SCRIPT_BLOCKS);
  const [conflictIssue, setConflictIssue] = useState<ConsistencyIssue | null>(null);
  const [conflictVisible, setConflictVisible] = useState(false);
  const [, setConflictTextRef]            = useState<HTMLElement | null>(null);
  const [chipsExpanded, setChipsExpanded]         = useState(true);
  const [reasoningExpanded, setReasoningExpanded] = useState(true);

  // 选中场景变化时重组上下文
  useEffect(() => {
    if (!selectedEventId || !project) {
      setCtx(null); setCalledAssets([]); setActiveSceneContext(null);
      setGenerateStep("idle"); setShowReasoning(false); setReasoningDone(false);
      return;
    }
    setIsAssembling(true); setGenerateStep("idle");
    setShowReasoning(false); setReasoningDone(false); setConflictVisible(false);
    const t = setTimeout(() => {
      const assembled = assembleSceneContext(project, selectedEventId);
      setCtx(assembled);
      setActiveSceneContext(assembled);
      if (assembled) {
        const ids = getCalledAssetIds(assembled);
        setCalledAssets(ids);
        addLog(`已组装上下文芯片 ${ids.length} 项`);
        setTimeout(() => setShowReasoning(true), 500);
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
      setCurrentBlocks(GOOD_SCRIPT_BLOCKS);
      await new Promise((r) => setTimeout(r, GOOD_SCRIPT_BLOCKS.reduce((a, b) => a + b.text.length, 0) * 25 + 500));
    } else {
      try {
        const adapter = getAdapter();
        const userPrompt = `当前场景：${ctx.sceneCard.title}（第${ctx.timelineEvent.act}幕第${ctx.timelineEvent.scene}场）\n地点：${ctx.sceneCard.location}\n戏剧目标：${ctx.sceneCard.dramaticGoal}\n核心冲突：${ctx.sceneCard.coreConflict}\n登场角色：${ctx.characterCards.map((c) => c.name).join("、")}\n必须发生：${ctx.sceneCard.requiredBeats.join("；")}\n禁止透露：${ctx.sceneCard.forbiddenReveal.join("；")}\n\n请用中文写出本场完整剧本。\n- 场景标题写在第一行，用【】包裹\n- 舞台提示用（）括号\n- 角色名单独一行，后面跟台词\n- 歌词用♪符号开头`;
        const messages = [
          { role: "system" as const, content: NO_MARKDOWN_SYSTEM },
          { role: "user" as const, content: userPrompt },
        ];
        let rawText = "";
        for await (const chunk of adapter.stream(messages)) rawText += chunk;
        const blocks = parseRawScript(stripMarkdown(rawText));
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
    setCurrentBlocks(BAD_SCRIPT_BLOCKS);
    const issue: ConsistencyIssue = {
      id: "ci_01", projectId: "proj_demo_01", sceneId: "sc_02",
      sourceType: "worldbook", sourceId: "wb_05", sourceField: "content",
      scriptText: DEMO_CONFLICT_TEXT,
      reason: "林夏在第一幕中说出了与母亲有关的事故信息，违反了世界书硬约束：第一幕结束前林夏不能知道事故与母亲有关。",
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
    setConflictVisible(false); setConflictIssue(null);
    setGenerateStep("fixed"); setCalledAssets([]);
    addLog("已修改剧本，冲突已解除");
  }, [setCalledAssets, addLog]);

  const handleReset = useCallback(() => {
    setGenerateStep("idle"); setConflictVisible(false); setConflictIssue(null);
  }, []);

  const selectedChar = ctx?.characterCards[0];

  // ── 空状态（未选中场景）──────────────────────────────────────
  if (!ctx && !isAssembling) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "var(--bg-curtain)" }}>
        <p className="text-sm text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
          在时间轴中点击场景节点
          <br />
          <span style={{ color: "var(--text-secondary)" }}>上下文芯片将飞入，AI 将开始为你创作</span>
        </p>
      </div>
    );
  }

  return (
    <>
      {conflictIssue && (
        <ConflictLine issue={conflictIssue} isVisible={conflictVisible} onClose={() => setConflictVisible(false)} />
      )}

      {/* ── 两列布局：左侧工具栏 + 右侧剧本 ── */}
      <div className="h-full flex overflow-hidden" style={{ background: "var(--bg-curtain)" }}>

        {/* 左侧控制栏 */}
        <div
          className="shrink-0 flex flex-col gap-3 p-3 overflow-y-auto border-r"
          style={{ width: 280, borderColor: "var(--border)", background: "var(--bg-panel)" }}
        >
          {/* 标题 + 重置 */}
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold" style={{ color: "var(--gold)", fontFamily: '"Playfair Display", serif' }}>
              剧本生成
            </h3>
            {generateStep !== "idle" && (
              <button onClick={handleReset} className="p-1 rounded opacity-40 hover:opacity-80 transition-opacity" title="重置">
                <RotateCcw size={13} style={{ color: "var(--text-secondary)" }} />
              </button>
            )}
          </div>

          {/* 场景信息卡 */}
          <div className="rounded-lg p-2.5 border shrink-0"
            style={{ background: "var(--bg-card)", borderColor: isAssembling ? "var(--gold-dim)" : "var(--border)", transition: "border-color 0.3s" }}>
            {isAssembling ? (
              <p className="text-xs animate-pulse" style={{ color: "var(--gold-dim)" }}>正在组装场景上下文...</p>
            ) : ctx ? (
              <>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>当前场景</p>
                <p className="text-sm font-semibold" style={{ color: "var(--gold)" }}>{ctx.sceneCard.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  第{ctx.timelineEvent.act}幕 · 第{ctx.timelineEvent.scene}场 · {ctx.sceneCard.location}
                </p>
              </>
            ) : null}
          </div>

          {/* 上下文芯片（可折叠） */}
          {ctx && !isAssembling && (
            <div className="rounded-lg border p-2.5 shrink-0" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <button className="flex items-center justify-between w-full mb-2" onClick={() => setChipsExpanded((v) => !v)}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>上下文芯片</span>
                {chipsExpanded ? <ChevronUp size={12} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />}
              </button>
              <AnimatePresence>
                {chipsExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <ContextChips ctx={ctx} isAnimating={isAssembling} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 人物动机推演（可折叠） */}
          {showReasoning && selectedChar && (
            <div className="rounded-lg border p-2.5 shrink-0" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <button className="flex items-center justify-between w-full mb-2" onClick={() => setReasoningExpanded((v) => !v)}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>人物动机推演</span>
                {reasoningExpanded ? <ChevronUp size={12} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />}
              </button>
              <AnimatePresence>
                {reasoningExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <ReasoningFlow
                      steps={mockReasoningSteps}
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

          {/* 操作按钮 */}
          {ctx && !isAssembling && (
            <div className="flex flex-col gap-2 shrink-0">
              {/* 生成剧本 */}
              <motion.button
                data-demo="btn-generate-script"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleGenerate}
                disabled={generateStep === "streaming" || generateStep === "checking"}
                className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: ["done","conflict","fixed"].includes(generateStep) ? "var(--color-confirm)33" : "var(--gold)",
                  color: ["done","conflict","fixed"].includes(generateStep) ? "var(--color-confirm)" : "var(--bg-curtain)",
                  border: ["done","fixed"].includes(generateStep) ? "1px solid var(--color-confirm)" : "none",
                  opacity: ["streaming","checking"].includes(generateStep) ? 0.6 : 1,
                }}
              >
                {generateStep === "streaming" ? (
                  <span className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      {[0,1,2].map(i => (
                        <motion.span key={i} className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ background: "var(--bg-curtain)" }}
                          animate={{ y: [0,-4,0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </span>
                    生成对话中...
                  </span>
                ) : ["done","fixed"].includes(generateStep) ? (
                  <><Check size={14} />剧本已生成</>
                ) : (
                  <><Sparkles size={14} />生成剧本</>
                )}
              </motion.button>

              {/* 一致性检查 */}
              {["done","conflict","fixed"].includes(generateStep) && (
                <motion.button
                  data-demo="btn-check-consistency"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleCheck}
                  disabled={generateStep === "checking" || generateStep === "fixed"}
                  className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: generateStep === "conflict" ? "var(--color-conflict)20" : "var(--bg-card)",
                    color: generateStep === "conflict" ? "var(--color-conflict)" : "var(--text-secondary)",
                    border: generateStep === "conflict" ? "1px solid var(--color-conflict)" : "1px solid var(--border)",
                  }}
                >
                  {generateStep === "checking" ? (
                    <span className="flex items-center gap-2">
                      <span className="flex gap-0.5">
                        {[0,1,2].map(i => (
                          <motion.span key={i} className="inline-block w-1 h-1 rounded-full"
                            style={{ background: "currentColor" }}
                            animate={{ opacity: [1,0.3,1] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
                        ))}
                      </span>
                      一致性检查中...
                    </span>
                  ) : generateStep === "conflict" ? (
                    <><AlertTriangle size={13} />发现 1 项冲突 — 点击查看</>
                  ) : "触发一致性检查"}
                </motion.button>
              )}

              {/* 修改剧本 / 修改资产 */}
              {generateStep === "conflict" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex gap-2">
                  <button data-demo="btn-fix-conflict" onClick={handleFix}
                    className="flex-1 py-2 rounded-lg text-xs border transition-colors"
                    style={{ borderColor: "var(--color-confirm)", color: "var(--color-confirm)", background: "var(--color-confirm)12" }}>
                    修改剧本
                  </button>
                  <button
                    onClick={() => { useUIStore.getState().setLeftPanelTab("worldbook"); useUIStore.getState().addLog("跳转至世界书面板，可修改硬约束设定"); }}
                    className="flex-1 py-2 rounded-lg text-xs border transition-colors"
                    style={{ borderColor: "var(--gold-dim)", color: "var(--gold-dim)", background: "var(--gold-dim)12" }}>
                    修改资产
                  </button>
                </motion.div>
              )}

              {generateStep === "fixed" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-center py-1" style={{ color: "var(--color-confirm)" }}>
                  ✓ 冲突已解除，演示链路完成
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* 右侧剧本编辑区 */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {generateStep === "idle" ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {ctx ? "点击「生成剧本」开始创作" : "选中场景后可生成剧本"}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden p-4">
              <ScriptEditor
                blocks={currentBlocks}
                isStreaming={generateStep === "streaming"}
                highlightConflictText={conflictVisible ? DEMO_CONFLICT_TEXT : undefined}
                onConflictRef={setConflictTextRef}
                onBlocksChange={setCurrentBlocks}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
