export interface PlatformSpec {
  id: string;
  name: string;
  emoji: string;
  wordCount: { min: number; max: number };
  temperature: number;
  titleLength: { min: number; max: number };
  titleStyle: string;
  bodyRules: string[];
  bannedWords: string[];
  outputStructure: string;
  extraFields?: string[];
}

export const PLATFORM_CONFIG: Record<string, PlatformSpec> = {
  xiaohongshu: {
    id: 'xiaohongshu', name: '小红书', emoji: '📕',
    wordCount: { min: 300, max: 500 }, temperature: 0.8,
    titleLength: { min: 15, max: 22 },
    titleStyle: '含emoji，数字+痛点+结果 或 反差+悬念',
    bodyRules: [
      '开头2行必须有钩子（如"谁懂啊""救命""我以前一直以为…直到"）',
      '正文分3-5小点，每点emoji开头，每点不超3行',
      '多换行，第一人称叙述',
      '每100字至少1个具体信息（数据/案例/细节）',
      '结尾引导收藏+开放式提问',
    ],
    bannedWords: ['绝了', '封神', '天花板', '必入', 'YYDS', '绝绝子', '首先', '其次', '最后', '非常', '超级', '特别'],
    outputStructure: '3个备选标题 + 正文(300-500字) + 5-8个标签(#关键词)',
  },
  douyin: {
    id: 'douyin', name: '抖音', emoji: '🎵',
    wordCount: { min: 180, max: 220 }, temperature: 0.8,
    titleLength: { min: 10, max: 15 },
    titleStyle: '悬念/冲突/反常识，15字内',
    bodyRules: [
      '前3秒必须有钩子（反常识结论/惊人数据/直接提问）',
      '口播文案完全口语化，每15秒一个信息点',
      '标注语气：[加快][放慢][强调][停顿]',
      '每段后标注[画面:XXX]',
      '结尾强互动引导',
    ],
    bannedWords: [],
    outputStructure: '3个备选标题 + 口播脚本(180-220字) + 3-5个话题标签',
    extraFields: ['hook'],
  },
  wechat: {
    id: 'wechat', name: '公众号', emoji: '💬',
    wordCount: { min: 1200, max: 1800 }, temperature: 0.6,
    titleLength: { min: 20, max: 25 },
    titleStyle: '观点+悬念 或 痛点+解决方案，20-25字',
    bodyRules: [
      '开头用故事/场景/反常识引入，第一段亮核心观点',
      '分3-5大章节，每章：观点+论据+小结',
      '逻辑严密，论证充分',
      '标注排版建议：加粗、引用块、分割线、配图建议',
      '结尾升华+金句收尾，引导"在看"+"分享"',
      '50字以内摘要',
    ],
    bannedWords: ['太口语化', '标题党', '网络热词'],
    outputStructure: '3个标题 + 摘要(50字内) + 正文(1200字以上) + 排版建议',
    extraFields: ['summary', 'layout_tips'],
  },
  bilibili: {
    id: 'bilibili', name: 'B站', emoji: '📺',
    wordCount: { min: 800, max: 1500 }, temperature: 0.7,
    titleLength: { min: 15, max: 20 },
    titleStyle: '悬念+数字 或 反差+结论，可玩梗，20字内',
    bodyRules: [
      '封面标题3-7字，短促有力',
      '前10秒钩子，可自然融入"一键三连"引导',
      '分3-5章节，每章小标题，逻辑递进，信息密度高',
      '标注[弹幕点]、[画面建议]、[停顿]',
      '结尾总结+引导三连关注+下期预告',
      '视频简介含时间轴',
    ],
    bannedWords: ['流水账', '太正经'],
    outputStructure: '3个视频标题 + 封面标题 + 正文(800-1500字) + 时间轴 + 3-5个话题标签',
    extraFields: ['cover_title', 'timeline'],
  },
  kuaishou: {
    id: 'kuaishou', name: '快手', emoji: '⚡',
    wordCount: { min: 120, max: 200 }, temperature: 0.85,
    titleLength: { min: 8, max: 15 },
    titleStyle: '直白口语+利益点，8-15字，接地气',
    bodyRules: [
      '前3秒用大白话抛出利益点或反常识结论',
      '口播以“老铁”“家人们”等社区语感开场（自然不堆砌）',
      '一段一个信息点，句子短，方便口播',
      '每段后标注[画面:XXX]',
      '结尾直接引导点赞+关注',
    ],
    bannedWords: [],
    outputStructure: '3个备选标题 + 口播脚本(120-200字) + 3-5个话题标签',
    extraFields: ['hook'],
  },
  shipinhao: {
    id: 'shipinhao', name: '视频号', emoji: '🎬',
    wordCount: { min: 200, max: 400 }, temperature: 0.7,
    titleLength: { min: 12, max: 20 },
    titleStyle: '正向价值+共鸣，12-20字，稳重可信',
    bodyRules: [
      '开头用生活场景/共鸣句引入，语气稳重真诚',
      '内容偏实用与正向价值，避免过度夸张营销',
      '分2-4点讲清楚，语句完整便于口播',
      '每段标注[画面:XXX]',
      '结尾引导点赞+转发给需要的朋友',
    ],
    bannedWords: [],
    outputStructure: '3个备选标题 + 口播文案(200-400字) + 3-5个话题标签',
    extraFields: ['hook'],
  },
};

export const REWRITE_FOCUS_OPTIONS = [
  { value: '保持原意', label: '保持原意', desc: '忠实原文，调整风格' },
  { value: '更口语化', label: '更口语化', desc: '轻松对话感' },
  { value: '更深度', label: '更深度', desc: '增加分析论证' },
] as const;

export function getPlatformSpec(platformId: string): PlatformSpec {
  return PLATFORM_CONFIG[platformId] || PLATFORM_CONFIG.xiaohongshu;
}

export function getAllPlatformIds(): string[] {
  return Object.keys(PLATFORM_CONFIG);
}
