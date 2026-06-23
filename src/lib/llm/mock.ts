import type { LLMAdapter, LLMMessage, LLMGenerateOptions, LLMStream } from "./types";

// Mock 文本（demo 固定输出）
const MOCK_SCRIPT = `第一幕第二场：排练室外走廊
（灯光微暗，走廊尽头隐约可见旧礼堂的封锁线。林夏从排练室走出，看到沈澈站在走廊拐角。）
林夏
你刚才为什么一听到旧礼堂就不说话？
沈澈
有些地方不适合好奇。
周遥
林夏，别问了，许老师会不高兴。
林夏
三年前到底发生了什么？
沈澈
你只需要知道，那里会毁掉想站上舞台的人。
（短促的音乐动机响起，林夏停在原地。）`;

const MOCK_JSON_WORLDBOOK = `[
  {"id":"wb_01","title":"音乐学院竞争环境","type":"background","summary":"顶尖音乐学院内部激烈的竞争氛围"},
  {"id":"wb_05","title":"第一幕结束前林夏不能知道事故与母亲有关","type":"hard_constraint","constraintLevel":"hard","summary":"硬约束：信息管控"}
]`;

async function* createMockStream(text: string, delayMs = 30): LLMStream {
  for (const char of text) {
    await new Promise((r) => setTimeout(r, delayMs));
    yield char;
  }
}

export const mockAdapter: LLMAdapter = {
  async *stream(messages: LLMMessage[]): LLMStream {
    const lastMsg = messages[messages.length - 1]?.content ?? "";
    const isScript =
      lastMsg.includes("剧本") || lastMsg.includes("台词") || lastMsg.includes("场景");

    const text = isScript ? MOCK_SCRIPT : `好的，我已理解您的要求。\n${lastMsg.slice(0, 40)}...（Mock 模式）`;
    yield* createMockStream(text, 25);
  },

  async generate(messages: LLMMessage[]): Promise<string> {
    let result = "";
    for await (const chunk of this.stream(messages)) {
      result += chunk;
    }
    return result;
  },

  async generateJSON<T>(messages: LLMMessage[]): Promise<T> {
    const lastMsg = messages[messages.length - 1]?.content ?? "";
    // 简单判断返回哪种 mock JSON
    if (lastMsg.includes("世界书") || lastMsg.includes("worldbook")) {
      return JSON.parse(MOCK_JSON_WORLDBOOK) as T;
    }
    return [] as unknown as T;
  },
};
