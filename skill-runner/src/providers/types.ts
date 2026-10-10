export interface GenerateImageInput {
  /** 最终 prompt（已由上层/skill 组装完成） */
  prompt: string;
  /** 显式像素尺寸，如 "1024x1024"。与 aspectRatio 二选一，size 优先。 */
  size?: string;
  /** 宽高比，如 "3:4"；无 size 时由 provider 映射到合法尺寸。 */
  aspectRatio?: string;
  /** 覆盖默认模型 */
  model?: string;
  /** 产物文件名提示（不含目录） */
  filenameHint?: string;
  /**
   * 本次 render 的会话 id：用于在 provider 层做「单次 render 累计张数」成本闸。
   * 直连路径与 agent(经 shim)路径共用同一 id 计数。
   */
  renderId?: string;
}

export interface GeneratedImage {
  localPath: string;
  width: number;
  height: number;
  /** 中转站返回的签名 URL（仅元数据，不应对外暴露） */
  url?: string;
  billing?: unknown;
  provider: string;
  model: string;
}

export interface ImageProvider {
  readonly name: string;
  generate(input: GenerateImageInput, outputDir: string): Promise<GeneratedImage>;
  /** 结束一次 render 会话，释放其计数（实现可选）。 */
  clearRender?(renderId: string): void;
}
