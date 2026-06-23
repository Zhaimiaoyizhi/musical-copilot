"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  PlayCircle, Settings2, CheckCircle, X, Eye, EyeOff,
  Sparkles, Music2, Users, MapPin, Zap, Wand2
} from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { useSettingsStore, LLM_PROVIDERS } from "@/lib/store/settingsStore";
import { useProjectStore } from "@/lib/store/projectStore";
import { getAdapter } from "@/lib/llm";

const DEMO_STORY = `故事发生在一所竞争激烈的现代音乐学院。主角林夏想争取毕业演出主演名额，但竞争者沈澈掌握着三年前旧礼堂事故的线索，而这场事故与林夏母亲有关。
第一幕结束前，林夏不能知道事故与母亲有关。`;

const FEATURES = [
  { icon: MapPin,   color: "var(--track-event)",     label: "世界书",    desc: "故事背景、规则、硬约束" },
  { icon: Users,    color: "var(--track-character)",  label: "角色卡",    desc: "性格、欲望、语言风格" },
  { icon: Sparkles, color: "var(--track-scene)",      label: "场景卡",    desc: "戏剧目标、冲突、节拍" },
  { icon: Music2,   color: "var(--track-music)",      label: "乐谱时间轴", desc: "四轨道联动可视化" },
  { icon: Zap,      color: "var(--gold)",             label: "一致性检查", desc: "硬约束冲突红线提示" },
];

