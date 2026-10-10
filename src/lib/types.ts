export interface FormData {
  resourceType: string;
  customType: string;
  keyword: string;
  targetAudience: string;
  style: string;
  priceRange: string;
  guidanceLevel: string;
  count: number;
  platform: string;
  mode: 'original' | 'rewrite' | 'multi-platform';
  originalNote: string;
  rewriteOriginal: string;
  rewritePlatforms: string[];
  rewriteFocus: string;
  aiDensity: number;
  wordCount: number;
}

export interface RiskItem {
  snippet: string;
  suggestion: string;
}

export interface ComplianceCheck {
  passed: boolean;
  risks: RiskItem[];
}

export interface QualityScores {
  title_attraction: number;
  conversion_power: number;
  completeness: number;
  safety: number;
}

export interface BenchmarkAnalysis {
  title_structure: string;
  hook_type: string;
  body_framework: string;
  highlights: string;
}

export interface GeneratedNote {
  angle: string;
  titles: string[];
  body: string;
  tags: string[];
  cover_prompt: string;
  compliance_check: ComplianceCheck;
  suggested_time?: string;
  scores?: QualityScores;
  benchmark_analysis?: BenchmarkAnalysis;
}

export interface GenerateRequest {
  formData: FormData;
}

export const RESOURCE_TYPES = [
  { value: '育儿资料', label: '育儿资料' },
  { value: '考公考研', label: '考公考研' },
  { value: '职场模板', label: '职场模板' },
  { value: 'PPT模板', label: 'PPT模板' },
  { value: '认知成长', label: '认知成长' },
  { value: '教师课件教案', label: '教师课件教案' },
  { value: '其他', label: '其他' },
] as const;

export const PLATFORM_OPTIONS = [
  { value: 'xiaohongshu', label: '小红书', emoji: '📕' },
  { value: 'douyin', label: '抖音', emoji: '🎵' },
  { value: 'wechat', label: '公众号', emoji: '💬' },
  { value: 'bilibili', label: 'B站', emoji: '📺' },
  { value: 'kuaishou', label: '快手', emoji: '⚡' },
  { value: 'shipinhao', label: '视频号', emoji: '🎬' },
] as const;

export interface ContentExtraction {
  core_viewpoint: string;
  key_facts: string[];
  methodology: string;
  target_audience: string;
  emotional_tone: string;
  highlights: string[];
}

export interface PlatformRewriteResult {
  platform: string;
  titles: string[];
  body: string;
  tags: string[];
  cover_prompt: string;
  extra?: Record<string, string>;
  scores?: QualityScores;
  compliance_check?: ComplianceCheck;
}

export interface MultiPlatformResult {
  extraction: ContentExtraction;
  platforms: PlatformRewriteResult[];
}

export const STYLE_OPTIONS = [
  { value: '智能混合', label: '智能混合', desc: '每篇不同角度', icon: 'Shuffle', isDefault: true },
  { value: '种草分享', label: '种草分享', desc: '真实体验感', icon: 'Heart', isDefault: false },
  { value: '干货教程', label: '干货教程', desc: '实用方法论', icon: 'BookOpen', isDefault: false },
  { value: '痛点共鸣', label: '痛点共鸣', desc: '戳中用户需求', icon: 'Zap', isDefault: false },
  { value: '对比测评', label: '对比测评', desc: '横向对比分析', icon: 'Scale', isDefault: false },
  { value: '真人日记感', label: '真人日记感', desc: '口语化随手记', icon: 'PenLine', isDefault: false },
] as const;

export const GUIDANCE_OPTIONS = [
  { value: '强引导', label: '强引导', desc: '评论扣1、私信领取', risk: '风险较高', isDefault: false },
  { value: '轻度引导', label: '轻度引导', desc: '需要的宝子可以后台戳我', risk: '', isDefault: true },
  { value: '关闭引导', label: '关闭引导', desc: '纯干货笔记，不带获客话术', risk: '', isDefault: false },
] as const;

export const COUNT_OPTIONS = [
  { value: 3, label: '3篇' },
  { value: 5, label: '5篇' },
  { value: 10, label: '10篇' },
] as const;

export const ANGLE_COLORS = [
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-lime-100 text-lime-700',
  'bg-fuchsia-100 text-fuchsia-700',
];

export const POSTING_TIME_SUGGESTIONS: Record<string, string[]> = {
  xiaohongshu: ['7:00-9:00 (早通勤)', '12:00-13:30 (午休)', '18:00-20:00 (晚通勤+晚餐)', '21:00-23:00 (睡前黄金档)'],
  douyin: ['7:00-8:30 (早通勤)', '11:30-13:00 (午休)', '17:30-19:00 (晚通勤)', '20:00-22:00 (晚间黄金档)'],
  wechat: ['7:00-8:30 (早通勤)', '11:30-12:30 (午休)', '20:00-22:00 (晚间阅读)', '22:00-23:00 (睡前深度阅读)'],
  bilibili: ['10:00-12:00 (上午)', '14:00-16:00 (下午)', '18:00-20:00 (晚通勤)', '21:00-23:00 (晚间黄金档)'],
  kuaishou: ['7:00-9:00 (早通勤)', '12:00-13:00 (午休)', '18:00-20:00 (晚间)', '21:00-23:00 (睡前)'],
  shipinhao: ['7:30-9:00 (早间)', '12:00-13:30 (午休)', '19:00-21:00 (晚间)', '21:00-22:30 (睡前)'],
};

export interface DraftImage {
  skill?: string;
  path?: string;
  aspect?: string;
}

export interface DraftCompliance {
  passed: boolean;
  risks: string[];
  checkedBy?: string;
}

export interface DraftScores {
  hook?: number;
  evidence?: number;
  platformFit?: number;
  by?: string;
}

/** L2 产出稿件契约,对齐 docs/contracts/draft.schema.json */
export interface Draft {
  topicId: string;
  platform: string;
  titles?: string[];
  body: string;
  tags?: string[];
  coverPrompt?: string;
  images?: DraftImage[];
  compliance?: DraftCompliance;
  scores?: DraftScores;
}

export type DraftStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'published';

export interface DraftRecord extends Draft {
  id: number;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationRecord {
  id: number;
  draftId: number | null;
  platform: string;
  status: string;
  result?: Record<string, unknown>;
  publishedAt?: string | null;
  createdAt: string;
}

const HISTORY_KEY = 'znote_history';
const MAX_HISTORY = 20;

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  keyword: string;
  resourceType: string;
  count: number;
  formData: FormData;
}

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveToHistory(formData: FormData, notesCount: number): void {
  const type = formData.resourceType === '其他' ? formData.customType : formData.resourceType;
  const item: HistoryItem = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    title: `${type} - ${formData.keyword}`,
    keyword: formData.keyword,
    resourceType: type,
    count: notesCount,
    formData,
  };
  const list = getHistory();
  list.unshift(item);
  if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function removeHistoryItem(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getHistory().filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {}
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}
