"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useSettingsStore, LLM_PROVIDERS } from "@/lib/store/settingsStore";
import { getAdapter } from "@/lib/llm";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const store = useSettingsStore();
  const [showKey,   setShowKey]   = useState(false);
  const [testing,   setTesting]   = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [testMsg,   setTestMsg]   = useState("");

  // 从 localStorage 加载
  useEffect(() => {
    store.loadFromStorage();
  }, []); // eslint-disable-line

  const currentProvider = store.getCurrentProvider();

  const handleSave = () => {
    store.saveToStorage();
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!store.apiKey && !store.useMock) {
      setTestResult("fail");
      setTestMsg("请先填写 API Key");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const adapter = getAdapter();
      const text = await adapter.generate([
        { role: "user", content: "请回复「连接成功」四个字" },
      ], { maxTokens: 20 });
      setTestResult("ok");
      setTestMsg(`✓ ${text.trim()}`);
    } catch (err) {
      setTestResult("fail");
      setTestMsg(String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-curtain)", color: "var(--text-primary)" }}
    >
      {/* 顶部栏 */}
      <header
        className="flex items-center gap-3 px-6 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
      >
        <Link
          href="/studio"
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={15} />
          返回 Studio
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <h1
          className="text-sm font-semibold"
          style={{ color: "var(--gold)", fontFamily: '"Playfair Display", serif' }}
        >
          LLM 设置
        </h1>
      </header>

      <div className="flex-1 flex justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl space-y-6"
        >
          {/* Mock / LLM 切换 */}
          <section className="rounded-xl p-5 border space-y-4"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--gold)" }}>生成模式</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>使用 Mock 模式</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  不需要 API Key，使用预录 Demo 内容（适合展示）
                </p>
              </div>
              <button
                onClick={() => store.setUseMock(!store.useMock)}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                style={{ background: store.useMock ? "var(--gold)" : "var(--border)" }}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform"
                  style={{ transform: store.useMock ? "translateX(20px)" : "translateX(0)" }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>流式输出</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  逐字显示生成内容（打字机效果）
                </p>
              </div>
              <button
                onClick={() => store.setStreamingEnabled(!store.streamingEnabled)}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                style={{ background: store.streamingEnabled ? "var(--gold)" : "var(--border)" }}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform"
                  style={{ transform: store.streamingEnabled ? "translateX(20px)" : "translateX(0)" }}
                />
              </button>
            </div>
          </section>

          {/* LLM 提供商 */}
          {!store.useMock && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-xl p-5 border space-y-4 overflow-hidden"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--gold)" }}>LLM 提供商</h2>

              {/* 提供商选择 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  提供商
                </label>
                <select
                  value={store.providerId}
                  onChange={(e) => store.setProviderId(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-curtain)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {LLM_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {currentProvider && (
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                    默认端点：{currentProvider.baseUrl || "（请填写 Base URL）"}
                  </p>
                )}
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={store.apiKey}
                    onChange={(e) => store.setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none pr-10"
                    style={{
                      background: "var(--bg-curtain)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      fontFamily: "monospace",
                    }}
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  API Key 仅保存在本地浏览器，不会上传至任何服务器。
                </p>
              </div>

              {/* 自定义 Base URL */}
              {store.providerId === "custom" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    自定义 Base URL
                  </label>
                  <input
                    type="text"
                    value={store.baseUrl}
                    onChange={(e) => store.setBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-curtain)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              )}

              {/* 模型 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  模型名称
                </label>
                <input
                  type="text"
                  value={store.model}
                  onChange={(e) => store.setModel(e.target.value)}
                  placeholder={currentProvider?.defaultModel ?? "模型名称"}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-curtain)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              {/* 测试连接 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: "var(--bg-curtain)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    opacity: testing ? 0.7 : 1,
                  }}
                >
                  {testing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : testResult === "ok" ? (
                    <CheckCircle size={14} style={{ color: "var(--color-confirm)" }} />
                  ) : testResult === "fail" ? (
                    <XCircle size={14} style={{ color: "var(--color-conflict)" }} />
                  ) : null}
                  测试连接
                </button>

                {testMsg && (
                  <span
                    className="text-xs"
                    style={{ color: testResult === "ok" ? "var(--color-confirm)" : "var(--color-conflict)" }}
                  >
                    {testMsg}
                  </span>
                )}
              </div>
            </motion.section>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: "var(--gold)", color: "var(--bg-curtain)" }}
            >
              保存设置
            </button>
            <Link
              href="/studio"
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-all"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              取消
            </Link>
          </div>

          {/* 提供商快速参考 */}
          <section className="rounded-xl p-5 border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
              支持的提供商
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {LLM_PROVIDERS.filter((p) => p.id !== "custom").map((p) => (
                <button
                  key={p.id}
                  onClick={() => { store.setProviderId(p.id); store.setUseMock(false); }}
                  className="text-left px-4 py-3 rounded-xl text-sm transition-all"
                  style={{
                    background: store.providerId === p.id ? "var(--gold)" + "20" : "var(--bg-curtain)",
                    border: `1.5px solid ${store.providerId === p.id ? "var(--gold-dim)" : "var(--border)"}`,
                    color: store.providerId === p.id ? "var(--gold)" : "var(--text-secondary)",
                  }}
                >
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className="text-xs mt-1 opacity-70">{p.defaultModel}</p>
                </button>
              ))}
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
