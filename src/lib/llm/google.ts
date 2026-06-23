/**
 * Google Gemini 适配器
 * 使用 /v1beta/models/{model}:streamGenerateContent 接口
 */
import type { LLMAdapter, LLMMessage, LLMGenerateOptions, LLMStream } from "./types";
import { LLMError } from "./types";

interface GoogleConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function createGoogleAdapter(config: GoogleConfig): LLMAdapter {
  const { apiKey, baseUrl, model } = config;

  async function* streamImpl(
    messages: LLMMessage[],
    opts?: LLMGenerateOptions
  ): LLMStream {
    const m = opts?.model ?? model;
    const url = `${baseUrl.replace(/\/$/, "")}/v1beta/models/${m}:streamGenerateContent?key=${apiKey}&alt=sse`;

    // Gemini 格式转换
    const systemMsg = messages.find((msg) => msg.role === "system")?.content;
    const contents = messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: opts?.temperature ?? 0.7,
        maxOutputTokens: opts?.maxTokens ?? 2048,
      },
    };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg }] };
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new LLMError("API_ERROR", `Google API Error ${resp.status}: ${err}`);
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
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
              if (text) yield text;
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
