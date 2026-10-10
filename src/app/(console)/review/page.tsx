import { StagePlaceholder } from '@/components/console/stage-placeholder';

export default function ReviewPage() {
  return (
    <StagePlaceholder
      title="审核闸门"
      milestone="M5"
      description="合规闸门(规则 + LLM judge)+ 质量评分"
      items={[
        '规则命中(合规词库)+ 独立 LLM judge,双通道判定,命中处正文高亮。',
        '通过 / 打回 / 编辑后通过 / 批量放行;状态流转写回 drafts.status。',
        '质量评分:hook / evidence / platformFit,输出 draft.scores。',
        '<768px 折叠单列,按钮吸底(兼顾移动端)。',
      ]}
    />
  );
}
