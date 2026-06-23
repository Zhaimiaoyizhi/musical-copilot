/**
 * OpenAI 兼容适配器
 * 兼容：OpenAI / DeepSeek / 智谱 GLM / 小米 MiMo / Moonshot 等
 * 均使用 /chat/completions 接口，格式完全相同
 */
import type { LLMAdapter, LLMMessage, LLMGenerateOptions, LLMStream } from "./types";
import { LLMError } from "./types";

interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function createOpenAIAdapter(config: OpenAIConfig): LLMAdapter {
  const { apiKey, baseUrl, model } = config;

  async function* streamImpl(
    messages: LLMMessage[],
    opts?: LLMGenerateOptions
  ): LLMStream {
    const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: opts?.model ?? model,
        messages,
        temperature: opts?.temperature ?? 0.7,
        max_tokens: opts?.maxTokens ?? 2048,
        stream: true,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new LLMError("API_ERROR", `OpenAI API Error ${resp.status}: ${err}`);
    }

    if (!resp.body) throw new LLMError("NO_BODY", "Response body is null");

    const reader = resp.body.getReader();
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
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (delta) yield delta;
            } catch {
              // skip malformed lines
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
      for await (const chunk of streamImpl(messages, opts)) {
        result += chunk;
      }
      return result;
    },

    async generateJSON<T>(messages: LLMMessage[], opts?: LLMGenerateOptions) {
      const text = await this.generate(
        [...messages, { role: "user" as const, content: "请只输出 JSON，不要包含任何 Markdown 代码块。" }],
        opts
      );
      // 提取 JSON（去掉 markdown code fences）
      const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
      return JSON.parse(cleaned) as T;
    },
  };
}
