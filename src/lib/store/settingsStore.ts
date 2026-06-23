import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LLMProvider {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  adapter: "openai" | "anthropic" | "google";
}

export const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    adapter: "openai",
  },
  {
    id: "glm",
    name: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
    adapter: "openai",
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    adapter: "openai",
  },
  {
    id: "claude",
    name: "Claude",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-sonnet-4-20250514",
    adapter: "anthropic",
  },
  {
    id: "gemini",
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    defaultModel: "gemini-2.0-flash",
    adapter: "google",
  },
  {
    id: "mimo",
    name: "小米 MiMo",
    baseUrl: "https://api.mimo.ai/v1",
    defaultModel: "mimo-chat",
    adapter: "openai",
  },
  {
    id: "custom",
    name: "自定义",
    baseUrl: "",
    defaultModel: "",
    adapter: "openai",
  },
];

interface SettingsState {
  providerId: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** true = Mock 演示模式，false = 真实 LLM 模式 */
  useMock: boolean;
  streamingEnabled: boolean;

  setProviderId: (id: string) => void;
  setApiKey: (key: string) => void;
  setBaseUrl: (url: string) => void;
  setModel: (model: string) => void;
  setUseMock: (v: boolean) => void;
  setStreamingEnabled: (v: boolean) => void;

  /** 兼容旧代码：loadFromStorage 现在是 no-op，persist 自动处理 */
  loadFromStorage: () => void;
  saveToStorage: () => void;

  getCurrentProvider: () => LLMProvider | undefined;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      providerId: "deepseek",
      apiKey: "",
      baseUrl: "",
      model: "",
      useMock: true,
      streamingEnabled: true,

      setProviderId: (id) => {
        const provider = LLM_PROVIDERS.find((p) => p.id === id);
        set({
          providerId: id,
          baseUrl: provider?.baseUrl || "",
          model: provider?.defaultModel || "",
        });
      },
      setApiKey: (key) => set({ apiKey: key }),
      setBaseUrl: (url) => set({ baseUrl: url }),
      setModel: (model) => set({ model }),
      setUseMock: (v) => set({ useMock: v }),
      setStreamingEnabled: (v) => set({ streamingEnabled: v }),

      // persist 自动处理，这里保留兼容接口
      loadFromStorage: () => {},
      saveToStorage: () => {},

      getCurrentProvider: () => {
        return LLM_PROVIDERS.find((p) => p.id === get().providerId);
      },
    }),
    {
      name: "musical-copilot-settings",
      // API Key 敏感，persist 到 localStorage 后不在 URL 中暴露
      partialize: (state) => ({
        providerId: state.providerId,
        apiKey: state.apiKey,
        baseUrl: state.baseUrl,
        model: state.model,
        useMock: state.useMock,
        streamingEnabled: state.streamingEnabled,
      }),
    }
  )
);
