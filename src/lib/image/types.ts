export const IMAGE_SKILLS = [
  'baoyu-xhs-images',
  'baoyu-cover-image',
  'baoyu-infographic',
  'baoyu-slide-deck',
  'baoyu-diagram',
  'baoyu-image-gen',
  'mondo',
] as const;

export type ImageSkill = (typeof IMAGE_SKILLS)[number];

export interface RenderRequest {
  skill: ImageSkill;
  inputs: Record<string, unknown>;
  aspect?: string;
  outputDir?: string;
}

export interface RenderedImageFile {
  path: string;
  width: number;
  height: number;
}

export interface RenderResponse {
  skill: string;
  files: RenderedImageFile[];
  meta: Record<string, unknown>;
}

export interface ImageHealth {
  status: string;
  skills: string[];
  image: { configured: boolean; model: string; baseUrl: string; apiStyle: string };
}
