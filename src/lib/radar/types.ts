export type PlatformId = 'xiaohongshu' | 'douyin' | 'wechat' | 'bilibili' | 'kuaishou' | 'shipinhao';

export interface EvidenceItem {
  claim: string;
  source?: string;
  url: string;
}

export interface TopicCompliance {
  risky?: string[];
  notes?: string;
}

export interface ContentTopic {
  id: string;
  headline: string;
  angle?: string;
  audience?: string;
  corePoints?: string[];
  evidence?: EvidenceItem[];
  hook?: string;
  platforms: PlatformId[];
  tags?: string[];
  sourceRef?: string;
  compliance?: TopicCompliance;
}

export interface ContentBrief {
  date: string;
  generator?: string;
  generated_at?: string;
  audience?: string;
  topics: ContentTopic[];
}

export interface ContentListEntry {
  date: string;
  topicCount: number;
  topics: Array<{ id: string; headline: string }>;
}
