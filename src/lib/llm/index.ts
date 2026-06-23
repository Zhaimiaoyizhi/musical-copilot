/**
 * LLM 适配器工厂 — 根据 settingsStore 返回正确的适配器实例
 */
import type { LLMAdapter } from "./types";
import { mockAdapter } from "./mock";
import { createOpenAIAdapter } from "./openai";
import { createAnthropicAdapter } from "./anthropic";
import { createGoogleAdapter } from "./google";
import { useSettingsStore, LLM_PROVIDERS } from "@/lib/store/settingsStore";

export function getAdapter(): LLMAdapter {
  const state = useSettingsStore.getState();

  if (state.useMock || !state.apiKey) {
    return mockAdapter;
  }

  const provider = LLM_PROVIDERS.find((p) => p.id === state.providerId);
  const baseUrl = state.baseUrl || provider?.baseUrl || "";
  const model   = state.model   || provider?.defaultModel || "";

  switch (provider?.adapter) {
    case "anthropic":
      return createAnthropicAdapter({ apiKey: state.apiKey, baseUrl, model });
    case "google":
      return createGoogleAdapter({ apiKey: state.apiKey, baseUrl, model });
    case "openai":
    default:
      return createOpenAIAdapter({ apiKey: state.apiKey, baseUrl, model });
  }
}

export { mockAdapter };
export type { LLMAdapter, LLMMessage, LLMGenerateOptions, LLMStream } from "./types";
