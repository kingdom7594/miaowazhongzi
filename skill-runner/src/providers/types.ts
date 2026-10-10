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
}
