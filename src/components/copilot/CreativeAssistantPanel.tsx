"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Sparkles, BookOpen, Users, Music2, RotateCcw } from "lucide-react";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { getAdapter } from "@/lib/llm";
import { stripMarkdown, NO_MARKDOWN_SYSTEM } from "@/lib/utils/markdown";

// ─── 类型 ──────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// ─── Mock 回复 ─────────────────────────────────────────────────
const MOCK_REPLIES: Record<string, string> = {
  default:
    "明白了。根据《失声旋律》的世界观设定，我来给你一些建议：\n\n主线矛盾围绕旧礼堂事故展开，林夏的成长弧与沈澈的秘密互相交织。建议在第二幕引入许老师的双重身份作为转折点，让角色关系产生质变。\n\n你希望我重点展开哪个方向？",
  大纲:
    "**大纲结构建议**\n\n基于现有场景卡，推荐三幕式结构：\n\n**第一幕（铺垫）** — 排练室→走廊，林夏初入剧组，旧礼堂谜团初现\n**第二幕（升温）** — 秘密逐渐浮出，角色关系撕裂，音乐主题变奏\n**第三幕（高潮）** — 真相揭露，林夏与母亲过去和解，最终演出\n\n关键情节钩子：许老师手中的「旧乐谱」可作为贯穿三幕的物件道具。",
  剧情:
    "**剧情调试分析**\n\n当前第二场存在节奏偏快的问题——林夏获取信息的速度超过了观众的情感准备时间。\n\n建议：\n1. 在沈澈「有些地方不适合好奇」之后，增加一段沉默与环境音（远处钢琴练习声），让紧张感自然积累\n2. 周遥的阻止台词可以更暧昧——她是出于保护林夏，还是另有隐情？\n3. 场景收尾时，旧礼堂的「封锁线」可以被风吹动，作为视觉悬念",
  人物:
    "**人物塑造分析**\n\n**林夏** — 目前动机较单薄（「想站上舞台」）。建议给她一个隐藏的心理创伤：她对母亲的记忆是模糊且被美化的，这让真相的冲击力在第三幕倍增。\n\n**沈澈** — 作为秘密守护者，他的矛盾在于：究竟是保护林夏还是保护自己？建议在第二幕增加一场戏，让他「险些说出真相又缩回去」，刻画内心撕裂。\n\n**周遥** — 目前功能性较强，缺乏个人弧线。可以让她在第二幕悄悄做了一个「背叛」沈澈的小决定，为第三幕铺垫。",
};

function getMockReply(prompt: string): string {
  if (prompt.includes("大纲") || prompt.includes("结构") || prompt.includes("幕")) return MOCK_REPLIES["大纲"];
  if (prompt.includes("剧情") || prompt.includes("节奏") || prompt.includes("场景")) return MOCK_REPLIES["剧情"];
  if (prompt.includes("人物") || prompt.includes("角色") || prompt.includes("角") ) return MOCK_REPLIES["人物"];
  return MOCK_REPLIES["default"];
}

// ─── 快捷指令 ─────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: BookOpen, label: "大纲创作",  prompt: "帮我梳理这部剧的大纲结构，有什么优化建议？", color: "var(--gold)" },
  { icon: Music2,   label: "剧情调试",  prompt: "分析当前剧情节奏，有没有需要调整的地方？", color: "var(--track-event)" },
  { icon: Users,    label: "人物塑造",  prompt: "帮我深化角色的性格弧线和人物关系",        color: "var(--track-character)" },
];

