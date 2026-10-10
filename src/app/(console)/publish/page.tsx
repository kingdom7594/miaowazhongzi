import { StagePlaceholder } from '@/components/console/stage-placeholder';

export default function PublishPage() {
  return (
    <StagePlaceholder
      title="发布"
      milestone="M4"
      description="分发层(低优先):公众号原生 + 微博/X worker"
      items={[
        '小红书人工发布为主;公众号走原生 API。',
        '微博 / X 通过外置 worker(Chrome 类)发布,人工放行。',
        '发布记录写入 publications(draft_id / platform / status / result)。',
        '全流程 in_review 人工放行,不做无人值守自动发布。',
      ]}
    />
  );
}
