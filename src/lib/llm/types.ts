// LLM 适配器统一接口

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/** 流式生成器：每次 yield 一个增量文本 chunk */
export type LLMStream = AsyncGenerator<string, void, unknown>;

export interface LLMAdapter {
  /** 流式生成文本 */
  stream(messages: LLMMessage[], options?: LLMGenerateOptions): LLMStream;
  /** 一次性生成完整文本（内部可复用 stream） */
  generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string>;
  /** 生成结构化 JSON（带 JSON.parse 兜底） */
  generateJSON<T>(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<T>;
}

export class LLMError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "LLMError";
  }
}
