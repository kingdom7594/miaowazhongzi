import { StagePlaceholder } from '@/components/console/stage-placeholder';

export default function VisualPage() {
  return (
    <StagePlaceholder
      title="视觉工位"
      milestone="M3"
      description="卡片图 / 封面 / 信息图 / PPT / 图解"
      items={[
        '通过本地 skill-runner 统一调用 baoyu(卡片/信息图/PPT/图解/封面)+ mondo,不移植模板(ADR-0002)。',
        'POST /render { skill, inputs, aspect } → 图片文件,记录路径与元数据。',
        '3:4 预览 + 多候选 + 风格模板;适配器离线时显示降级徽标。',
        '产出写入 drafts.images,供稿件库与发布引用。',
      ]}
    />
  );
}
