/**
 * Anthropic Claude 适配器
 * 使用 /v1/messages 接口（与 OpenAI 格式不同）
 */
import type { LLMAdapter, LLMMessage, LLMGenerateOptions, LLMStream } from "./types";
import { LLMError } from "./types";

interface AnthropicConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function createAnthropicAdapter(config: AnthropicConfig): LLMAdapter {
  const { apiKey, baseUrl, model } = config;

  async function* streamImpl(
    messages: LLMMessage[],
    opts?: LLMGenerateOptions
  ): LLMStream {
    const url = `${baseUrl.replace(/\/$/, "")}/v1/messages`;

    // Anthropic 格式：system 单独提取，messages 只包含 user/assistant
    const systemMsg = messages.find((m) => m.role === "system")?.content;
    const chatMsgs  = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model: opts?.model ?? model,
      messages: chatMsgs,
      max_tokens: opts?.maxTokens ?? 2048,
      stream: true,
    };
    if (systemMsg) body.system = systemMsg;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new LLMError("API_ERROR", `Anthropic API Error ${resp.status}: ${err}`);
    }

    const reader  = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              if (json.type === "content_block_delta") {
                const text = json.delta?.text ?? "";
                if (text) yield text;
              }
            } catch {
              // skip
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  return {
    stream: streamImpl,
    async generate(messages, opts) {
      let result = "";
      for await (const chunk of streamImpl(messages, opts)) result += chunk;
      return result;
    },
    async generateJSON<T>(messages: LLMMessage[], opts?: LLMGenerateOptions) {
      const text = await this.generate(messages, opts);
      const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
      return JSON.parse(cleaned) as T;
    },
  };
}
