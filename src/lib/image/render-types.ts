import type { DraftRenderSkill } from './render-draft';

/**
 * 视觉工位「出图类型」→ skill-runner 技能映射(B2/V1 · F-03)。
 * 5 类对齐 skill-runner `/health` 在线技能(`SKILL_NAMES`,见 skill-runner/src/skills/types.ts)。
 */
export interface RenderType {
  id: string;
  label: string;
  skill: DraftRenderSkill;
  /** 是否支持一次出多张(count>1)。 */
  multi: boolean;
  hint: string;
}

export const RENDER_TYPES: readonly RenderType[] = [
  { id: 'cards', label: '卡片', skill: 'baoyu-xhs-images', multi: true, hint: '小红书卡片图组 · 约 6 min' },
  { id: 'cover', label: '封面', skill: 'baoyu-cover-image', multi: false, hint: '单张封面 · 约 2.5 min' },
  { id: 'infographic', label: '信息图', skill: 'baoyu-infographic', multi: false, hint: '手绘信息图 · 约 3 min' },
  { id: 'slide', label: 'PPT', skill: 'baoyu-slide-deck', multi: true, hint: '演示文稿图组 · 约 4 min' },
  { id: 'diagram', label: '图解', skill: 'baoyu-diagram', multi: false, hint: '结构图解 SVG · 约 3 min' },
];

export function getRenderType(id: string): RenderType | undefined {
  return RENDER_TYPES.find((t) => t.id === id);
}

export function renderTypeBySkill(skill: string): RenderType | undefined {
  return RENDER_TYPES.find((t) => t.skill === skill);
}
