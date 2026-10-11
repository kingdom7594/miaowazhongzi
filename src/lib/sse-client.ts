/**
 * 客户端 SSE 消费工具(B2/F-11):对齐服务端 `toSSEResponse` 的 `data: {json}\n\n` / `data: [DONE]` 协议。
 * title-boost / infographic 的流式端点都把 LLM 文本以 `{ content }` 分片下发。
 */

export interface SseHandlers {
  /** 每收到一个 `{content}` 分片回调(用于进度展示)。 */
  onChunk?: (chunk: string) => void;
}

/** 消费 SSE 响应,返回拼接后的完整文本(用于 HTML 信息图)。 */
export async function readSseText(res: Response, handlers: SseHandlers = {}): Promise<string> {
  if (!res.body) throw new Error('响应无流式内容');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return text;
      try {
        const json = JSON.parse(payload) as { content?: string; error?: string };
        if (json.error) throw new Error(json.error);
        if (typeof json.content === 'string') {
          text += json.content;
          handlers.onChunk?.(json.content);
        }
      } catch (err) {
        if (err instanceof Error && err.message && !(err instanceof SyntaxError)) throw err;
      }
    }
  }
  return text;
}

/** 消费 SSE 响应并把拼接后的完整文本按 JSON 解析(用于 title-boost)。 */
export async function readSseJson<T>(res: Response, handlers: SseHandlers = {}): Promise<T> {
  const text = await readSseText(res, handlers);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const slice = start !== -1 && end > start ? text.slice(start, end + 1) : text;
  return JSON.parse(slice) as T;
}