// ─── 首页内嵌 API 配置弹窗 ────────────────────────────────────
function ApiConfigModal({ onClose }: { onClose: () => void }) {
  const store = useSettingsStore();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [testMsg, setTestMsg] = useState("");

  const handleTest = async () => {
    if (!store.apiKey) { setTestResult("fail"); setTestMsg("请先填写 API Key"); return; }
    setTesting(true); setTestResult(null);
    try {
      const text = await getAdapter().generate([{ role: "user", content: "请回复「连接成功」四个字" }], { maxTokens: 20 });
      setTestResult("ok"); setTestMsg(`✓ ${text.trim()}`);
    } catch (err) {
      setTestResult("fail"); setTestMsg(String(err).slice(0, 80));
    } finally { setTesting(false); }
  };

  const currentProvider = store.getCurrentProvider();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border p-6 space-y-5 overflow-y-auto max-h-[90vh]"
        style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--gold)" }}>LLM 配置</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>配置后使用真实 AI，或跳过使用演示模式</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--bg-card)] transition-colors" style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        {/* 提供商快速选择 */}
        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>选择提供商</label>
          <div className="grid grid-cols-3 gap-2">
            {LLM_PROVIDERS.filter(p => p.id !== "custom").map((p) => (
              <button
                key={p.id}
                onClick={() => { store.setProviderId(p.id); store.setUseMock(false); }}
                className="text-left px-3 py-2.5 rounded-xl border transition-all"
                style={{
                  background: store.providerId === p.id ? "var(--gold)20" : "var(--bg-card)",
                  borderColor: store.providerId === p.id ? "var(--gold-dim)" : "var(--border)",
                  color: store.providerId === p.id ? "var(--gold)" : "var(--text-secondary)",
                }}
              >
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-[10px] mt-0.5 opacity-60 truncate">{p.defaultModel}</p>
              </button>
            ))}
            {/* 自定义 */}
            <button
              onClick={() => { store.setProviderId("custom"); store.setUseMock(false); }}
              className="text-left px-3 py-2.5 rounded-xl border transition-all"
              style={{
                background: store.providerId === "custom" ? "var(--gold)20" : "var(--bg-card)",
                borderColor: store.providerId === "custom" ? "var(--gold-dim)" : "var(--border)",
                color: store.providerId === "custom" ? "var(--gold)" : "var(--text-secondary)",
              }}
            >
              <p className="font-semibold text-sm">自定义</p>
              <p className="text-[10px] mt-0.5 opacity-60">自定义端点</p>
            </button>
          </div>
        </div>

        {/* Base URL（自定义时显示） */}
        {(store.providerId === "custom" || !currentProvider?.baseUrl) && (
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Base URL</label>
            <input
              type="text"
              value={store.baseUrl}
              onChange={(e) => store.setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "monospace" }}
            />
          </div>
        )}

        {/* API Key */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>API Key</label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={store.apiKey}
              onChange={(e) => store.setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none pr-10"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "monospace" }}
            />
            <button onClick={() => setShowKey(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80">
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>API Key 仅保存在本地浏览器，不上传任何服务器。</p>
        </div>

        {/* 模型名称 */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>模型名称</label>
          <input
            type="text"
            value={store.model}
            onChange={(e) => store.setModel(e.target.value)}
            placeholder={currentProvider?.defaultModel ?? "模型名称"}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "monospace" }}
          />
        </div>

        {/* 测试 + 操作 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testing || !store.apiKey}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            {testing ? <span className="animate-spin">⟳</span>
              : testResult === "ok" ? <CheckCircle size={14} style={{ color: "var(--color-confirm)" }} />
              : null}
            测试连接
          </button>
          {testMsg && (
            <span className="text-xs flex-1 truncate" style={{ color: testResult === "ok" ? "var(--color-confirm)" : "var(--color-conflict)" }}>
              {testMsg}
            </span>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "var(--gold)", color: "var(--bg-curtain)" }}
          >
            <CheckCircle size={14} className="inline mr-1.5" />
            保存并使用 LLM 模式
          </button>
          <button
            onClick={() => { store.setUseMock(true); onClose(); }}
            className="px-4 py-2.5 rounded-xl text-sm border transition-all"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            跳过
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const setAutoGenerate = useUIStore((s) => s.setAutoGenerate);
  const setIsDemoRunning = useUIStore((s) => s.setIsDemoRunning);
  const useMock = useSettingsStore((s) => s.useMock);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const project = useProjectStore((s) => s.project);

  const [storyInput,    setStoryInput]    = useState("");
  const [isLoading,     setIsLoading]     = useState(false);
  const [curtainOpen,   setCurtainOpen]   = useState(false);
  const [showApiModal,  setShowApiModal]  = useState(false);

  // 帷幕开场
  useEffect(() => {
    const t = setTimeout(() => setCurtainOpen(true), 300);
    return () => clearTimeout(t);
  }, []);

  // 进入 Mock 演示模式
  const handleDemo = useCallback(async () => {
    setIsLoading(true);
    sessionStorage.setItem("storyInput", DEMO_STORY);
    setAutoGenerate(true);
    await sleep(300);
    router.push("/studio");
  }, [router, setAutoGenerate]);

  // 自定义故事进入
  const handleCustom = useCallback(async () => {
    if (!storyInput.trim() || isLoading) return;
    setIsLoading(true);
    sessionStorage.setItem("storyInput", storyInput);
    await sleep(300);
    router.push("/studio");
  }, [storyInput, isLoading, router]);

  // 一键演示（自动执行 60s 脚本）
  const handleAutoDemo = useCallback(async () => {
    setIsLoading(true);
    sessionStorage.setItem("storyInput", DEMO_STORY);
    setAutoGenerate(true);
    setIsDemoRunning(true);  // 通知 Studio 页面启动演示脚本
    await sleep(300);
    router.push("/studio");
  }, [router, setAutoGenerate, setIsDemoRunning]);

  const hasApiKey = !!apiKey;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "var(--bg-curtain)" }}>

      {/* 帷幕动画 */}
      <AnimatePresence>
        {!curtainOpen && (
          <>
            <motion.div key="cl" initial={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
              className="fixed inset-0 z-50" style={{ right: "50%", background: "linear-gradient(to right, #2a0a1a, #8b2252)" }} />
            <motion.div key="cr" initial={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
              className="fixed inset-0 z-50" style={{ left: "50%", background: "linear-gradient(to left, #2a0a1a, #8b2252)" }} />
          </>
        )}
      </AnimatePresence>

      {/* API 配置弹窗 */}
      <AnimatePresence>
        {showApiModal && <ApiConfigModal onClose={() => setShowApiModal(false)} />}
      </AnimatePresence>

      {/* 舞台灯光背景 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
          style={{ background: "radial-gradient(ellipse at center top, rgba(201,169,110,0.12), transparent 65%)" }} />
        <div className="absolute inset-y-0 left-0 w-40"
          style={{ background: "linear-gradient(to right, rgba(139,34,82,0.18), transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-40"
          style={{ background: "linear-gradient(to left, rgba(139,34,82,0.18), transparent)" }} />
        <div className="absolute bottom-0 inset-x-0 h-32"
          style={{ background: "linear-gradient(to top, rgba(201,169,110,0.04), transparent)" }} />
      </div>

      {/* 主内容 */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={curtainOpen ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-2xl px-6 py-10 flex flex-col items-center gap-7"
      >
        {/* 顶部：API 配置入口 */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={curtainOpen ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.3 }}
          className="self-end flex items-center gap-2"
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {useMock ? "演示模式 (Mock)" : hasApiKey ? "✓ LLM 已配置" : "未配置 API"}
          </span>
          <button
            onClick={() => setShowApiModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all"
            style={{
              borderColor: hasApiKey && !useMock ? "var(--color-confirm)" : "var(--border)",
              color: hasApiKey && !useMock ? "var(--color-confirm)" : "var(--text-secondary)",
              background: "var(--bg-card)",
            }}
          >
            <Settings2 size={12} />
            {hasApiKey && !useMock ? "已配置 LLM" : "配置 API"}
          </button>
        </motion.div>

        {/* 标题 */}
        <div className="text-center space-y-2">
          <motion.h1
            className="text-6xl font-bold tracking-tight"
            style={{ color: "var(--gold)", fontFamily: '"Playfair Display", serif', textShadow: "0 0 40px rgba(201,169,110,0.25)" }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={curtainOpen ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.65, duration: 0.5 }}
          >
            Musical Studio
          </motion.h1>
          <motion.p className="text-xl tracking-widest"
            style={{ color: "var(--text-secondary)", fontFamily: '"Playfair Display", serif' }}
            initial={{ opacity: 0 }} animate={curtainOpen ? { opacity: 1 } : {}} transition={{ delay: 0.8 }}>
            剧本 Copilot
          </motion.p>
          <motion.p className="text-sm" style={{ color: "var(--text-muted)" }}
            initial={{ opacity: 0 }} animate={curtainOpen ? { opacity: 1 } : {}} transition={{ delay: 0.95 }}>
            AI 驱动的音乐剧剧本创作工作台 · 世界书 · 角色卡 · 乐谱时间轴
          </motion.p>
          {project && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={curtainOpen ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.0 }}
            >
              <button
                onClick={() => router.push("/studio")}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-medium transition-all hover:scale-105"
                style={{ borderColor: "var(--gold-dim)", color: "var(--gold)", background: "rgba(201,169,110,0.08)" }}
              >
                ↩ 返回编辑面板
                <span className="opacity-60 font-normal">— {project.title}</span>
              </button>
            </motion.div>
          )}
        </div>

        {/* 特性标签 */}
        <motion.div className="flex flex-wrap justify-center gap-2"
          initial={{ opacity: 0, y: 8 }} animate={curtainOpen ? { opacity: 1, y: 0 } : {}} transition={{ delay: 1.05 }}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.label}
              initial={{ opacity: 0, scale: 0.85 }} animate={curtainOpen ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 1.05 + i * 0.07 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs"
              style={{ borderColor: f.color + "55", color: f.color, background: f.color + "0d" }}>
              <f.icon size={11} />
              <span className="font-medium">{f.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* 分隔线 */}
        <motion.div className="w-full flex items-center gap-4"
          initial={{ opacity: 0 }} animate={curtainOpen ? { opacity: 1 } : {}} transition={{ delay: 1.2 }}>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, var(--gold-dim))" }} />
          <Sparkles size={14} style={{ color: "var(--gold-dim)" }} />
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, var(--gold-dim))" }} />
        </motion.div>

        {/* 演示按钮区 */}
        <motion.div className="w-full space-y-3"
          initial={{ opacity: 0, y: 8 }} animate={curtainOpen ? { opacity: 1, y: 0 } : {}} transition={{ delay: 1.3 }}>

          {/* 一键演示（最突出） */}
          <motion.button
            onClick={handleAutoDemo}
            disabled={isLoading}
            whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(201,169,110,0.4)" }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 rounded-xl font-bold text-base relative overflow-hidden group"
            style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--amber) 100%)", color: "var(--bg-curtain)", boxShadow: "0 0 20px rgba(201,169,110,0.25)" }}
          >
            <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)" }}
              initial={{ x: "-100%" }} whileHover={{ x: "100%" }} transition={{ duration: 0.6 }} />
            <Wand2 className="inline mr-2.5" size={20} />
            一键演示
            <span className="ml-2 text-sm opacity-80 font-normal">— 自动运行 60 秒完整演示</span>
          </motion.button>

          {/* 演示模式（手动） */}
          <motion.button
            onClick={handleDemo}
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3.5 rounded-xl text-sm font-semibold border relative overflow-hidden group"
            style={{ borderColor: "var(--gold-dim)", color: "var(--gold)", background: "var(--gold)08" }}
          >
            <PlayCircle className="inline mr-2" size={16} />
            演示模式（手动操作）
            <span className="ml-1.5 text-xs opacity-60">预设故事《灯暗之后》</span>
          </motion.button>
        </motion.div>

        {/* 分隔线 */}
        <motion.div className="w-full flex items-center gap-4"
          initial={{ opacity: 0 }} animate={curtainOpen ? { opacity: 1 } : {}} transition={{ delay: 1.45 }}>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>或输入自己的故事</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </motion.div>

        {/* 自定义故事 */}
        <motion.div className="w-full space-y-3"
          initial={{ opacity: 0, y: 8 }} animate={curtainOpen ? { opacity: 1, y: 0 } : {}} transition={{ delay: 1.5 }}>
          <textarea
            value={storyInput}
            onChange={(e) => setStoryInput(e.target.value)}
            placeholder={"输入你的音乐剧故事纲要...\n例如：故事背景、主要角色、核心冲突、风格偏好"}
            rows={4}
            className="w-full p-4 rounded-xl text-sm resize-none outline-none transition-all"
            style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              color: "var(--text-primary)", fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold-dim)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          <motion.button
            onClick={handleCustom}
            disabled={!storyInput.trim() || isLoading}
            whileHover={storyInput.trim() ? { scale: 1.01 } : {}}
            className="w-full py-3 rounded-xl text-sm font-semibold border transition-all"
            style={{
              background: storyInput.trim() ? "var(--bg-card)" : "transparent",
              border: "1.5px solid var(--border)",
              color: storyInput.trim() ? "var(--text-primary)" : "var(--text-muted)",
              cursor: storyInput.trim() ? "pointer" : "not-allowed",
            }}
          >
            开始创作
          </motion.button>
        </motion.div>

        <motion.p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}
          initial={{ opacity: 0 }} animate={curtainOpen ? { opacity: 1 } : {}} transition={{ delay: 1.65 }}>
          第一阶段 Demo &nbsp;·&nbsp; 支持 Mock / LLM 双模 &nbsp;·&nbsp; 导出 JSON / DOCX / PDF
        </motion.p>
      </motion.div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