// ─── 消息气泡 ─────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* 头像 */}
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold mt-0.5"
        style={{
          background: isUser ? "var(--gold)" : "var(--bg-card)",
          color: isUser ? "var(--bg-curtain)" : "var(--gold)",
          border: isUser ? "none" : "1px solid var(--border)",
        }}
      >
        {isUser ? "我" : <Sparkles size={13} />}
      </div>

      {/* 内容 */}
      <div
        className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
        style={{
          background: isUser ? "var(--gold)" : "var(--bg-card)",
          color: isUser ? "var(--bg-curtain)" : "var(--text-primary)",
          borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
          border: isUser ? "none" : "1px solid var(--border)",
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.content}
        {msg.streaming && (
          <span className="inline-flex gap-0.5 ml-1 align-middle">
            {[0,1,2].map(i => (
              <motion.span key={i} className="inline-block w-1 h-1 rounded-full"
                style={{ background: "var(--text-muted)" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── CreativeAssistantPanel ───────────────────────────────────
export function CreativeAssistantPanel() {
  const project       = useProjectStore((s) => s.project);
  const addLog        = useUIStore((s) => s.addLog);
  const useMock       = useSettingsStore((s) => s.useMock);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // 构建系统 prompt（注入项目上下文）
  const buildSystemPrompt = useCallback(() => {
    const base = "你是一位资深音乐剧创作顾问，擅长大纲构建、剧情调试与人物塑造。请用中文回答，语言简洁有力，结合具体场景和台词给出可操作的建议。";
    if (!project) return base;
    return `${base}\n\n当前项目：《${project.title}》\n简介：${project.synopsis ?? "暂无"}\n共 ${project.timelineEvents?.length ?? 0} 个场景节点。`;
  }, [project]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    addLog("创作助手思考中...");

    const assistantId = `a_${Date.now()}`;

    if (useMock) {
      // Mock 流式模拟
      const reply = getMockReply(text);
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", streaming: true }]);
      let displayed = "";
      for (let i = 0; i < reply.length; i++) {
        displayed += reply[i];
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: displayed } : m));
        await new Promise((r) => setTimeout(r, 18));
      }
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m));
    } else {
      // LLM 真实流式
      try {
        const adapter = getAdapter();
        const history = messages
          .slice(-10)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        const allMessages = [
          { role: "system" as const, content: NO_MARKDOWN_SYSTEM + "\n\n" + buildSystemPrompt() },
          ...history,
          { role: "user" as const, content: text.trim() },
        ];
        setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", streaming: true }]);
        let raw = "";
        for await (const chunk of adapter.stream(allMessages)) {
          raw += chunk;
          const cleaned = stripMarkdown(raw);
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: cleaned } : m));
        }
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m));
      } catch (err) {
        addLog(`创作助手调用失败：${String(err)}`);
        setMessages((prev) => prev.map((m) =>
          m.id === assistantId ? { ...m, content: "调用失败，请检查 LLM 设置后重试。", streaming: false } : m
        ));
      }
    }

    setIsLoading(false);
    addLog("创作助手回复完毕");
  }, [isLoading, useMock, messages, addLog, buildSystemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = () => setMessages([]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-panel)" }}>

      {/* 顶部标题 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <Sparkles size={15} style={{ color: "var(--gold)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--gold)", fontFamily: '"Playfair Display", serif' }}>
            创作助手
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded border"
            style={{ borderColor: useMock ? "var(--border)" : "var(--color-confirm)", color: useMock ? "var(--text-muted)" : "var(--color-confirm)" }}>
            {useMock ? "Mock" : "LLM"}
          </span>
          {messages.length > 0 && (
            <button onClick={handleClear} className="p-1 rounded opacity-40 hover:opacity-80 transition-opacity" title="清空对话">
              <RotateCcw size={13} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            /* 空状态：项目介绍 + 快捷入口 */
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-6 h-full items-center justify-center py-8">
              <div className="text-center space-y-2">
                <p className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: '"Playfair Display", serif' }}>
                  {project ? `《${project.title}》` : "创作助手"}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)", maxWidth: 220 }}>
                  在这里与 AI 讨论大纲、调试剧情、塑造人物
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                {QUICK_PROMPTS.map((qp) => (
                  <button key={qp.label}
                    onClick={() => sendMessage(qp.prompt)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors"
                    style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = qp.color)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <qp.icon size={15} style={{ color: qp.color, flexShrink: 0 }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{qp.label}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{qp.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
        </AnimatePresence>
      </div>

      {/* 输入栏 */}
      <div className="shrink-0 border-t p-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-end gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的创作问题… (Enter 发送)"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
            style={{
              color: "var(--text-primary)",
              minHeight: "1.5rem",
              maxHeight: "7rem",
              overflowY: "auto",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 112) + "px";
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: input.trim() && !isLoading ? "var(--gold)" : "var(--border)",
              color: input.trim() && !isLoading ? "var(--bg-curtain)" : "var(--text-muted)",
            }}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: "var(--text-muted)" }}>
          Shift+Enter 换行 · Enter 发送
        </p>
      </div>
    </div>
  );
}
