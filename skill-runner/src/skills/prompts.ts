export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputError';
  }
}

/** 从 inputs 归一化出 prompt 列表：支持 inputs.prompt(string) 或 inputs.prompts(string[])。 */
export function collectPrompts(inputs: Record<string, unknown>): string[] {
  const single = inputs.prompt;
  const list = inputs.prompts;
  const prompts: string[] = [];
  if (typeof single === 'string' && single.trim()) prompts.push(single.trim());
  if (Array.isArray(list)) {
    for (const item of list) {
      if (typeof item !== 'string' || !item.trim()) {
        throw new InputError('inputs.prompts must be an array of non-empty strings');
      }
      prompts.push(item.trim());
    }
  }
  if (prompts.length === 0) {
    throw new InputError('inputs.prompt (string) or inputs.prompts (string[]) is required');
  }
  return prompts;
}

export function readString(inputs: Record<string, unknown>, key: string): string | undefined {
  const value = inputs[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new InputError(`inputs.${key} must be a string`);
  return value;
}

/** 受限并发映射（保持输入顺序）。 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const workers = Array.from({ length: limit }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}
