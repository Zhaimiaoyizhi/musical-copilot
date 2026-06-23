/**
 * 清洗 LLM 输出中的 Markdown 特殊格式：
 * - 去除 ```code fences```
 * - 去除 **bold** / *italic* / _italic_ / ~~strike~~
 * - 去除 # 标题符号
 * - 去除 > 引用前缀
 * - 去除 --- 分隔线
 * - 去除 [link](url) 只保留文字
 * - 保留换行和中文标点
 */
export function stripMarkdown(text: string): string {
  return text
    // 代码块
    .replace(/```[\s\S]*?```/g, (m) =>
      m.replace(/```(?:\w+)?\n?/, "").replace(/\n?```$/, "").trim()
    )
    // 行内代码
    .replace(/`([^`]+)`/g, "$1")
    // 粗体（** 或 __）
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    // 斜体（* 或 _）
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // 删除线
    .replace(/~~([^~]+)~~/g, "$1")
    // 标题
    .replace(/^#{1,6}\s+/gm, "")
    // 引用
    .replace(/^>\s?/gm, "")
    // 分隔线
    .replace(/^---+$/gm, "")
    .replace(/^\*\*\*+$/gm, "")
    // 链接
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // 无序列表符号（保留内容）
    .replace(/^[\-\*\+]\s+/gm, "")
    // 有序列表（保留内容）
    .replace(/^\d+\.\s+/gm, "")
    // 多余空行压缩
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 为 LLM 请求添加"不输出 Markdown"的系统指令
 */
export const NO_MARKDOWN_SYSTEM = `你是专业的音乐剧剧本创作助手。
【重要格式要求】
- 只输出纯文本，不使用任何 Markdown 格式
- 不使用 **加粗**、*斜体*、# 标题、\`代码\`、> 引用等格式
- 不使用 --- 分隔线
- 用中文标点和换行来组织内容
- 角色名直接写，然后换行写台词，舞台动作用（）括号
`;
